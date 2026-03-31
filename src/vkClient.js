import { VK } from "vk-io";

const { VK_COMMUNITY_TOKEN } = process.env;

if (!VK_COMMUNITY_TOKEN) {
  console.error("VK_COMMUNITY_TOKEN is not set in .env");
  process.exit(1);
}

// Shared VK instance using community token — no expiry, no refresh needed
export const vk = new VK({ token: VK_COMMUNITY_TOKEN });

// Start Bots Long Poll and register a handler filtered by peer_id
// vk.updates.start() auto-detects group_id and switches to Bots Long Poll API
export async function onMessage(peerId, handler) {
  // Log incoming peer_ids for the first 5 messages to help identify VK_PEER_ID
  let logCount = 0;

  vk.updates.on("message_new", (ctx) => {
    if (logCount < 5) {
      console.log(`[peer] incoming=${ctx.peerId} expected=${peerId} match=${ctx.peerId === peerId}`);
      logCount++;
    }
    if (ctx.peerId !== peerId) return;
    handler(ctx);
  });

  await vk.updates.start().then(() => {
    console.log(`VK Bots Long Poll started, peer_id=${peerId}`);
  }).catch((err) => {
    console.error("VK Long Poll failed:", err);
    process.exit(1);
  });
}
