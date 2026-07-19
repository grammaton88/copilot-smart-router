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
exports.estimateTokens = estimateTokens;
exports.summarizeConversation = summarizeConversation;
const vscode = __importStar(require("vscode"));
/**
 * Estimate token count using a rough 4 chars = 1 token approximation.
 */
function estimateTokens(messages) {
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
async function summarizeConversation(history, model) {
    const summaryPrompt = `Summarise the following conversation in a concise but complete way. Preserve technical details, decisions, and the current task state. Only output the summary, no extra commentary.\n\n${history.map((m) => `${m.role}: ${m.content}`).join("\n")}`;
    const messages = [vscode.LanguageModelChatMessage.User(summaryPrompt)];
    const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
    let summary = "";
    for await (const part of response.stream) {
        if (part instanceof vscode.LanguageModelTextPart) {
            summary += part.value;
        }
    }
    return new vscode.LanguageModelChatMessage(vscode.LanguageModelChatMessageRole.User, `[Conversation summary so far]\n${summary}`, "system");
}
