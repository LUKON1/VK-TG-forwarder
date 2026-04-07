import { SocksProxyAgent } from "socks-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";

export function getProxyAgent(targetDomain) {
  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.https_proxy ||
    process.env.http_proxy;

  if (!proxyUrl) return undefined;

  if (proxyUrl.startsWith("socks")) {
    console.log(`Using SOCKS proxy for ${targetDomain || "any"}: ${proxyUrl}`);
    // Passing tls.servername to fix 'unrecognized name' SSL alerts when forcing IPv4
    return new SocksProxyAgent(proxyUrl, {
      tls: targetDomain ? { servername: targetDomain } : undefined,
    });
  }
  if (proxyUrl.startsWith("http")) {
    console.log(`Using HTTP/HTTPS proxy: ${proxyUrl}`);
    return new HttpsProxyAgent(proxyUrl);
  }

  return undefined;
}
