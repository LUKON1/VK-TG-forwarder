import { VK } from "vk-io";

const { VK_COMMUNITY_TOKEN } = process.env;

if (!VK_COMMUNITY_TOKEN) {
  console.error("VK_COMMUNITY_TOKEN is not set in .env");
  process.exit(1);
}

// Shared VK instance using community token — no expiry, no refresh needed
// We connect to VK directly, as VPS datacenters are often blocked by VK API with SSL alerts.
export const vk = new VK({ token: VK_COMMUNITY_TOKEN });

// Start Bots Long Poll, route incoming messages to handler by peer_id
// vk.updates.start() auto-detects group_id and switches to Bots Long Poll API
export async function onMessage(routeMap, handler) {
  // Log incoming peer_ids for the first 5 messages to help identify VK_PEER_ID
  let logCount = 0;

  vk.updates.on("message_new", (ctx) => {
    if (logCount < 5) {
      const known = routeMap.has(ctx.peerId);
      console.log(`[peer] incoming=${ctx.peerId} match=${known}`);
      logCount++;
    }

    const tgChatId = routeMap.get(ctx.peerId);
    if (!tgChatId) return;

    handler(ctx, tgChatId);
  });

  await vk.updates.start().then(() => {
    console.log("VK Bots Long Poll started");
  }).catch((err) => {
    console.error("VK Long Poll failed:", err);
    process.exit(1);
  });
}
