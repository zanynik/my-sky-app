# My Sky App

A personal AI note app with two surfaces:
1. `index.html` record view for voice/text capture.
2. `index.html` feed view for private, Nostr-delivered AI posts.

## What changed

- The separate YouTube tab was removed from the app header.
- Static feed JSON loading was removed from the UI.
- YouTube API-based generation was removed.
- Feed content is now loaded from private Nostr events only.
- YouTube-style recommendations can still be generated, but now through Gemini and published to Nostr like any other feed post.

## Architecture

```
├── index.html
├── start_server.sh
├── utilities/
│   ├── my_sky_app.gs
│   ├── vectorize_notes.js
│   └── feed_generator/
│       ├── package.json
│       └── scripts/
│           ├── feed_gen.sh
│           ├── youtube_feed_gen.sh
│           ├── publish_feed.js
│           ├── nand_prompt.txt
│           └── youtube_prompt.txt
```

## Nostr feed flow

1. Generate posts with Gemini from local notes (`feed_gen.sh` or `youtube_feed_gen.sh`).
2. Publish encrypted payload via `publish_feed.js` (kind `10001`, tagged to user pubkey).
3. App decrypts and renders posts in Feed after NIP-07 login.

## Local run

```bash
chmod +x start_server.sh
./start_server.sh
```

Open `http://localhost:8000/index.html`.

## Feed generation scripts

From `utilities/feed_generator`:

```bash
npm run generate:notes
npm run generate:youtube
```

Optional env vars before running:
- `BOT_PRIVKEY`
- `USER_PUBKEY`
- `RELAYS`

## Backend notes

`utilities/my_sky_app.gs` handles like/reply persistence to your Google Drive via Web App endpoint configured in `index.html`.
