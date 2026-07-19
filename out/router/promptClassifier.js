"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeComplexity = analyzeComplexity;
/**
 * Heuristic prompt complexity analysis.
 * Uses keyword density, length, file references, and presence of multi-step instructions.
 */
function analyzeComplexity(prompt) {
    let score = 0;
    const lower = prompt.toLowerCase();
    // Very short, simple queries
    if (prompt.split(/\s+/).length < 10) {
        score += 0.1;
    }
    // Long prompts
    if (prompt.length > 500) {
        score += 0.3;
    }
    else if (prompt.length > 200) {
        score += 0.15;
    }
    // Keywords indicating complex tasks
    const complexKeywords = [
        "refactor",
        "architecture",
        "entire",
        "whole",
        "analyze",
        "restructure",
        "system",
        "design",
        "migrate",
        "breaking change",
        "multi-file",
        "across the codebase",
        "all occurrences",
        "performance",
        "optimize",
        "security",
        "audit",
        "deep",
        "complex",
    ];
    const matchCount = complexKeywords.filter((k) => lower.includes(k)).length;
    if (matchCount >= 3) {
        score += 0.4;
    }
    else if (matchCount >= 1) {
        score += 0.2;
    }
    // Presence of code blocks or file paths
    if (prompt.includes("```") ||
        prompt.includes("/src/") ||
        prompt.includes(".ts")) {
        score += 0.2;
    }
    // Questions about many items (lists)
    if ((prompt.match(/\b(all|every|each|multiple)\b/g) || []).length > 1) {
        score += 0.2;
    }
    // Very small edit or clarification
    const simpleKeywords = [
        "what is",
        "explain",
        "typo",
        "fix this line",
        "simple",
    ];
    if (simpleKeywords.some((k) => lower.includes(k))) {
        score -= 0.2;
    }
    return Math.min(Math.max(score, 0), 1);
}
