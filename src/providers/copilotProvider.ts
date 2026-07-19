import * as vscode from "vscode";

/**
 * Maps a configured model identifier (family name, part of id, etc.) to an actual
 * vscode.LanguageModelChat available from the Copilot vendor.
 */
export async function resolveModel(
  modelIdentifier: string,
): Promise<vscode.LanguageModelChat | undefined> {
  const models = await vscode.lm.selectChatModels({ vendor: "copilot" });

  // Try exact match on id first
  let model = models.find((m) => m.id === modelIdentifier);
  if (model) return model;

  // Try matching by family name (case-insensitive)
  model = models.find(
    (m) =>
      m.family?.toLowerCase() === modelIdentifier.toLowerCase() ||
      m.name?.toLowerCase() === modelIdentifier.toLowerCase(),
  );
  if (model) return model;

  // Partial match on id or name
  model = models.find(
    (m) =>
      m.id.toLowerCase().includes(modelIdentifier.toLowerCase()) ||
      m.name.toLowerCase().includes(modelIdentifier.toLowerCase()) ||
      (m.family &&
        m.family.toLowerCase().includes(modelIdentifier.toLowerCase())),
  );

  return model;
}

/**
 * Resolves the three tier models and returns them.
 * Falls back to the first available model if a specific one isn't found.
 */
export async function resolveTierModels(settings: {
  fastModel: string;
  balancedModel: string;
  powerfulModel: string;
}): Promise<{
  fast: vscode.LanguageModelChat;
  balanced: vscode.LanguageModelChat;
  powerful: vscode.LanguageModelChat;
}> {
  const [fast, balanced, powerful] = await Promise.all([
    resolveModel(settings.fastModel),
    resolveModel(settings.balancedModel),
    resolveModel(settings.powerfulModel),
  ]);

  // Fallback: use any available model if the configured one is missing
  const allModels = await vscode.lm.selectChatModels({ vendor: "copilot" });
  const fallback = allModels[0];

  return {
    fast: fast || fallback,
    balanced: balanced || fallback,
    powerful: powerful || fallback,
  };
}
