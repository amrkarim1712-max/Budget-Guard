/**
 * Tool interface — extend this to add new tools (code interpreter, file analysis, etc.)
 * Each tool modifies the request before it's sent to OpenRouter and/or processes
 * the response after it returns.
 */

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export interface ToolContext {
  model: string;
  messages: ChatMessage[];
  systemParts: string[];
}

export interface ToolResult {
  /** Possibly modified model ID (e.g., adds :online suffix) */
  model: string;
  /** Possibly extended messages */
  messages: ChatMessage[];
  /** Extra system prompt parts */
  systemParts: string[];
  /** Any metadata this tool produces (e.g., citations from web search) */
  metadata: Record<string, unknown>;
}

export interface Tool {
  name: string;
  /** Called before the OpenRouter request is made */
  prepare(ctx: ToolContext): Promise<ToolResult>;
  /** Called on each streaming chunk — extract metadata if present */
  processChunk(chunk: Record<string, unknown>, accumulated: ToolResult): void;
}
