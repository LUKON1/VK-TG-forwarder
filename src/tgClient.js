import { Bot, InputFile, InputMediaBuilder } from "grammy";
import { getProxyAgent } from "./proxy.js";

const { TG_BOT_TOKEN } = process.env;

if (!TG_BOT_TOKEN) {
  console.error("TG_BOT_TOKEN is not set");
  process.exit(1);
}

const agent = getProxyAgent("api.telegram.org");
const botConfig = agent ? { client: { baseFetchConfig: { agent } } } : {};
const bot = new Bot(TG_BOT_TOKEN, botConfig);

// Download a remote file into a Buffer for reliable Telegram delivery
async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetchBuffer failed: ${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

export function sendText(chatId, text) {
  return bot.api.sendMessage(chatId, text);
}

// Telegram fetches photos by URL directly — no local buffering needed
export function sendPhoto(chatId, url, caption) {
  return bot.api.sendPhoto(chatId, url, { caption });
}

export function sendMediaGroup(chatId, urls, caption) {
  const media = urls.map((url, i) =>
    InputMediaBuilder.photo(url, i === 0 ? { caption } : {})
  );
  return bot.api.sendMediaGroup(chatId, media);
}

// Buffer document from VK before sending — VK links may be rejected by Telegram servers
export async function sendDocument(chatId, url, filename, caption) {
  const buffer = await fetchBuffer(url);
  const file = new InputFile(buffer, filename);
  return bot.api.sendDocument(chatId, file, caption ? { caption } : {});
}

// Buffer voice from VK before sending — same TTL/403 risk as documents
export async function sendVoice(chatId, url) {
  const buffer = await fetchBuffer(url);
  return bot.api.sendVoice(chatId, new InputFile(buffer, "voice.ogg"));
}
