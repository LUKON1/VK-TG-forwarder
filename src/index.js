import "dotenv/config";
import { onMessage } from "./vkClient.js";
import { forward } from "./forwarder.js";

const { VK_PEER_ID } = process.env;

if (!VK_PEER_ID) {
  console.error("Missing required env vars. Check .env.example");
  process.exit(1);
}

console.log("VK-TG Forwarder starting...");

onMessage(Number(VK_PEER_ID), forward);
