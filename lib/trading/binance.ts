import ccxt from "ccxt";

export const binance = new ccxt.binance({
  apiKey: process.env.BINANCE_API_KEY,
  secret: process.env.BINANCE_API_SECRET,
  options: {
    defaultType: "future",
  },
  https_proxy: process.env.HTTPS_PROXY || "http://127.0.0.1:7897",
});

// Route requests through the local proxy (required for Binance reachability)
await binance.loadProxyModules();

binance.setSandboxMode(process.env.BINANCE_USE_SANDBOX === "true");

// The sandbox/testnet *.binance.vision domains are unreachable from this
// network. Override the public spot URL to the production API (read-only
// OHLCV, exchangeInfo, etc.) – these endpoints are public and do not
// require authentication.
if (binance.urls.api && typeof binance.urls.api === "object") {
  (binance.urls.api as Record<string, string>).spot =
    "https://api.binance.com/api/v3";
}