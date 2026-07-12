# Memlin for the Codex CLI

The Memlin integration for **OpenAI Codex** — the `codex` command-line agent you
run in a terminal (not a desktop IDE or the ChatGPT Codex web tool). It brings
your team's shared memory, skills, and goals into every Codex session via an MCP
server, lifecycle hooks, an `AGENTS.md` section, and the `memlin` CLI.

> **Just want to install it?** Use the one-liner below — no git, no `bash`, no
> build step. See `INSTALL.txt` in this folder for the same steps in plain text.

## Install (recommended — no git required)

You need **Node.js 20+** and the **Codex CLI** (`npm install -g @openai/codex`).
Then run one line in your terminal:

**macOS / Linux** (Terminal):

```
curl -fsSL https://memlin.ai/install-codex.sh | bash
```

**Windows** (Command Prompt — not PowerShell):

```
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://memlin.ai/install-codex.ps1 | iex"
```

The installer downloads this bundle over HTTPS, places it at Codex's plugin
cache, and then wires Codex's real config layers (backing each up first, never
clobbering them):

- the MCP server → an absolute-`node` `[mcp_servers.memlin]` block in
  `~/.codex/config.toml`;
- the five lifecycle hooks through the native plugin's `hooks/hooks.json`.
  Codex asks the user to review and trust plugin hooks before they run. The
  no-git fallback installer still merges equivalent hooks into
  `~/.codex/hooks.json` because it bypasses native marketplace registration.

**When it finishes, it prints your exact next commands — copy them.** Unlike
Claude Code, Codex has no `/memlin-*` slash commands and the plugin is **not**
added to your PATH, so each command invokes the bundled CLI by path (e.g.
`node "<cache>/dist/cli/main.js" login`):

1. **Sign in** — run the printed `… main.js login` line. A browser opens; approve
   the device code.
2. **Restart Codex** completely so it loads the MCP server and hooks.
3. **Bind your repo** — `cd` into it and run the printed `… main.js add-project`
   line.
4. **Verify** — ask Codex to run the `memlin_resolve_task` tool, or run the
   `… main.js status` line — it should show `project: <name>`, not `none`.

> On macOS/Linux the installer also drops a `memlin` shortcut in `~/.local/bin`,
> so `memlin login` / `memlin add-project` work directly if that's on your PATH.
> On Windows, use the printed `node "…"` lines.

Re-run the installer any time to update — it repairs an older config in place
(including the legacy `/bin/sh` block) and re-points it at the current version.

> **Cross-platform note:** native plugin installs launch the MCP server with a
> small `node -e` bootstrap. Node resolves the user's home directory, builds the
> versioned plugin-cache path, converts it with `pathToFileURL`, and imports the
> server. It does not depend on `/bin/sh`, `$HOME` expansion, or a POSIX path, so
> the same bundle starts on Windows, macOS, and Linux. The no-git installer
> writes an equivalent resolved `node` entry into Codex's config.

## What this bundle ships

| File                     | Codex surface                                                      |
| ------------------------ | ------------------------------------------------------------------ |
| `.mcp.json`              | portable Node bootstrap for the bundled stdio MCP server           |
| `config.toml`            | reference MCP block (the installer writes a resolved one for you)  |
| `hooks/hooks.json`       | lifecycle hooks discovered by Codex's native plugin loader         |
| `AGENTS.md`              | a delimited Memlin section to merge into the project's `AGENTS.md` |
| `skills/memlin/SKILL.md` | the Memlin skill (resolver guidance + CLI reference)               |
| `dist/`                  | the bundled hooks, CLI commands, and MCP server                    |

## Hooks

- **`SessionStart`** — background plan sync + a Memlin status note via
  `hookSpecificOutput.additionalContext`.
- **`UserPromptSubmit`** — resolves Memlin context for the prompt and injects
  it via `hookSpecificOutput.additionalContext`.
- **`PostToolUse`** — pushes an edited plan file back to Memlin.
- **`Stop`** — heartbeat plus the debounced session scribe / turn-level memory
  extraction.

## No custom slash commands

Codex does not support custom slash commands. Memlin's workspace operations ship
instead as (a) the `memlin` CLI and (b) the `memlin` skill
(`skills/memlin/SKILL.md`), which documents every command so Codex can run the
right one on request.

## MCP authentication

The local stdio MCP server reads the Auth0 token written by `memlin login` to
`~/.config/memlin/token.json` and refreshes it the same way the Memlin CLI does.
`memlin_resolve_task` calls the hosted `/api/v1/resolve` endpoint so resolve
audit rows still record Codex, cwd, git remote, and the resolved project.

---

## For maintainers — building from source

> You do **not** need this to install the plugin. This section is only for
> Memlin developers regenerating the bundle from the `memlin-ai/memlin`
> monorepo. It will not work from inside this distributed bundle (there is no
> `scripts/` directory here, and it requires `bash`).

From a checkout of the monorepo:

```bash
bash scripts/build-codex-plugin.sh
```

This assembles `codex-plugin-out/` (a Codex marketplace root) from
`apps/codex-plugin` + `@memlin/plugin-core`, which is then published to the
public bundle repo the installers download.
