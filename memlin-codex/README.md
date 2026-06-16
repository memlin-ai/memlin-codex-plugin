# @memlin/codex-plugin

The Memlin integration for OpenAI Codex (the Codex CLI) — sibling of the
Claude Code plugin (`apps/cli-plugin`) and the Cursor plugin
(`apps/cursor-plugin`). It shares the host-agnostic engine in
`@memlin/plugin-core`; this app holds only the Codex-specific surface.

## What it ships

| File                     | Codex surface                                                      |
| ------------------------ | ------------------------------------------------------------------ |
| `.mcp.json`              | the bundled local stdio MCP server                                 |
| `config.toml`            | equivalent manual MCP server block for `~/.codex/config.toml`      |
| `hooks.json`             | lifecycle hooks (`~/.codex/hooks.json` or `.codex/hooks.json`)     |
| `AGENTS.md`              | a delimited Memlin section to merge into the project's `AGENTS.md` |
| `skills/memlin/SKILL.md` | the Memlin skill (resolver guidance + CLI reference)               |
| `src/hooks/*.ts`         | hook entrypoints                                                   |

## Hooks

- **`SessionStart`** — background plan sync + a Memlin status note via
  `hookSpecificOutput.additionalContext`.
- **`UserPromptSubmit`** — resolves Memlin context for the prompt and injects
  it via `hookSpecificOutput.additionalContext` (Codex's documented
  per-prompt context-injection field).
- **`PostToolUse`** — pushes an edited plan file back to Memlin. The exact
  PostToolUse payload schema for file-editing tools is still being confirmed
  against the Codex docs; the hook reads the expected fields and no-ops
  cleanly if they are absent.
- **`Stop`** — heartbeat plus the debounced session scribe / turn-level
  memory extraction, via the shared handler in `@memlin/plugin-core`.

## No custom slash commands

Codex does not support custom slash commands. Memlin's 15 workspace
operations are delivered instead as (a) the `memlin` CLI and (b) the
`memlin` skill (`skills/memlin/SKILL.md`), which documents every command so
Codex can run the right one on request.

## Install (interim)

Install from the generated Codex marketplace:

```bash
bash scripts/build-codex-plugin.sh
codex plugin add memlin@memlin
# The plugin does NOT put `memlin` on PATH — sign in via the bundled CLI:
node "$HOME/.codex/plugins/cache/memlin/memlin/0.1.0/dist/cli/login.js"
```

The plugin ships the `memlin` CLI inside the installed bundle rather than on
PATH. For routine status checks, prefer the `memlin_status` MCP tool; for other
CLI commands, invoke `node "$HOME/.codex/plugins/cache/memlin/memlin/0.1.0/dist/cli/main.js" <command>`
or define `alias memlin='node "$HOME/.codex/plugins/cache/memlin/memlin/0.1.0/dist/cli/main.js"'`
(see `skills/memlin/SKILL.md`).

Enable Codex hooks in `~/.codex/config.toml`:

```toml
[features]
hooks = true
```

Then start a new Codex session and review/trust the Memlin hooks from
`/hooks` if Codex prompts for hook review. Existing threads do not hot-load
newly installed MCP servers or newly enabled lifecycle hooks.

The plugin-managed `.mcp.json` starts the bundled stdio MCP server through
`$HOME/.codex/plugins/cache/memlin/memlin/0.1.0` while preserving Codex's
workspace cwd for audit metadata. Lifecycle hook commands also resolve the
installed bundle through that cache path because hooks run from the workspace
cwd.

## MCP authentication

The local stdio MCP server reads the Auth0 token written by `memlin login` to
`~/.config/memlin/token.json` and refreshes it the same way the Memlin CLI
does. `memlin_resolve_task` calls the hosted `/api/v1/resolve` endpoint so
resolve audit rows still record Codex, cwd, git remote, and the resolved
project.
