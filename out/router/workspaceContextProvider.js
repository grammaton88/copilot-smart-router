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
exports.gatherWorkspaceContext = gatherWorkspaceContext;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
/**
 * Collects workspace files and returns a string that can be used
 * as additional context in the system prompt.
 */
async function gatherWorkspaceContext(prompt, workspaceRoot, mode) {
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
    if (mode === "smart" &&
        !workspaceKeywords.some((k) => lowerPrompt.includes(k))) {
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
            }
            catch {
                // binary or inaccessible – skip
            }
        }
        else {
            context += `- ${relativePath}\n`;
        }
    }
    return context;
}
async function collectWorkspaceFiles(root) {
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
    const files = await vscode.workspace.findFiles("**/*", `{${[...ignorePatterns, ...gitignorePatterns].join(",")}}`, 1000);
    return files;
}
async function readGitignore(root) {
    try {
        const gitignorePath = vscode.Uri.joinPath(root, ".gitignore");
        const content = await vscode.workspace.fs.readFile(gitignorePath);
        return content
            .toString()
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith("#"))
            .map((pattern) => pattern.replace(/^\//, "**/"));
    }
    catch {
        return [];
    }
}
