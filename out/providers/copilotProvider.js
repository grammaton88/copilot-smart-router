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
exports.resolveModel = resolveModel;
exports.resolveTierModels = resolveTierModels;
const vscode = __importStar(require("vscode"));
/**
 * Maps a configured model identifier (family name, part of id, etc.) to an actual
 * vscode.LanguageModelChat available from the Copilot vendor.
 */
async function resolveModel(modelIdentifier) {
    const models = await vscode.lm.selectChatModels({ vendor: "copilot" });
    // Try exact match on id first
    let model = models.find((m) => m.id === modelIdentifier);
    if (model)
        return model;
    // Try matching by family name (case-insensitive)
    model = models.find((m) => m.family?.toLowerCase() === modelIdentifier.toLowerCase() ||
        m.name?.toLowerCase() === modelIdentifier.toLowerCase());
    if (model)
        return model;
    // Partial match on id or name
    model = models.find((m) => m.id.toLowerCase().includes(modelIdentifier.toLowerCase()) ||
        m.name.toLowerCase().includes(modelIdentifier.toLowerCase()) ||
        (m.family &&
            m.family.toLowerCase().includes(modelIdentifier.toLowerCase())));
    return model;
}
/**
 * Resolves the three tier models and returns them.
 * Falls back to the first available model if a specific one isn't found.
 */
async function resolveTierModels(settings) {
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
