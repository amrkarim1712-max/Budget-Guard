import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { count } from "drizzle-orm";

const router: IRouter = Router();

export const AVAILABLE_MODELS = [
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B",
    description: "Meta's latest open-source powerhouse. Fast, accurate, and free.",
    contextLength: 128000,
    supportsVision: false,
    pricing: "Free",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Gemini 2.0 Flash",
    description: "Google's fastest multimodal model with vision support.",
    contextLength: 1048576,
    supportsVision: true,
    pricing: "$0.10/M tokens",
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Google's best balance of speed and capability.",
    contextLength: 1048576,
    supportsVision: true,
    pricing: "$0.15/M tokens",
  },
  {
    id: "anthropic/claude-3.5-haiku",
    name: "Claude 3.5 Haiku",
    description: "Anthropic's fastest model. Great for everyday tasks.",
    contextLength: 200000,
    supportsVision: true,
    pricing: "$0.80/M tokens",
  },
  {
    id: "anthropic/claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    description: "Anthropic's most intelligent and capable model.",
    contextLength: 200000,
    supportsVision: true,
    pricing: "$3/M tokens",
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    description: "OpenAI's efficient model. Excellent reasoning and vision.",
    contextLength: 128000,
    supportsVision: true,
    pricing: "$0.15/M tokens",
  },
  {
    id: "openai/gpt-4.1",
    name: "GPT-4.1",
    description: "OpenAI's most capable model with vision and long context.",
    contextLength: 1047576,
    supportsVision: true,
    pricing: "$2/M tokens",
  },
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    description: "State-of-the-art reasoning model from DeepSeek.",
    contextLength: 64000,
    supportsVision: false,
    pricing: "$0.55/M tokens",
  },
  {
    id: "mistralai/mistral-small-3.2-24b-instruct",
    name: "Mistral Small 3.2",
    description: "Mistral's compact but powerful instruction-following model.",
    contextLength: 128000,
    supportsVision: true,
    pricing: "$0.10/M tokens",
  },
  {
    id: "qwen/qwen3-235b-a22b",
    name: "Qwen3 235B",
    description: "Alibaba's massive model with deep reasoning capabilities.",
    contextLength: 131072,
    supportsVision: false,
    pricing: "$0.14/M tokens",
  },
];

router.get("/openrouter/models", async (_req: Request, res: Response) => {
  res.json(AVAILABLE_MODELS);
});

router.get("/openrouter/stats", async (_req: Request, res: Response) => {
  const [[{ value: totalConversations }], [{ value: totalMessages }], [{ value: pinnedConversations }]] =
    await Promise.all([
      db.select({ value: count() }).from(conversations),
      db.select({ value: count() }).from(messages),
      db.select({ value: count() }).from(conversations).where(
        (await import("drizzle-orm")).eq(conversations.pinned, true)
      ),
    ]);

  res.json({
    totalConversations: Number(totalConversations),
    totalMessages: Number(totalMessages),
    pinnedConversations: Number(pinnedConversations),
  });
});

export default router;
