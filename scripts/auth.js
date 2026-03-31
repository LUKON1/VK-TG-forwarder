#!/usr/bin/env node
/**
 * One-time VK auth script via direct login (VK Android client credentials).
 * Gives an offline token with messages scope — does not expire.
 * Run: npm run auth
 */
import "dotenv/config";
import readline from "readline";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// VK Android public client credentials (standard for personal automation)
const VK_CLIENT_ID = "2274003";
const VK_CLIENT_SECRET = "hHbZxrka2uZ6jB1inYsH";

const TOKENS_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  ".tokens.json"
);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function requestToken(login, password, code = null) {
  const params = new URLSearchParams({
    grant_type: "password",
    username: login,
    password: password,
    client_id: VK_CLIENT_ID,
    client_secret: VK_CLIENT_SECRET,
    scope: "messages,offline",
    "2fa_supported": "1",
    v: "5.199",
  });

  if (code) params.set("code", code);

  const resp = await fetch("https://oauth.vk.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  return resp.json();
}

async function main() {
  console.log("\n=== VK Auth (offline token, never expires) ===\n");
  console.log("Enter credentials for the VK account that is in the target chat.\n");

  const login = await ask("Phone or email: ");
  const password = await ask("Password: ");

  let data = await requestToken(login.trim(), password.trim());

  // Handle 2FA (SMS or TOTP)
  if (data.error === "need_validation") {
    const redirectUri = data.redirect_uri || "";
    const isSms = redirectUri.includes("act=authcheck");

    if (isSms) {
      console.log("\nVK requires 2FA code. Check your phone for an SMS.");
      const code = await ask("Enter 2FA code: ");
      data = await requestToken(login.trim(), password.trim(), code.trim());
    } else {
      console.error("\nVK requires additional verification (captcha or unknown 2FA).");
      console.error("Redirect URI:", redirectUri);
      rl.close();
      process.exit(1);
    }
  }

  rl.close();

  if (data.error) {
    console.error(`\nAuth failed: ${data.error} — ${data.error_description}`);
    process.exit(1);
  }

  const tokens = {
    access_token: data.access_token,
    user_id: data.user_id,
    // offline scope — token does not expire, no refresh needed
    expires_at: null,
    refresh_token: null,
    device_id: null,
  };

  writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
  console.log("\nToken saved to .tokens.json");
  console.log("Offline token — does not expire.");
  console.log("Run: npm start");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
