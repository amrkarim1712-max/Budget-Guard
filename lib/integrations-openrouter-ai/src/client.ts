import OpenAI from "openai";

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  throw new Error(
    "OPENROUTER_API_KEY must be set. Please add your OpenRouter API key as a secret.",
  );
}

export const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey,
  defaultHeaders: {
    "HTTP-Referer": process.env.REPLIT_DOMAINS ?? "https://localhost",
    "X-Title": "AI",
  },
});
