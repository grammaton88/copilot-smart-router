"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const vscode = __importStar(require("vscode"));
const modelRouter_1 = require("./router/modelRouter");
const conversationManager_1 = require("./router/conversationManager");
const settings_1 = require("./config/settings");
const copilotProvider_1 = require("./providers/copilotProvider");
const workspaceContextProvider_1 = require("./router/workspaceContextProvider");
function normalizeChatHistory(history) {
    const messages = [];
    for (const turn of history) {
        if (turn instanceof vscode.ChatRequestTurn) {
            messages.push(vscode.LanguageModelChatMessage.User(turn.prompt));
        }
        else if (turn instanceof vscode.ChatResponseTurn) {
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
function activate(context) {
    const participant = vscode.chat.createChatParticipant("smart", async (request, chatContext, stream, token) => {
        const settings = (0, settings_1.getSettings)();
        const conversationId = chatContext.history[0]?.participant ?? "default";
        const convId = request.conversationId || conversationId;
        // Step 1: pick model tier
        const { model, tier } = await (0, modelRouter_1.selectModel)(request.prompt, convId);
        stream.markdown(`*(Routing to **${tier}** tier: ${model.name})*  \n\n`);
        // Step 2: gather workspace context if appropriate
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
        const workspaceContext = await (0, workspaceContextProvider_1.gatherWorkspaceContext)(request.prompt, workspaceRoot, settings.workspaceContextMode);
        // Step 3: normalize chat history
        const normalizedHistory = normalizeChatHistory(chatContext.history);
        // Step 4: inject workspace context as a user message acting as a system prompt
        if (workspaceContext) {
            normalizedHistory.unshift(vscode.LanguageModelChatMessage.User("System: Here is the current workspace context (file contents). Use this information to answer:\n" +
                workspaceContext));
        }
        // Step 5: build final message array, possibly summarised
        const models = await (0, copilotProvider_1.resolveTierModels)(settings);
        const summarizationModel = models.fast;
        const messages = await (0, conversationManager_1.prepareMessages)(convId, request.prompt, normalizedHistory, summarizationModel, settings.tokenLimitBeforeSummarization, settings.enableAutoSummarization);
        // Step 6: send request to the chosen model
        const chatRequest = await model.sendRequest(messages, {}, token);
        let fullResponse = "";
        for await (const part of chatRequest.stream) {
            if (part instanceof vscode.LanguageModelTextPart) {
                stream.markdown(part.value);
                fullResponse += part.value;
            }
            else if (part instanceof vscode.LanguageModelPromptTsxPart) {
                // Ignore TSX parts for now
            }
        }
        // Step 7: update conversation state with the final messages
        const finalMessages = [
            ...messages,
            vscode.LanguageModelChatMessage.Assistant(fullResponse),
        ];
        (0, conversationManager_1.updateConversationAfterRequest)(convId, finalMessages, tier);
    });
    context.subscriptions.push(participant);
}
