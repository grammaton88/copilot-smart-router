# Copilot Smart Router

A VS Code chat extension that automatically routes your prompts to the best GitHub Copilot model based on complexity, context size, and conversation stage. It can also intelligently attach your workspace files to the model’s context when you ask about your project.

## Features

- **Three model tiers**: fast, balanced, powerful – configure which Copilot model goes where.
- **Automatic complexity analysis**: keyword‑based scoring decides the tier.
- **Conversation awareness**: new conversations start with a capable model, follow‑ups become cheaper.
- **Workspace context injection**: let the model “see” your code when needed.
- **Optional token saving**: long conversations are summarised to reduce token usage.

### Workspace Context

By default, the router attaches relevant project files only when your prompt hints at it (e.g., “analyze this codebase”, “explain the architecture”). This gives the model actual source code to work with, without wasting tokens on every small query.

**Modes:**

- **`smart`** (default) – only attaches workspace files when the prompt contains words like _project_, _codebase_, _entire_, _workspace_, _repository_, etc.
- **`always`** – attaches a representative snapshot of your workspace on every `@smart` request.
- **`never`** – no files are attached (original behavior).

**What gets attached:**

- The first 50 files (content truncated to 4,000 characters each).
- For larger projects, a list of all other files (just names).
- Automatically skips `node_modules`, `.git`, build outputs, and respects `.gitignore`.

## Usage

1. Open VS Code Chat (`Ctrl+Shift+I` / `Cmd+Shift+I`).
2. Type `@smart` followed by your prompt.
3. The extension will:
   - Display the chosen tier and model name.
   - Attach workspace files if the mode allows it and your prompt triggers the condition.
   - Send the prompt to the selected model.
   - Keep track of the conversation for smarter future routing.

## Configuration

| Setting                                  | Default       | Description                                                |
| ---------------------------------------- | ------------- | ---------------------------------------------------------- |
| `aiRouter.fastModel`                     | `GPT-5 mini`  | Model for simple queries                                   |
| `aiRouter.balancedModel`                 | `Raptor mini` | Model for normal tasks                                     |
| `aiRouter.powerfulModel`                 | `GPT-5.5`     | Model for complex/initial tasks                            |
| `aiRouter.complexityThreshold`           | `0.6`         | Score above which a more powerful model is used            |
| `aiRouter.tokenLimitBeforeSummarization` | `80000`       | Token estimate before auto‑summarisation                   |
| `aiRouter.enableAutoSummarization`       | `true`        | Enable conversation summarisation                          |
| `aiRouter.workspaceContextMode`          | `smart`       | When to attach workspace files: `smart`, `always`, `never` |

## Build & Run

```bash
npm install
npm run compile
```

Then press `F5` in VS Code to launch a new Extension Development Host.
