import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const proxyProvider = createOpenAICompatible({
  name: "cmkey",
  baseURL: process.env.CMKEY_BASE_URL || "https://api2.cmkey.cn/v1",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export const deepseekv31 = proxyProvider("deepseek-v4-pro");

export const deepseekR1 = proxyProvider("deepseek-v4-pro");

export const deepseek = proxyProvider("deepseek-v4-pro");

export const deepseekThinking = proxyProvider("deepseek-v4-pro");
