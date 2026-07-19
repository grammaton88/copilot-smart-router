import * as vscode from "vscode";
import { analyzeComplexity } from "./promptClassifier";
import { getConversation } from "./conversationManager";
import { getSettings } from "../config/settings";
import { resolveTierModels } from "../providers/copilotProvider";

export type ModelTier = "fast" | "balanced" | "powerful";

export async function selectModel(
  prompt: string,
  conversationId: string,
): Promise<{ model: vscode.LanguageModelChat; tier: ModelTier }> {
  const settings = getSettings();
  const models = await resolveTierModels(settings);

  const state = getConversation(conversationId);
  const isFirstRequest = !state || state.requestCount === 0;
  const complexity = analyzeComplexity(prompt);

  // First request in a conversation: be generous, use balanced or powerful
  if (isFirstRequest) {
    if (complexity >= settings.complexityThreshold) {
      return { model: models.powerful, tier: "powerful" };
    } else {
      return { model: models.balanced, tier: "balanced" };
    }
  }

  // Subsequent requests: use tier based on complexity
  if (complexity >= settings.complexityThreshold + 0.15) {
    return { model: models.powerful, tier: "powerful" };
  } else if (complexity >= settings.complexityThreshold) {
    return { model: models.balanced, tier: "balanced" };
  } else {
    return { model: models.fast, tier: "fast" };
  }
}
