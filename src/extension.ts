import * as vscode from "vscode";
import { selectModel } from "./router/modelRouter";
import {
  prepareMessages,
  updateConversationAfterRequest,
} from "./router/conversationManager";
import { getSettings } from "./config/settings";
import { resolveTierModels } from "./providers/copilotProvider";
import { gatherWorkspaceContext } from "./router/workspaceContextProvider";

function normalizeChatHistory(
  history: readonly (vscode.ChatRequestTurn | vscode.ChatResponseTurn)[],
): vscode.LanguageModelChatMessage[] {
  const messages: vscode.LanguageModelChatMessage[] = [];
  for (const turn of history) {
    if (turn instanceof vscode.ChatRequestTurn) {
      messages.push(vscode.LanguageModelChatMessage.User(turn.prompt));
    } else if (turn instanceof vscode.ChatResponseTurn) {
      const responseText = turn.response
        .map((part) => {
          if (part instanceof vscode.ChatResponseMarkdownPart) {
            return part.value.value;
          }
          if (part instanceof vscode.ChatResponseProgressPart) {
            return part.value;
          }
          return "";
        })
        .filter((text) => text.length > 0)
        .join("\n\n");

      if (responseText.length > 0) {
        messages.push(vscode.LanguageModelChatMessage.Assistant(responseText));
      }
    }
  }
  return messages;
}

export function activate(context: vscode.ExtensionContext) {
  const participant = vscode.chat.createChatParticipant(
    "smart",
    async (
      request: vscode.ChatRequest,
      chatContext: vscode.ChatContext,
      stream: vscode.ChatResponseStream,
      token: vscode.CancellationToken,
    ) => {
      const settings = getSettings();
      const conversationId = chatContext.history[0]?.participant ?? "default";
      const convId = (request as any).conversationId || conversationId;

      // Step 1: pick model tier
      const { model, tier } = await selectModel(request.prompt, convId);
      stream.markdown(`*(Routing to **${tier}** tier: ${model.name})*  \n\n`);

      // Step 2: gather workspace context if appropriate
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
      const workspaceContext = await gatherWorkspaceContext(
        request.prompt,
        workspaceRoot,
        settings.workspaceContextMode,
      );

      // Step 3: normalize chat history
      const normalizedHistory = normalizeChatHistory(chatContext.history);

      // Step 4: inject workspace context as a user message acting as a system prompt
      if (workspaceContext) {
        normalizedHistory.unshift(
          vscode.LanguageModelChatMessage.User(
            "System: Here is the current workspace context (file contents). Use this information to answer:\n" +
              workspaceContext,
          ),
        );
      }

      // Step 5: build final message array, possibly summarised
      const models = await resolveTierModels(settings);
      const summarizationModel = models.fast;
      const messages = await prepareMessages(
        convId,
        request.prompt,
        normalizedHistory,
        summarizationModel,
        settings.tokenLimitBeforeSummarization,
        settings.enableAutoSummarization,
      );

      // Step 6: send request to the chosen model
      const chatRequest = await model.sendRequest(messages, {}, token);

      let fullResponse = "";
      for await (const part of chatRequest.stream) {
        if (part instanceof vscode.LanguageModelTextPart) {
          stream.markdown(part.value);
          fullResponse += part.value;
        } else if (part instanceof vscode.LanguageModelPromptTsxPart) {
          // Ignore TSX parts for now
        }
      }

      // Step 7: update conversation state with the final messages
      const finalMessages = [
        ...messages,
        vscode.LanguageModelChatMessage.Assistant(fullResponse),
      ];
      updateConversationAfterRequest(convId, finalMessages, tier);
    },
  );

  context.subscriptions.push(participant);
}
