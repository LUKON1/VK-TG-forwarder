import { vk } from "./vkClient.js";
import { sendText, sendPhoto, sendMediaGroup } from "./tgClient.js";

const { TG_CHAT_ID } = process.env;

// Pick the largest size URL from a VK photo attachment
function getPhotoUrl(attachment) {
  const sizes = attachment.photo?.sizes ?? [];
  return [...sizes].sort((a, b) => b.width - a.width)[0]?.url ?? null;
}

async function resolveName(senderId) {
  try {
    if (senderId > 0) {
      const [user] = await vk.api.users.get({ user_ids: senderId });
      return `${user.first_name} ${user.last_name}`;
    }
    return "Group";
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
