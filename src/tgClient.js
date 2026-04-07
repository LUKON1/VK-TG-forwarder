import { Bot, InputMediaBuilder } from "grammy";
import { getProxyAgent } from "./proxy.js";

const { TG_BOT_TOKEN } = process.env;

if (!TG_BOT_TOKEN) {
  console.error("TG_BOT_TOKEN is not set");
  process.exit(1);
}

const agent = getProxyAgent("api.telegram.org");
const botConfig = agent ? { client: { baseFetchConfig: { agent } } } : {};
const bot = new Bot(TG_BOT_TOKEN, botConfig);

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
