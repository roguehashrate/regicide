// nostr.js
export let nostrRelay = null;
export let nostrPub = null;

const relays = [
  "wss://relay.damus.io",
  "wss://relay.nostr.band",
  "wss://nostr-pub.wellorder.net"
];

export async function connectNostr() {
  const key = prompt("Enter your Nostr private key (hex) - safe only on this device");
  if (!key || key.length !== 64) return alert("Invalid key");

  try {
    const nostr = await import('https://cdn.jsdelivr.net/npm/nostr-tools/+esm');
    nostrPub = nostr.getPublicKey(key);

    for (const url of relays) {
      try {
        const relay = nostr.relayInit(url);
        relay.on("connect", () => console.log(`Connected to relay: ${url}`));
        relay.on("error", (e) => console.warn(`Relay error on ${url}:`, e));
        await relay.connect();
        nostrRelay = relay;
        return { nostr, key }; // return nostr-tools module and private key
      } catch (err) {
        console.warn(`Failed to connect to ${url}:`, err);
      }
    }

    alert("Could not connect to any Nostr relay");
    return null;
  } catch (err) {
    console.error("Nostr-tools import or connection error:", err);
    alert("Nostr connection error, check console");
    return null;
  }
}

// Post game result
export async function postGameResult(result, nostrModule, privateKey) {
  if (!nostrRelay || !nostrPub) return;
  const event = {
    kind: 1,
    pubkey: nostrPub,
    created_at: Math.floor(Date.now()/1000),
    tags: [],
    content: JSON.stringify(result)
  };
  const signedEvent = await nostrModule.signEvent(event, privateKey);
  try {
    await nostrRelay.publish(signedEvent);
    console.log("Game result posted to Nostr:", result);
  } catch(err) {
    console.error("Failed to post game result:", err);
  }
}
