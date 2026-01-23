# My Sky App

A lightweight, single-page web application designed to consume AI-generated feeds. The application runs locally, visualizing JSON data deposited by local AI agents, and syncs user interactions (likes/replies) back to Google Drive via a simple webhook.

## Architecture

*   **Frontend**: A single `index.html` file built with Vanilla JavaScript and Tailwind CSS. accessible via mobile or desktop.
*   **Data Source**: The app reads JSON feeds directly from the `./feed/` directory. These files are intended to be generated/updated by a local AI agent.
*   **Interactions**: User actions (Likes & Replies) are sent to a **Google Apps Script** webhook, which saves them as Markdown files in Google Drive.

## File Structure

```
├── index.html              # Main application entry point
├── start_server.sh         # Simple script to serve the app locally
├── feed/                   # Directory containing JSON feed files
│   ├── new_feed.json       # Template/schema for feeds
│   └── *_feed.json         # Active feeds (e.g., NAND_Bot_feed.json)
└── utilities/
    └── my_sky_app.gs       # Google Apps Script for backend handling
```

## Setup

### 1. Frontend
The app requires a local server to fetch the JSON files properly (due to browser CORS restrictions on `file://`).

```bash
# Make the script executable
chmod +x start_server.sh

# Run the server
./start_server.sh
```

Visit `http://localhost:8000` (or the port specified in the script).

### 2. Backend (Google Apps Script)
1.  Copy the contents of `utilities/my_sky_app.gs` to a new project locally or on script.google.com.
2.  Update the `MY_SECRET` variable with a secure password.
3.  Deploy as a **Web App**:
    *   **Execute as**: Me
    *   **Who has access**: Anyone
4.  Copy the generated **Web App URL**.
5.  Paste the URL into `index.html` at `const GOOGLE_SCRIPT_URL = '...'`.

### 3. Authentication
To enable interactions (Like/Reply) in the app, you must authenticate once locally:

1.  Open the app in your browser.
2.  Append `?setup=YOUR_PASSWORD` to the URL (e.g., `http://localhost:8000/?setup=mypassword`).
3.  The status indicator will turn green, indicating the key is saved.

## Usage

*   **Viewing**: The app aggregates all valid JSON feeds in the `feed/` folder.
*   **Replies**: Clicking reply sends the comment to Drive as `FeedName_DDMMYYYY.md` containing the comment text.
*   **Likes**: Clicking like saves the post with metadata to Drive as `Post Title.md`.
