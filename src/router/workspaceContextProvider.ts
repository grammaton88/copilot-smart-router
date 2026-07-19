import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

/**
 * Collects workspace files and returns a string that can be used
 * as additional context in the system prompt.
 */
export async function gatherWorkspaceContext(
  prompt: string,
  workspaceRoot: vscode.Uri | undefined,
  mode: "never" | "always" | "smart",
): Promise<string | undefined> {
  if (mode === "never" || !workspaceRoot) {
    return undefined;
  }

  const lowerPrompt = prompt.toLowerCase();
  const workspaceKeywords = [
    "workspace",
    "project",
    "codebase",
    "entire",
    "repository",
    "all files",
    "whole project",
    "folder",
    "structure",
  ];

  if (
    mode === "smart" &&
    !workspaceKeywords.some((k) => lowerPrompt.includes(k))
  ) {
    return undefined;
  }

  const files = await collectWorkspaceFiles(workspaceRoot);
  if (files.length === 0) {
    return undefined;
  }

  let context = `### Workspace Files (${workspaceRoot.fsPath})\n\n`;
  const MAX_FILES_INLINE = 50;
  const MAX_TOTAL_SIZE = 200000;

  let totalSize = 0;
  for (let i = 0; i < files.length; i++) {
    const relativePath = path.relative(workspaceRoot.fsPath, files[i].fsPath);
    if (i < MAX_FILES_INLINE && totalSize < MAX_TOTAL_SIZE) {
      try {
        const content = fs.readFileSync(files[i].fsPath, "utf8");
        const truncated = content.substring(0, 4000);
        context += `**${relativePath}**\n\`\`\`\n${truncated}\n\`\`\`\n\n`;
        totalSize += truncated.length + relativePath.length + 20;
      } catch {
        // binary or inaccessible – skip
      }
    } else {
      context += `- ${relativePath}\n`;
    }
  }

  return context;
}

async function collectWorkspaceFiles(root: vscode.Uri): Promise<vscode.Uri[]> {
  const ignorePatterns = [
    "**/node_modules/**",
    "**/.git/**",
    "**/dist/**",
    "**/out/**",
    "**/build/**",
    "**/.next/**",
    "**/coverage/**",
  ];
  const gitignorePatterns = await readGitignore(root);

  const files = await vscode.workspace.findFiles(
    "**/*",
    `{${[...ignorePatterns, ...gitignorePatterns].join(",")}}`,
    1000,
  );
  return files;
}

async function readGitignore(root: vscode.Uri): Promise<string[]> {
  try {
    const gitignorePath = vscode.Uri.joinPath(root, ".gitignore");
    const content = await vscode.workspace.fs.readFile(gitignorePath);
    return content
      .toString()
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((pattern) => pattern.replace(/^\//, "**/"));
  } catch {
    return [];
  }
}
