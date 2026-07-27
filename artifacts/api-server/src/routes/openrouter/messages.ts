import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq, asc, count } from "drizzle-orm";
import { SendOpenrouterMessageBody } from "@workspace/api-zod";
import { openrouter } from "@workspace/integrations-openrouter-ai";
import { formatMessage } from "./conversations";
import { webSearchTool, type ChatMessage, type ToolResult } from "../../tools/index";

const router: IRouter = Router();

// ── List messages ──────────────────────────────────────────────────────────────

router.get("/openrouter/conversations/:id/messages", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid conversation ID" }); return; }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  res.json(msgs.map(formatMessage));
});

// ── Send message (SSE streaming) ───────────────────────────────────────────────

router.post("/openrouter/conversations/:id/messages", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid conversation ID" }); return; }

  const body = SendOpenrouterMessageBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid request body" }); return; }

  const { content, model: messageModel, webSearch = false, images = [] } = body.data;

  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

  const baseModel = messageModel ?? conv.model;

  // ── Save user message ────────────────────────────────────────────────────────
  const [userMsg] = await db
    .insert(messages)
    .values({
      conversationId: id,
      role: "user",
      content,
      model: baseModel,
      webSearch,
      images: images.length > 0 ? images : null,
    })
    .returning();

  // ── Build chat history ───────────────────────────────────────────────────────
  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  const chatMessages: ChatMessage[] = [];

  const systemParts = [
    "You are AI, a helpful and knowledgeable AI assistant.",
    "Provide clear, accurate, and thoughtful responses.",
    "Format code with proper markdown code blocks with language identifiers.",
  ];

  // Add history (excluding the just-inserted user message)
  for (const msg of history.slice(0, -1)) {
    if (msg.role === "user") {
      if (msg.images && msg.images.length > 0) {
        chatMessages.push({
          role: "user",
          content: [
            { type: "text", text: msg.content },
            ...msg.images.map((img) => ({
              type: "image_url",
              image_url: { url: img.startsWith("data:") ? img : `data:image/jpeg;base64,${img}` },
            })),
          ],
        });
      } else {
        chatMessages.push({ role: "user", content: msg.content });
      }
    } else {
      chatMessages.push({ role: "assistant", content: msg.content });
    }
  }

  // Add current user message
  if (images.length > 0) {
    chatMessages.push({
      role: "user",
      content: [
        { type: "text", text: content },
        ...images.map((img) => ({
          type: "image_url",
          image_url: { url: img.startsWith("data:") ? img : `data:image/jpeg;base64,${img}` },
        })),
      ],
    });
  } else {
    chatMessages.push({ role: "user", content });
  }

  // ── Apply tools ──────────────────────────────────────────────────────────────
  let toolResult: ToolResult = {
    model: baseModel,
    messages: chatMessages,
    systemParts,
    metadata: {},
  };

  if (webSearch) {
    toolResult = await webSearchTool.prepare({
      model: toolResult.model,
      messages: toolResult.messages,
      systemParts: toolResult.systemParts,
    });
  }
  // Future tools: if (codeInterpreter) toolResult = await codeInterpreterTool.prepare(toolResult);

  const finalMessages: ChatMessage[] = [
    { role: "system", content: toolResult.systemParts.join(" ") },
    ...toolResult.messages,
  ];

  // ── SSE setup ────────────────────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  res.write(`data: ${JSON.stringify({ userMessage: formatMessage(userMsg) })}\n\n`);

  let fullResponse = "";

  try {
    const stream = await openrouter.chat.completions.create({
      model: toolResult.model,
      max_tokens: 8192,
      messages: finalMessages as Parameters<typeof openrouter.chat.completions.create>[0]["messages"],
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullResponse += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }

      // Let active tools inspect the chunk for metadata (e.g., citations)
      if (webSearch) {
        const before = JSON.stringify(toolResult.metadata.citations);
        webSearchTool.processChunk(chunk as unknown as Record<string, unknown>, toolResult);
        const after = JSON.stringify(toolResult.metadata.citations);
        // Stream citations to the client as soon as they're found
        if (before !== after && Array.isArray(toolResult.metadata.citations)) {
          res.write(`data: ${JSON.stringify({ citations: toolResult.metadata.citations })}\n\n`);
        }
      }
    }

    const citations = Array.isArray(toolResult.metadata.citations) && toolResult.metadata.citations.length > 0
      ? (toolResult.metadata.citations as string[])
      : null;

    // ── Save assistant message ───────────────────────────────────────────────
    const [assistantMsg] = await db
      .insert(messages)
      .values({
        conversationId: id,
        role: "assistant",
        content: fullResponse,
        model: toolResult.model,
        webSearch,
        citations,
      })
      .returning();

    // Auto-generate title on first exchange
    const [{ value: msgCount }] = await db
      .select({ value: count() })
      .from(messages)
      .where(eq(messages.conversationId, id));

    if (Number(msgCount) <= 3 && conv.title === "New Conversation") {
      generateTitle(id, content, fullResponse, baseModel).catch(() => {});
    }

    await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, id));

    res.write(`data: ${JSON.stringify({ done: true, assistantMessage: formatMessage(assistantMsg) })}\n\n`);
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    res.write(`data: ${JSON.stringify({ error })}\n\n`);
  }

  res.end();
});

// ── Auto title generation ──────────────────────────────────────────────────────

async function generateTitle(
  conversationId: number,
  userMessage: string,
  assistantMessage: string,
  model: string
): Promise<void> {
  // Use the base model without :online for title generation (no web search needed)
  const titleModel = model.replace(/:online$/, "");
  try {
    const response = await openrouter.chat.completions.create({
      model: titleModel,
      max_tokens: 20,
      messages: [
        {
          role: "user",
          content: `Generate a short, descriptive title (3-6 words, no quotes, no punctuation at end) for a conversation that starts with:
User: ${userMessage.slice(0, 200)}
Assistant: ${assistantMessage.slice(0, 200)}

Title:`,
        },
      ],
    });

    const title = response.choices[0]?.message?.content?.trim();
    if (title && title.length > 0 && title.length < 80) {
      await db
        .update(conversations)
        .set({ title, updatedAt: new Date() })
        .where(eq(conversations.id, conversationId));
    }
  } catch {
    // Non-critical
  }
}

export default router;
