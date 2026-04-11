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

// Recursively flatten text and attachments from fwd_messages and reply_message
async function extractMessageData(ctx, isRoot = true) {
  let textPart = ctx.text || "";

  // Add forward prefix if it's not the root message and it has some text
  if (!isRoot && textPart) {
    const senderName = await resolveName(ctx.senderId);
    textPart = `[Форвард от ${senderName}]:\n${textPart}`;
  }

  const allAttachments = [...(ctx.attachments || [])];
  const allTexts = textPart ? [textPart] : [];

  // Parse reply message
  if (ctx.hasReplyMessage && ctx.replyMessage) {
    const replyData = await extractMessageData(ctx.replyMessage, false);
    if (replyData.text) {
      const formattedReply = replyData.text.replace(/^\[Форвард от /, '[Ответ от ');
      allTexts.push(`>> ${formattedReply}`);
    }
    allAttachments.push(...replyData.attachments);
  }

  // Parse forwarded messages
  if (ctx.hasForwards && ctx.forwards && ctx.forwards.length > 0) {
    for (const fwd of ctx.forwards) {
      const fwdData = await extractMessageData(fwd, false);
      if (fwdData.text) {
        allTexts.push(fwdData.text);
      }
      allAttachments.push(...fwdData.attachments);
    }
  }

  return {
    text: allTexts.join("\n\n").trim(),
    attachments: allAttachments
  };
}

// tgChatId is passed from the router (vkClient) — no longer read from env
export async function forward(ctx, tgChatId) {
  // Always resolve the root sender
  const name = await resolveName(ctx.senderId);
  const prefix = `[${name}]`;
  
  // Extract all nested text and attachments
  const msgData = await extractMessageData(ctx, true);
  
  // Construct caption
  const caption = msgData.text ? `${prefix}: ${msgData.text}` : prefix;

  // Filter attachments by type
  const photoUrls = msgData.attachments
    .filter((a) => a.type === "photo")
    .map(getPhotoUrl)
    .filter(Boolean);

  const docs = msgData.attachments
    .filter((a) => a.type === "doc")
    .map(getDocInfo)
    .filter(Boolean);

  const voiceUrls = msgData.attachments
    .filter((a) => a.type === "audio_message")
    .map(getVoiceUrl)
    .filter(Boolean);

  const hasMedia = photoUrls.length > 0 || docs.length > 0 || voiceUrls.length > 0;

  // Send text-only message if no media
  if (!hasMedia) {
    if (msgData.text) await sendText(tgChatId, caption);
    return;
  }

  // Track whether caption has been used — attach it only to the first item
  let captionUsed = false;

  // Send photos (handles media group automatically if >1)
  if (photoUrls.length === 1) {
    await sendPhoto(tgChatId, photoUrls[0], caption);
    captionUsed = true;
  } else if (photoUrls.length > 1) {
    // Note: Telegram allows up to 10 photos in a media group.
    // If there are more than 10, slice them or chunk them.
    // KISS principle: Send first 10, or send chunked.
    // Chunking to avoid 400 Bad Request error.
    for (let i = 0; i < photoUrls.length; i += 10) {
      const chunk = photoUrls.slice(i, i + 10);
      const chunkCaption = (i === 0) ? caption : undefined;
      if (chunk.length === 1) {
        await sendPhoto(tgChatId, chunk[0], chunkCaption);
      } else {
        await sendMediaGroup(tgChatId, chunk, chunkCaption);
      }
    }
    captionUsed = true;
  }

  // Send documents
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
