import { vk } from "./vkClient.js";
import { sendText, sendPhoto, sendMediaGroup } from "./tgClient.js";

const { TG_CHAT_ID } = process.env;

// Pick the largest size URL from a VK photo attachment
// In Bots Long Poll, data is in attachment.payload; User Long Poll uses attachment.photo
function getPhotoUrl(attachment) {
  const sizes = attachment.payload?.sizes ?? attachment.photo?.sizes ?? [];
  return [...sizes].sort((a, b) => b.width - a.width)[0]?.url ?? null;
}

// In-memory name cache to avoid repeated VK API calls
const nameCache = new Map();

async function resolveName(senderId) {
  if (nameCache.has(senderId)) return nameCache.get(senderId);
  try {
    let name;
    if (senderId > 0) {
      const [user] = await vk.api.users.get({ user_ids: senderId });
      name = `${user.first_name} ${user.last_name}`;
    } else {
      name = "Group";
    }
    nameCache.set(senderId, name);
    return name;
  } catch {
    return String(senderId);
  }
}

export async function forward(ctx) {
  const chatId = Number(TG_CHAT_ID);
  const name = await resolveName(ctx.senderId);
  const prefix = `[${name}]`;
  const text = ctx.text ?? "";
  const caption = text ? `${prefix}: ${text}` : prefix;

  // Collect photo attachments
  const photoUrls = (ctx.attachments ?? [])
    .filter((a) => a.type === "photo")
    .map(getPhotoUrl)
    .filter(Boolean);

  if (photoUrls.length === 0) {
    if (text) await sendText(chatId, caption);
    return;
  }

  if (photoUrls.length === 1) {
    await sendPhoto(chatId, photoUrls[0], caption);
    return;
  }

  await sendMediaGroup(chatId, photoUrls, caption);
}
