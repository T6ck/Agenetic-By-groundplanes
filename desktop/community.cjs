'use strict';

const fs = require('node:fs');
const path = require('node:path');
const site = 'https://groundplanes.com';
const signIn = site + '/signin?app=agenetic';
const signOut = site + '/signin?signout=1';
const guest = {signedIn: false, scope: 'guest', signIn, signOut};

function tokenSet(value) {
  if (!value || !['access_token', 'refresh_token'].every(key =>
    typeof value[key] === 'string' && /^[\x21-\x7e]{1,8192}$/.test(value[key]))) return null;
  const expires = Number(value.expires_at);
  if (!Number.isSafeInteger(expires) || expires <= 0) return null;
  return {access_token: value.access_token, refresh_token: value.refresh_token, expires_at: expires};
}

function callbackTokens(input) {
  if (typeof input !== 'string' || input.length > 24000) return null;
  try {
    const url = new URL(input);
    if (url.protocol !== 'agenetic:' || url.host !== 'auth' || url.pathname !== '/callback' ||
        url.username || url.password || url.search) return null;
    const params = new URLSearchParams(url.hash.slice(1));
    if (['access_token','refresh_token','expires_at'].some(key => params.getAll(key).length !== 1)) return null;
    return tokenSet(Object.fromEntries(params));
  } catch { return null; }
}

function makeCommunity({directory, storage, send = fetch, changed = () => {}}) {
  const file = path.join(directory, 'community-session.bin');
  let current, revision = 0, refreshing;

  function checkStorage() {
    if (!storage.isEncryptionAvailable() || (process.platform === 'linux' && storage.getSelectedStorageBackend?.() === 'basic_text')) {
      throw Error('Secure storage is unavailable. Unlock your system keychain and try again.');
    }
  }
  function read() {
    if (current !== undefined) return current;
    let bytes;
    try { bytes = fs.readFileSync(file); }
    catch (error) { if (error.code === 'ENOENT') return current = null; throw error; }
    checkStorage();
    const credentials = tokenSet(JSON.parse(storage.decryptString(bytes)));
    if (!credentials) throw Error('Sign out and sign in again to reconnect your community account.');
    return current = credentials;
  }
  function write(value) {
    checkStorage();
    const temp = file + '.tmp';
    try {
      fs.writeFileSync(temp, storage.encryptString(JSON.stringify(value)), {mode: 0o600});
      fs.renameSync(temp, file);
    } finally { fs.rmSync(temp, {force: true}); }
    current = value;
  }
  function logout() {
    fs.rmSync(file, {force: true});
    current = null;
    revision++;
    refreshing = null;
    changed();
  }
  function remote(endpoint, method, body, token) {
    const headers = {Accept: 'application/json', Origin: 'agenetic://app'};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = 'Bearer ' + token;
    return send(site + endpoint, {method, headers, body, redirect: 'error', signal: AbortSignal.timeout(15000)});
  }
  async function accept(value, confirm) {
    const start = revision;
    const response = await remote('/api/community/session','GET',undefined,value.access_token);
    const account = await response.json();
    if (!response.ok || !account.signedIn || !/^[a-f0-9]{64}$/.test(account.scope) || typeof account.email !== 'string' || !account.email) {
      throw Error(account.error || 'That sign-in link has expired. Sign in again.');
    }
    // The browser callback has no state parameter. Confirm the verified account
    // before a protocol link can replace the account used for publishing.
    if (start !== revision || !await confirm(account.email) || start !== revision) return;
    write(value);
    revision++;
    refreshing = null;
    changed();
  }
  async function refresh(credentials) {
    if (current !== credentials) return current;
    if (refreshing) return refreshing;
    const task = (async () => {
      const response = await remote('/api/auth/refresh','POST',JSON.stringify({refresh_token: credentials.refresh_token}));
      const data = await response.json();
      if (current !== credentials) return current;
      if (!response.ok) {
        if ([400,401,403].includes(response.status)) logout();
        throw Error(data.error || 'Could not refresh your community session.');
      }
      const next = tokenSet(data);
      if (!next) throw Error('The sign-in service returned an incomplete session.');
      write(next);
      return next;
    })();
    refreshing = task;
    try { return await task; } finally { if (refreshing === task) refreshing = null; }
  }
  async function handle(request) {
    const url = new URL(request.url);
    const session = ['/api/session','/api/community/session'].includes(url.pathname);
    if ((!session && url.pathname !== '/api/community') ||
        !(session ? ['GET'] : ['GET','POST','DELETE']).includes(request.method)) {
      return Response.json({error:'Unknown community operation.'},{status:405});
    }
    const origin = request.headers.get('Origin');
    if ((origin && origin !== 'agenetic://app') || request.headers.get('Sec-Fetch-Site') === 'cross-site') {
      return Response.json({error:'Unknown caller.'},{status:403});
    }
    const start = revision;
    try {
      let credentials = read();
      if (session && !credentials) return Response.json(guest);
      if (credentials && credentials.expires_at <= Date.now()/1000 + 60) credentials = await refresh(credentials);
      const endpoint = session ? '/api/community/session' : '/api/community' + url.search;
      const body = ['POST','DELETE'].includes(request.method) ? await request.text() : undefined;
      if (start !== revision) return Response.json({error:'The community account changed. Try again.'},{status:409});
      let response = await remote(endpoint, request.method, body, credentials?.access_token);
      if (response.status === 401 && credentials && start === revision) {
        credentials = await refresh(credentials);
        if (start !== revision || !credentials) return Response.json({error:'Sign in again.'},{status:401});
        response = await remote(endpoint, request.method, body, credentials.access_token);
        if (response.status === 401 && current === credentials) {
          const failure = await response.json();
          if (current === credentials) logout();
          return Response.json({error:failure.error || 'Sign in again.'},{status:401});
        }
      }
      if (start !== revision) return Response.json({error:'The community account changed. Try again.'},{status:409});
      const result = await response.json();
      // The native app owns the browser entry point and local sign-out.
      if (response.ok && result && typeof result === 'object') {
        if (session || 'signIn' in result) result.signIn = signIn;
        if (session || 'signOut' in result) result.signOut = signOut;
      }
      return Response.json(result, {status:response.status,headers:{'Cache-Control':'no-store'}});
    } catch (error) {
      return Response.json({error:error.message || 'Could not reach Groundplanes.'},{status:503});
    }
  }
  return {accept, handle, logout};
}
module.exports = {makeCommunity, callbackTokens, signIn};
