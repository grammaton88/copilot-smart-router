import * as vscode from "vscode";

/**
 * Estimate token count using a rough 4 chars = 1 token approximation.
 */
export function estimateTokens(
  messages: vscode.LanguageModelChatMessage[],
): number {
  let total = 0;
  for (const msg of messages) {
    total += Math.ceil(msg.content.length / 4);
  }
  return total;
}

/**
 * Summarise conversation history using the provided model.
 * Returns a single system message containing the summary.
 */
export async function summarizeConversation(
  history: vscode.LanguageModelChatMessage[],
  model: vscode.LanguageModelChat,
): Promise<vscode.LanguageModelChatMessage> {
  const summaryPrompt = `Summarise the following conversation in a concise but complete way. Preserve technical details, decisions, and the current task state. Only output the summary, no extra commentary.\n\n${history.map((m) => `${m.role}: ${m.content}`).join("\n")}`;

  const messages = [vscode.LanguageModelChatMessage.User(summaryPrompt)];

  const response = await model.sendRequest(
    messages,
    {},
    new vscode.CancellationTokenSource().token,
  );

  let summary = "";
  for await (const part of response.stream) {
    if (part instanceof vscode.LanguageModelTextPart) {
      summary += part.value;
    }
  }

  return new vscode.LanguageModelChatMessage(
    vscode.LanguageModelChatMessageRole.User,
    `[Conversation summary so far]\n${summary}`,
    "system",
  );
}
