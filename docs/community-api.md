# Community API

The community runs on groundplanes.com (Cloudflare Worker + D1). Accounts are
Groundplanes accounts: email plus a six-digit code, no password.

Base URL: `https://groundplanes.com`

## Sign-in

### In the browser (current desktop flow)

Open `https://groundplanes.com/signin?app=agenetic`. After a correct code the
page redirects to:

```
agenetic://auth/callback#access_token=…&refresh_token=…&expires_at=…
```

The desktop app should register the `agenetic://` protocol handler for
`/auth/callback`, read the fragment, and keep the tokens in the OS keychain
(or `safeStorage`), never in the renderer's localStorage.

Sign-out on the web: `https://groundplanes.com/signin?signout=1`. In the app,
signing out is deleting the stored tokens.

### Directly from the app (optional, no browser)

| Call | Body | Result |
|---|---|---|
| `POST /api/auth/start` | `{"email":"…"}` | `{"sent":true}` and a code is emailed |
| `POST /api/auth/verify` | `{"email":"…","code":"123456"}` | `{access_token, refresh_token, expires_at, user:{id,email}}` |
| `POST /api/auth/refresh` | `{"refresh_token":"…"}` | same shape as verify |

Access tokens last about an hour. Refresh when `expires_at` (Unix seconds) is
within a minute, or after any `401`.

Errors are `{"error":"<sentence for the user>"}` with a 4xx/5xx status. Show
the sentence as is; it is written for people.

Limits: 1 code a minute and 5 an hour per address; a code expires after
10 minutes and allows 5 tries.

## Community

All requests may include `Authorization: Bearer <access_token>`. Reads work
without it; writes require it.

| Call | Notes |
|---|---|
| `GET /api/community/session` | `{signedIn, scope, email, moderator, signIn, signOut}`. `scope` is the same per-user profile hash the app already uses (`sha256("agenetic-profile:"+userId)`), or `"guest"`. |
| `GET /api/community?channel=discussions` | Channels: `discussions`, `showcases`, `workshop`, `exchange`, `ideas`. Paged by `before=<nextCursor>`; 60 posts a page. |
| `GET /api/community?channel=exchange&id=<id>` | Full exchange package. |
| `POST /api/community` | `{alias, channel, title, body, requestId}`. `requestId` (UUID) makes retries safe. 10 posts a minute. |
| `POST /api/community` | `{action:"report", id, reason}` |
| `DELETE /api/community` | `{id}`. Your own posts; moderators can remove any. |
| `GET /api/community?view=reports` | Moderators only. |
| `POST /api/community` | `{action:"resolve", id}`. Moderators only. |

Request and response shapes match what `public/community.js` already sends and
reads, so the change in the app is the base URL and the bearer header.

CORS allows `agenetic://app`, `https://groundplanes.com` and
`https://www.groundplanes.com`. The renderer CSP needs
`connect-src https://groundplanes.com`.

## Moderators

Moderator user IDs are listed in `COMMUNITY_MODERATOR_IDS` in the site's
`wrangler.jsonc` (comma separated). A user's ID is the `user.id` returned by
`/api/auth/verify`.

## What is left to wire in the app

1. Handle `agenetic://auth/callback` in `desktop/main.cjs` and store the tokens.
2. Point `public/community.js` and `public/identity.js` at
   `https://groundplanes.com/api/community` (and `/session`) with the bearer
   header, refreshing as above.
3. Add `https://groundplanes.com` to the renderer CSP `connect-src`.
4. Replace the in-app sign-in link with the browser flow above, or with the
   direct start/verify calls.
