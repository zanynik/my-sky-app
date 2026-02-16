const fs = require('fs');
const path = require('path');
const { nip44, finalizeEvent, nip19 } = require('nostr-tools');
const { Relay } = require('nostr-tools');
const WebSocket = require('websocket').w3cwebsocket;

// Polyfill for WebSocket in Node environment
global.WebSocket = WebSocket;

async function publishFeed() {
    // 1. Configuration & Validation
    const botPrivKeyHex = process.env.BOT_PRIVKEY;
    const userPubKeyInput = process.env.USER_PUBKEY;
    const feedPath = process.argv[2];
    const relays = (process.env.RELAYS || "wss://relay.damus.io,wss://relay.primal.net,wss://nos.lol").split(',');

    if (!botPrivKeyHex) {
        console.error("ERROR: BOT_PRIVKEY environment variable not set.");
        process.exit(1);
    }
    if (!userPubKeyInput) {
        console.error("ERROR: USER_PUBKEY environment variable not set.");
        process.exit(1);
    }
    if (!feedPath || !fs.existsSync(feedPath)) {
        console.error(`ERROR: Feed file not found at: ${feedPath}`);
        process.exit(1);
    }

    // Decode/Normalize Keys
    let botPrivKey;
    try {
        if (botPrivKeyHex.startsWith('nsec')) {
            const { data } = nip19.decode(botPrivKeyHex);
            botPrivKey = data;
        } else {
            botPrivKey = Uint8Array.from(Buffer.from(botPrivKeyHex, 'hex'));
        }
    } catch (e) {
        console.error("Failed to decode BOT_PRIVKEY. Ensure it is hex or nsec format.", e);
        process.exit(1);
    }

    console.log("DEBUG: Bot PrivKey Type:", typeof botPrivKey);

    let userPubKey;
    if (userPubKeyInput.startsWith('npub')) {
        try {
            const { data } = nip19.decode(userPubKeyInput);
            userPubKey = data; // nip19.decode returns hex string or bytes.

            // If it returned bytes (older versions), convert to hex
            if (userPubKey instanceof Uint8Array) {
                userPubKey = Buffer.from(userPubKey).toString('hex');
            }
        } catch (e) {
            console.error("Invalid USER_PUBKEY (npub format).", e);
            process.exit(1);
        }
    } else {
        // Assume HEX
        // Validate it's hex and 64 chars
        if (!/^[0-9a-fA-F]{64}$/.test(userPubKeyInput)) {
            console.error("Invalid USER_PUBKEY (hex format). Must be 64-char hex string.");
            process.exit(1);
        }
        userPubKey = userPubKeyInput;
    }

    console.log("User PubKey (Hex):", userPubKey);

    // 2. Read JSON Content
    console.log(`Reading feed from ${feedPath}...`);
    const feedContent = fs.readFileSync(feedPath, 'utf8');

    // Parse to ensure it's valid JSON, but we encrypt the string
    try {
        JSON.parse(feedContent);
    } catch (e) {
        console.error("Feed file contains invalid JSON.");
        process.exit(1);
    }

    // 3. Encrypt (NIP-44)
    console.log("Encrypting content (NIP-44)...");
    const conversationKey = nip44.v2.utils.getConversationKey(botPrivKey, userPubKey);
    const encryptedContent = nip44.v2.encrypt(feedContent, conversationKey);

    // 4. Create Event
    const event = finalizeEvent({
        kind: 10001,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['p', userPubKey]],
        content: encryptedContent,
    }, botPrivKey);

    console.log(`Event signed. ID: ${event.id}`);

    // 5. Publish to Relays
    console.log(`Publishing to relays: ${relays.join(', ')}`);

    // Simple publication loop
    const publishPromises = relays.map(async (url) => {
        try {
            const relay = await Relay.connect(url);
            await relay.publish(event);
            console.log(`✅ Published to ${url}`);
            relay.close();
        } catch (err) {
            console.error(`❌ Failed to publish to ${url}: ${err.message}`);
        }
    });

    await Promise.all(publishPromises);
    console.log("Done.");
}

publishFeed().catch(console.error);
