import type { Tool, ToolContext, ToolResult } from "./types";

/**
 * Web Search Tool
 *
 * Uses OpenRouter's `:online` compound router which augments any model with
 * real-time web search. The `:online` suffix is appended to the model ID and
 * OpenRouter injects relevant web results into the context automatically.
 *
 * Citations are returned by OpenRouter as a top-level `citations` array on
 * streaming chunks (typically on the final chunk).
 *
 * To add another tool later, implement the Tool interface from types.ts and
 * register it in index.ts.
 */
export const webSearchTool: Tool = {
  name: "web-search",

  async prepare(ctx: ToolContext): Promise<ToolResult> {
    // Append :online to enable OpenRouter's web search compound router.
    // Do not double-append if already present.
    const model = ctx.model.endsWith(":online")
      ? ctx.model
      : `${ctx.model}:online`;

    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const systemParts = [
      ...ctx.systemParts,
      `Today is ${today}.`,
      "You have access to real-time web search. Cite your sources inline using [n] notation when referencing search results.",
    ];

    return {
      model,
      messages: ctx.messages,
      systemParts,
      metadata: { citations: [] },
    };
  },

  processChunk(chunk: Record<string, unknown>, accumulated: ToolResult): void {
    // OpenRouter returns citations as a top-level array on stream chunks
    const citations = chunk["citations"];
    if (Array.isArray(citations) && citations.length > 0) {
      accumulated.metadata["citations"] = citations as string[];
    }
    // Some OpenRouter responses nest it under "x_openrouter"
    const xor = chunk["x_openrouter"] as Record<string, unknown> | undefined;
    if (xor?.["citations"] && Array.isArray(xor["citations"])) {
      accumulated.metadata["citations"] = xor["citations"] as string[];
    }
  },
};
