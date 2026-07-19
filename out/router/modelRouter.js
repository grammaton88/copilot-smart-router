"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectModel = selectModel;
const promptClassifier_1 = require("./promptClassifier");
const conversationManager_1 = require("./conversationManager");
const settings_1 = require("../config/settings");
const copilotProvider_1 = require("../providers/copilotProvider");
async function selectModel(prompt, conversationId) {
    const settings = (0, settings_1.getSettings)();
    const models = await (0, copilotProvider_1.resolveTierModels)(settings);
    const state = (0, conversationManager_1.getConversation)(conversationId);
    const isFirstRequest = !state || state.requestCount === 0;
    const complexity = (0, promptClassifier_1.analyzeComplexity)(prompt);
    // First request in a conversation: be generous, use balanced or powerful
    if (isFirstRequest) {
        if (complexity >= settings.complexityThreshold) {
            return { model: models.powerful, tier: "powerful" };
        }
        else {
            return { model: models.balanced, tier: "balanced" };
        }
    }
    // Subsequent requests: use tier based on complexity
    if (complexity >= settings.complexityThreshold + 0.15) {
        return { model: models.powerful, tier: "powerful" };
    }
    else if (complexity >= settings.complexityThreshold) {
        return { model: models.balanced, tier: "balanced" };
    }
    else {
        return { model: models.fast, tier: "fast" };
    }
}
