import "dotenv/config";
import { onMessage } from "./vkClient.js";
import { forward } from "./forwarder.js";

const { ROUTES } = process.env;

if (!ROUTES) {
  console.error('ROUTES is not set. Example: ROUTES=[{"vk":2000000007,"tg":-1001234567890}]');
  process.exit(1);
}

let routeMap;
try {
  // Build a Map of vkPeerId → tgChatId from the ROUTES JSON array
  routeMap = new Map(JSON.parse(ROUTES).map((r) => [r.vk, r.tg]));
} catch {
  console.error("ROUTES is not valid JSON. Check .env.example for the correct format.");
  process.exit(1);
}

console.log(`VK-TG Forwarder starting... ${routeMap.size} route(s)`);
routeMap.forEach((tg, vk) => console.log(`  ${vk} → ${tg}`));

onMessage(routeMap, forward);
