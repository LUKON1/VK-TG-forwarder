import { vk } from "./vkClient.js";
import { sendText, sendPhoto, sendMediaGroup, sendDocument, sendVoice } from "./tgClient.js";

// Pick the largest size URL from a VK photo attachment
// In Bots Long Poll, data is in attachment.payload; User Long Poll uses attachment.photo
function getPhotoUrl(attachment) {
  const sizes = attachment.payload?.sizes ?? attachment.photo?.sizes ?? [];
  return [...sizes].sort((a, b) => b.width - a.width)[0]?.url ?? null;
}

// Extract doc URL and filename — handle both vk-io payload shapes
function getDocInfo(attachment) {
  const doc = attachment.payload ?? attachment.doc ?? {};
  const url = doc.url ?? null;
  const title = doc.title ?? `file.${doc.ext ?? "bin"}`;
  return url ? { url, title } : null;
}

// Extract voice URL — prefer .ogg for native Telegram playback
function getVoiceUrl(attachment) {
  const am = attachment.payload ?? attachment.audioMessage ?? attachment.audio_message ?? {};
  return am.link_ogg ?? am.link_mp3 ?? null;
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

// tgChatId is passed from the router (vkClient) — no longer read from env
export async function forward(ctx, tgChatId) {
  const name = await resolveName(ctx.senderId);
  const prefix = `[${name}]`;
  const text = ctx.text ?? "";
  const caption = text ? `${prefix}: ${text}` : prefix;

  const attachments = ctx.attachments ?? [];

  // Collect photo attachments
  const photoUrls = attachments
    .filter((a) => a.type === "photo")
    .map(getPhotoUrl)
    .filter(Boolean);

  // Collect document attachments (pdf, zip, docx, etc.)
  const docs = attachments
    .filter((a) => a.type === "doc")
    .map(getDocInfo)
    .filter(Boolean);

  // Collect voice attachments
  const voiceUrls = attachments
    .filter((a) => a.type === "audio_message")
    .map(getVoiceUrl)
    .filter(Boolean);

  const hasMedia = photoUrls.length > 0 || docs.length > 0 || voiceUrls.length > 0;

  if (!hasMedia) {
    if (text) await sendText(tgChatId, caption);
    return;
  }

  // Track whether caption has been used — attach it only to the first item
  let captionUsed = false;

  // Send photos
  if (photoUrls.length === 1) {
    await sendPhoto(tgChatId, photoUrls[0], caption);
    captionUsed = true;
  } else if (photoUrls.length > 1) {
    await sendMediaGroup(tgChatId, photoUrls, caption);
    captionUsed = true;
  }

  // Send documents one by one (Telegram mediaGroup does not support mixed doc types)
  for (const doc of docs) {
    const docCaption = captionUsed ? undefined : caption;
    await sendDocument(tgChatId, doc.url, doc.title, docCaption);
    captionUsed = true;
  }

  // Send voice messages
  for (const url of voiceUrls) {
    await sendVoice(tgChatId, url);
  }
}
