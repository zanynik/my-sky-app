---
name: feed_generator
description: Tools for generating feeds from atomic notes using Gemini.
---

# Feed Generator

This skill contains scripts to generate private feed posts from raw text notes and publish them to Nostr.

## Scripts

### `feed_gen.sh`

Aggregates random notes from a source directory, combines them with a prompt, uses Gemini to generate a structured JSON feed, validates it, and publishes it through `publish_feed.js`.

**Features:**
- Randomly selects notes from a "RAW" directory (up to ~500 words).
- Uses a customizable prompt (`nand_prompt.txt` by default, configurable via `-p`).
- Generates a JSON feed suitable for apps.
- Validates the JSON output.
- Publishes encrypted feed content to relays via Nostr.

**Usage:**

```bash
./scripts/feed_gen.sh [options]
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `-s` | Raw notes directory | `$HOME/Library/CloudStorage/GoogleDrive-zanynik@gmail.com/My Drive/Second Brain/1 RAW` |
| `-d` | Script directory | Current script folder |
| `-p` | Prompt file name | `nand_prompt.txt` |
| `-h` | Show help | N/A |

**Example:**

Run with default settings:
```bash
./scripts/feed_gen.sh
```

Override source and project:
```bash
./scripts/feed_gen.sh -s "$HOME/notes/ideas" -p "tweet_prompt.txt"
```

### `youtube_feed_gen.sh`

Creates YouTube-style recommendation posts from your notes using Gemini (no YouTube API), validates the JSON payload, and publishes via Nostr.

**Usage:**

```bash
./scripts/youtube_feed_gen.sh [options]
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `-s` | Raw notes directory | `$HOME/Library/CloudStorage/GoogleDrive-zanynik@gmail.com/My Drive/Second Brain/1 RAW` |
| `-d` | Script directory | Current script folder |
| `-p` | Prompt file name | `youtube_prompt.txt` |
| `-w` | Max sampled note words | `650` |
| `-h` | Show help | N/A |
