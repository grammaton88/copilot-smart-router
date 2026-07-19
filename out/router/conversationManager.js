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
exports.getConversation = getConversation;
exports.createConversation = createConversation;
exports.updateConversationAfterRequest = updateConversationAfterRequest;
exports.prepareMessages = prepareMessages;
const vscode = __importStar(require("vscode"));
const tokenOptimizer_1 = require("./tokenOptimizer");
// In-memory store keyed by conversation ID (string)
const conversations = new Map();
function getConversation(conversationId) {
    return conversations.get(conversationId);
}
function createConversation(conversationId) {
    const state = {
        requestCount: 0,
        lastModelUsed: "balanced",
        history: [],
    };
    conversations.set(conversationId, state);
    return state;
}
function updateConversationAfterRequest(conversationId, messages, modelUsed) {
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
async function prepareMessages(conversationId, userPrompt, chatHistory, modelForSummarization, tokenLimit, enableSummarization) {
    let state = conversations.get(conversationId);
    if (!state) {
        state = createConversation(conversationId);
    }
    // Build messages from existing chat history (provided by VS Code) + the new prompt
    const messages = [
        ...chatHistory,
        vscode.LanguageModelChatMessage.User(userPrompt),
    ];
    const currentTokens = (0, tokenOptimizer_1.estimateTokens)(messages);
    const tooLarge = currentTokens > tokenLimit;
    if (enableSummarization && tooLarge && state.requestCount > 2) {
        // Summarize all previous messages except the very last user prompt
        const toSummarize = messages.slice(0, -1); // all but current user message
        const summaryMsg = await (0, tokenOptimizer_1.summarizeConversation)(toSummarize, modelForSummarization);
        const compact = [summaryMsg, messages[messages.length - 1]]; // summary + new prompt
        return compact;
    }
    return messages;
}
