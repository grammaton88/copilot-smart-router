import * as vscode from "vscode";
import { estimateTokens, summarizeConversation } from "./tokenOptimizer";

export interface ConversationState {
  requestCount: number;
  lastModelUsed: string; // 'fast' | 'balanced' | 'powerful'
  history: vscode.LanguageModelChatMessage[];
  summary?: vscode.LanguageModelChatMessage;
}

// In-memory store keyed by conversation ID (string)
const conversations = new Map<string, ConversationState>();

export function getConversation(
  conversationId: string,
): ConversationState | undefined {
  return conversations.get(conversationId);
}

export function createConversation(conversationId: string): ConversationState {
  const state: ConversationState = {
    requestCount: 0,
    lastModelUsed: "balanced",
    history: [],
  };
  conversations.set(conversationId, state);
  return state;
}

export function updateConversationAfterRequest(
  conversationId: string,
  messages: vscode.LanguageModelChatMessage[],
  modelUsed: string,
) {
  const state = conversations.get(conversationId);
  if (state) {
    state.requestCount++;
    state.lastModelUsed = modelUsed;
    state.history = messages;
  }
}

/**
 * Prepares the final messages array, possibly with summarization.
 */
export async function prepareMessages(
  conversationId: string,
  userPrompt: string,
  chatHistory: readonly vscode.LanguageModelChatMessage[],
  modelForSummarization: vscode.LanguageModelChat,
  tokenLimit: number,
  enableSummarization: boolean,
): Promise<vscode.LanguageModelChatMessage[]> {
  let state = conversations.get(conversationId);
  if (!state) {
    state = createConversation(conversationId);
  }

  // Build messages from existing chat history (provided by VS Code) + the new prompt
  const messages = [
    ...chatHistory,
    vscode.LanguageModelChatMessage.User(userPrompt),
  ];

  const currentTokens = estimateTokens(messages);
  const tooLarge = currentTokens > tokenLimit;

  if (enableSummarization && tooLarge && state.requestCount > 2) {
    // Summarize all previous messages except the very last user prompt
    const toSummarize = messages.slice(0, -1); // all but current user message
    const summaryMsg = await summarizeConversation(
      toSummarize,
      modelForSummarization,
    );
    const compact = [summaryMsg, messages[messages.length - 1]]; // summary + new prompt
    return compact;
  }

  return messages;
}
