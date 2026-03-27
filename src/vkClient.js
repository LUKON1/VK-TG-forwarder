import { VK } from "vk-io";

const { VK_USER_TOKEN } = process.env;

if (!VK_USER_TOKEN) {
  console.error("VK_USER_TOKEN is not set");
  process.exit(1);
}

export const vk = new VK({ token: VK_USER_TOKEN });

// Start Long Poll and register a handler filtered by peer_id
export function onMessage(peerId, handler) {
  vk.updates.on("message_new", (ctx) => {
    if (ctx.peerId !== peerId) return;
    handler(ctx);
  });

  vk.updates.startPolling().then(() => {
    console.log(`VK Long Poll started, peer_id=${peerId}`);
  }).catch((err) => {
    console.error("VK Long Poll failed:", err);
    process.exit(1);
  });
}
