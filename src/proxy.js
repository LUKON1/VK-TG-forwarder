import { SocksProxyAgent } from "socks-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";

export function getProxyAgent() {
  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.https_proxy ||
    process.env.http_proxy;

  if (!proxyUrl) return undefined;

  if (proxyUrl.startsWith("socks")) {
    console.log(`Using SOCKS proxy: ${proxyUrl}`);
    return new SocksProxyAgent(proxyUrl);
  }
  if (proxyUrl.startsWith("http")) {
    console.log(`Using HTTP/HTTPS proxy: ${proxyUrl}`);
    return new HttpsProxyAgent(proxyUrl);
  }

  return undefined;
}
