# Repro: Nostr Login Click Before Provider Loads

Purpose: Ensure clicking "Login" before a Nostr provider is available does not throw or silently fail.

## Steps
1. Open `index.html` via the local server.
2. Ensure no Nostr extension is installed (or disable it).
3. Immediately click the "Login" button before the nostr-login shim finishes loading.

## Expected
- A user-facing alert explains that login is not ready yet.
- No console error like "Cannot read properties of undefined (reading 'getPublicKey')".

## Prior Behavior (Before Fix)
- Clicking "Login" could throw because `window.nostr` was undefined.
