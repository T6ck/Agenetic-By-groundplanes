import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('desktop uses the community feed and opens the browser only for a sign-in click', () => {
  const handlers = [];
  let opens = 0, logouts = 0;
  const bridge = {
    getConnection: async () => ({error:'offline'}),
    onCommunityChanged() {},
    async openCommunity() { opens++; },
    async signOutCommunity() { logouts++; }
  };
  const renderCommunity = () => {}, loadCommunity = () => {};
  const ctx = vm.createContext({window:{ageneticDesktop:bridge}, renderCommunity, loadCommunity,
    document:{addEventListener(type, fn, capture){ if(type==='click' && capture) handlers.push(fn); }},
    URL, page:'Community', report:assert.fail});
  vm.runInContext(fs.readFileSync(new URL('../public/desktop.js',import.meta.url),'utf8'),ctx);
  assert.equal(ctx.renderCommunity,renderCommunity);
  assert.equal(ctx.loadCommunity,loadCommunity);
  assert.equal(opens,0);
  for(const query of ['?app=agenetic','?signout=1']){
    let prevented=false;
    handlers[0]({target:{closest:()=>({href:'https://groundplanes.com/signin'+query})},preventDefault(){prevented=true;}});
    assert.ok(prevented);
  }
  assert.equal(opens,1);
  assert.equal(logouts,1);
});
