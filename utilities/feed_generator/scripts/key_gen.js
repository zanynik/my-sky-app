const { generateSecretKey, getPublicKey } = require('nostr-tools');
// const { bytesToHex } = require('@noble/hashes/utils'); // Removed to avoid import error
const { nip19 } = require('nostr-tools');

function generateKeys() {
    const sk = generateSecretKey();
    const pk = getPublicKey(sk);

    const skHex = Buffer.from(sk).toString('hex');
    const nsec = nip19.nsecEncode(sk);
    const npub = nip19.npubEncode(pk);

    console.log("=== Generated Nostr Keys ===");
    console.log(`Private Key (hex): ${skHex}`);
    console.log(`Private Key (nsec): ${nsec}`);
    console.log(`Public Key (hex):  ${pk}`);
    console.log(`Public Key (npub):  ${npub}`);
    console.log("============================");
    console.log("Save the 'Private Key (hex)' as BOT_PRIVKEY in your environment or .env file.");
}

generateKeys();
