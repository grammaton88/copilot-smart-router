import * as vscode from "vscode";

export interface RouterSettings {
  fastModel: string;
  balancedModel: string;
  powerfulModel: string;
  complexityThreshold: number;
  tokenLimitBeforeSummarization: number;
  enableAutoSummarization: boolean;
  workspaceContextMode: "never" | "always" | "smart";
}

export function getSettings(): RouterSettings {
  const config = vscode.workspace.getConfiguration("aiRouter");
  return {
    fastModel: config.get<string>("fastModel", "GPT-5 mini"),
    balancedModel: config.get<string>("balancedModel", "Raptor mini"),
    powerfulModel: config.get<string>("powerfulModel", "GPT-5.5"),
    complexityThreshold: config.get<number>("complexityThreshold", 0.6),
    tokenLimitBeforeSummarization: config.get<number>(
      "tokenLimitBeforeSummarization",
      80000,
    ),
    enableAutoSummarization: config.get<boolean>(
      "enableAutoSummarization",
      true,
    ),
    workspaceContextMode: config.get<"never" | "always" | "smart">(
      "workspaceContextMode",
      "smart",
    ),
  };
}
