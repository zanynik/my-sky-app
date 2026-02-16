#!/bin/bash

DEFAULT_SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RAW_NOTES_DIR="${RAW_NOTES_DIR:-$HOME/Library/CloudStorage/GoogleDrive-zanynik@gmail.com/My Drive/Second Brain/1 RAW}"
SCRIPT_DIR="${SCRIPT_DIR:-$DEFAULT_SCRIPT_DIR}"
PROMPT_FILE="${PROMPT_FILE:-youtube_prompt.txt}"
MAX_WORDS="${MAX_WORDS:-650}"

usage() {
    echo "Usage: $0 [-s raw_notes_dir] [-d script_dir] [-p prompt_file] [-w max_words] [-h]"
    echo ""
    echo "Options:"
    echo "  -s DIR   Directory containing raw .txt notes (default: $RAW_NOTES_DIR)"
    echo "  -d DIR   Script directory containing helper files (default: $SCRIPT_DIR)"
    echo "  -p FILE  Prompt file name (default: $PROMPT_FILE)"
    echo "  -w NUM   Max words sampled from notes (default: $MAX_WORDS)"
    echo "  -h       Show this help message"
    exit 1
}

while getopts "s:d:p:w:h" opt; do
    case $opt in
        s) RAW_NOTES_DIR="$OPTARG" ;;
        d) SCRIPT_DIR="$OPTARG" ;;
        p) PROMPT_FILE="$OPTARG" ;;
        w) MAX_WORDS="$OPTARG" ;;
        h) usage ;;
        *) usage ;;
    esac
done

TEMP_RAW="/tmp/gemini_youtube_raw_$(date +%s).txt"
TEMP_JSON="/tmp/youtube_feed_$(date +%s).json"
SELECTED_NOTES_FILE="/tmp/youtube_selected_notes_$(date +%s).txt"

echo "=== Starting YouTube-style feed generation at $(date) ==="
echo "Configuration:"
echo "  Raw Notes: $RAW_NOTES_DIR"
echo "  Prompt File: $SCRIPT_DIR/$PROMPT_FILE"
echo "  Max Words: $MAX_WORDS"

count=$(ls "$RAW_NOTES_DIR"/*.txt 2>/dev/null | wc -l)
if [ "$count" -eq 0 ]; then
    echo "ERROR: No .txt notes found in $RAW_NOTES_DIR"
    exit 1
fi

touch "$SELECTED_NOTES_FILE"

ls "$RAW_NOTES_DIR"/*.txt | python3 -c "import sys, random; lines=sys.stdin.readlines(); random.shuffle(lines); print(''.join(lines), end='')" | while read -r note_file; do
    current_word_count=$(wc -w < "$SELECTED_NOTES_FILE")
    if [ "$current_word_count" -ge "$MAX_WORDS" ]; then
        break
    fi
    cat "$note_file" >> "$SELECTED_NOTES_FILE"
    echo -e "\n---\n" >> "$SELECTED_NOTES_FILE"
done

echo "Calling Gemini..."
{
    if [ -f "$SCRIPT_DIR/$PROMPT_FILE" ]; then
        cat "$SCRIPT_DIR/$PROMPT_FILE"
    else
        echo "ERROR: Prompt file not found at $SCRIPT_DIR/$PROMPT_FILE" >&2
        rm -f "$SELECTED_NOTES_FILE"
        exit 1
    fi

    echo -e "\n\n--- START OF NOTES ---\n"
    cat "$SELECTED_NOTES_FILE"
} | gemini --yolo > "$TEMP_RAW"

if [ $? -ne 0 ]; then
    echo "ERROR: Gemini command failed"
    rm -f "$SELECTED_NOTES_FILE"
    exit 1
fi

echo "Cleaning JSON..."
python3 -c "import sys; print(sys.stdin.read().replace('\`\`\`json', '').replace('\`\`\`', '').strip())" < "$TEMP_RAW" > "$TEMP_JSON"

echo "Validating JSON..."
if ! python3 -m json.tool "$TEMP_JSON" > /dev/null; then
    echo "ERROR: Invalid JSON generated. Raw output saved in $TEMP_RAW"
    rm -f "$SELECTED_NOTES_FILE"
    exit 1
fi

python3 -c "
import sys, json
try:
    data = json.load(open('$TEMP_JSON'))
    if not isinstance(data, list):
        print('ERROR: Root element must be a list')
        sys.exit(1)
    if not data:
        print('ERROR: Empty list returned')
        sys.exit(1)
    for item in data:
        if not all(k in item for k in ('id', 'title', 'content')):
            print('ERROR: Post missing required fields (id, title, content)')
            sys.exit(1)
        if 'tags' not in item or not isinstance(item['tags'], list):
            item['tags'] = []
        if 'youtube' not in item['tags']:
            item['tags'].append('youtube')
        if 'recommendation' not in item['tags']:
            item['tags'].append('recommendation')
    json.dump(data, open('$TEMP_JSON', 'w'), indent=2)
except Exception as e:
    print(f'ERROR: Validation failed: {e}')
    sys.exit(1)
"

if [ $? -ne 0 ]; then
    echo "ERROR: JSON validation failed"
    rm -f "$SELECTED_NOTES_FILE"
    exit 1
fi

echo "Publishing to Nostr..."
export BOT_PRIVKEY="${BOT_PRIVKEY:-a070a320843b2e1319d58b7f844bc2b2c9b92d8e83e4f7c33880d37d4123f8ea}"
export USER_PUBKEY="${USER_PUBKEY:-6577828a88755f6d0d3a0a6e94d1e124fe65d9a9d4166bcb2bc329f539c6aa32}"

if [ ! -f "$SCRIPT_DIR/publish_feed.js" ]; then
    echo "ERROR: Publication script not found at $SCRIPT_DIR/publish_feed.js"
    rm -f "$SELECTED_NOTES_FILE"
    exit 1
fi

node "$SCRIPT_DIR/publish_feed.js" "$TEMP_JSON"

if [ $? -eq 0 ]; then
    echo "=== SUCCESS: YouTube-style feed published to Nostr ==="
else
    echo "ERROR: Failed to publish feed to Nostr"
    echo "JSON saved at: $TEMP_JSON"
    rm -f "$SELECTED_NOTES_FILE"
    exit 1
fi

rm -f "$TEMP_RAW" "$TEMP_JSON" "$SELECTED_NOTES_FILE"
