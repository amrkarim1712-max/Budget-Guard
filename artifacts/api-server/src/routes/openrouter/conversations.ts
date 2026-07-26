import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq, desc, ilike, and } from "drizzle-orm";
import {
  CreateOpenrouterConversationBody,
  UpdateOpenrouterConversationBody,
  ListOpenrouterConversationsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// List conversations
router.get("/openrouter/conversations", async (req: Request, res: Response) => {
  const parsed = ListOpenrouterConversationsQueryParams.safeParse(req.query);
  const search = parsed.success ? parsed.data.search : undefined;

  const userId = req.isAuthenticated() ? req.user.id : null;

  let query = db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.pinned), desc(conversations.updatedAt));

  const conditions = [];
  if (userId) {
    conditions.push(eq(conversations.userId, userId));
  } else {
    // Return all for unauthenticated (demo mode)
  }
  if (search) {
    conditions.push(ilike(conversations.title, `%${search}%`));
  }

  const results =
    conditions.length > 0
      ? await db
          .select()
          .from(conversations)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(desc(conversations.pinned), desc(conversations.updatedAt))
      : await db
          .select()
          .from(conversations)
          .orderBy(desc(conversations.pinned), desc(conversations.updatedAt));

  res.json(results.map(formatConversation));
});

// Create conversation
router.post("/openrouter/conversations", async (req: Request, res: Response) => {
  const body = CreateOpenrouterConversationBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const userId = req.isAuthenticated() ? req.user.id : null;

  const [conv] = await db
    .insert(conversations)
    .values({
      title: body.data.title,
      model: body.data.model ?? "meta-llama/llama-3.3-70b-instruct",
      userId,
    })
    .returning();

  res.status(201).json(formatConversation(conv));
});

// Get conversation with messages
router.get("/openrouter/conversations/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid conversation ID" });
    return;
  }

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id));

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);

  res.json({
    ...formatConversation(conv),
    messages: msgs.map(formatMessage),
  });
});

// Update conversation (rename, pin, model)
router.patch("/openrouter/conversations/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid conversation ID" });
    return;
  }

  const body = UpdateOpenrouterConversationBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.data.title !== undefined) updateData.title = body.data.title;
  if (body.data.pinned !== undefined) updateData.pinned = body.data.pinned;
  if (body.data.model !== undefined) updateData.model = body.data.model;

  const [updated] = await db
    .update(conversations)
    .set(updateData)
    .where(eq(conversations.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  res.json(formatConversation(updated));
});

// Delete conversation
router.delete("/openrouter/conversations/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid conversation ID" });
    return;
  }

  const [deleted] = await db
    .delete(conversations)
    .where(eq(conversations.id, id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  res.status(204).send();
});

function formatConversation(conv: typeof conversations.$inferSelect) {
  return {
    id: conv.id,
    title: conv.title,
    model: conv.model,
    pinned: conv.pinned,
    userId: conv.userId,
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
  };
}

export function formatMessage(msg: typeof messages.$inferSelect) {
  return {
    id: msg.id,
    conversationId: msg.conversationId,
    role: msg.role,
    content: msg.content,
    images: msg.images ?? null,
    model: msg.model ?? null,
    webSearch: msg.webSearch,
    createdAt: msg.createdAt.toISOString(),
  };
}

export default router;
