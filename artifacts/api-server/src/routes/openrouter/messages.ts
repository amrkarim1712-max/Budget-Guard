import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq, asc, count } from "drizzle-orm";
import { SendOpenrouterMessageBody } from "@workspace/api-zod";
import { openrouter } from "@workspace/integrations-openrouter-ai";
import { formatMessage } from "./conversations";

const router: IRouter = Router();

// List messages
router.get("/openrouter/conversations/:id/messages", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid conversation ID" });
    return;
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  res.json(msgs.map(formatMessage));
});

// Send message (SSE streaming)
router.post("/openrouter/conversations/:id/messages", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid conversation ID" });
    return;
  }

  const body = SendOpenrouterMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { content, model: messageModel, webSearch = false, images = [] } = body.data;

  // Get conversation
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id));

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const selectedModel = messageModel ?? conv.model;

  // Save user message
  const [userMsg] = await db
    .insert(messages)
    .values({
      conversationId: id,
      role: "user",
      content,
      model: selectedModel,
      webSearch,
      images: images.length > 0 ? images : null,
    })
    .returning();

  // Get conversation history for context
  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  // Build chat messages for OpenRouter
  const chatMessages: Array<{
    role: "user" | "assistant" | "system";
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  }> = [];

  // System message
  const systemParts = [
    "You are NeuralChat, a helpful and knowledgeable AI assistant.",
    "Provide clear, accurate, and thoughtful responses.",
    "Format code with proper markdown code blocks with language identifiers.",
  ];
  if (webSearch) {
    systemParts.push(
      `Today's date is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`,
      "The user has enabled web search mode. Use your most up-to-date knowledge and clearly indicate when information might be outdated."
    );
  }
  chatMessages.push({ role: "system", content: systemParts.join(" ") });

  // Add history (excluding the just-inserted user message)
  for (const msg of history.slice(0, -1)) {
    if (msg.role === "user") {
      if (msg.images && msg.images.length > 0) {
        const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
          { type: "text", text: msg.content },
          ...msg.images.map((img) => ({
            type: "image_url",
            image_url: { url: img.startsWith("data:") ? img : `data:image/jpeg;base64,${img}` },
          })),
        ];
        chatMessages.push({ role: "user", content: contentParts });
      } else {
        chatMessages.push({ role: "user", content: msg.content });
      }
    } else {
      chatMessages.push({ role: "assistant", content: msg.content });
    }
  }

  // Add current user message with images if any
  if (images.length > 0) {
    const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: "text", text: content },
      ...images.map((img) => ({
        type: "image_url",
        image_url: { url: img.startsWith("data:") ? img : `data:image/jpeg;base64,${img}` },
      })),
    ];
    chatMessages.push({ role: "user", content: contentParts });
  } else {
    chatMessages.push({ role: "user", content });
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  // Send the user message back immediately
  res.write(`data: ${JSON.stringify({ userMessage: formatMessage(userMsg) })}\n\n`);

  let fullResponse = "";

  try {
    const stream = await openrouter.chat.completions.create({
      model: selectedModel,
      max_tokens: 8192,
      messages: chatMessages as Parameters<typeof openrouter.chat.completions.create>[0]["messages"],
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullResponse += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }

    // Save assistant message
    const [assistantMsg] = await db
      .insert(messages)
      .values({
        conversationId: id,
        role: "assistant",
        content: fullResponse,
        model: selectedModel,
        webSearch,
      })
      .returning();

    // Check if this is the first exchange — if so, generate a title
    const [{ value: msgCount }] = await db
      .select({ value: count() })
      .from(messages)
      .where(eq(messages.conversationId, id));

    if (Number(msgCount) <= 3 && conv.title === "New Conversation") {
      // Auto-generate title in background
      generateTitle(id, content, fullResponse, selectedModel).catch(() => {});
    }

    // Update conversation updatedAt
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, id));

    res.write(`data: ${JSON.stringify({ done: true, assistantMessage: formatMessage(assistantMsg) })}\n\n`);
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    res.write(`data: ${JSON.stringify({ error })}\n\n`);
  }

  res.end();
});

async function generateTitle(
  conversationId: number,
  userMessage: string,
  assistantMessage: string,
  model: string
): Promise<void> {
  try {
    const response = await openrouter.chat.completions.create({
      model,
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
    // Silently fail — title generation is non-critical
  }
}

export default router;
