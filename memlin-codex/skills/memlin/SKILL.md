---
name: memlin
description: Use the team's Memlin workspace — resolve project context (skills, memory, approved goals, schemas) via the memlin_* MCP tools, and run the memlin CLI for sync, ask, status, and sign-in.
---

# Memlin

This workspace is connected to a Memlin workspace. Memlin gives Codex the
team's shared, scope-correct context and a CLI for managing it.

## Resolve context for a task

At session start, call **`memlin_list_handoffs`** with `target_agent_kind:
"codex"` to check for assigned work. If a handoff exists, read its
`packet_markdown`, call **`memlin_update_handoff`** with `action: "accept"`,
and use the packet as the task brief. Mark it `complete` when finished.

Before non-trivial work, call the **`memlin_resolve_task`** MCP tool with a
short description of the task. It returns a citation-bearing bundle: the top
skills, memory facts, approved goals, and schemas for this project. The
`UserPromptSubmit` hook also injects a `<memlin-resolved-context>` block —
when present, treat it as already-resolved.

Use the bundle as authoritative project context: apply the primary skill's
framework, treat memory facts as ground truth, honor goals as constraints,
validate against schemas, and cite sources by path + version. To explore
beyond the task, use `memlin_search`, `memlin_read_memory`, or
`memlin_get_document` directly.

## Status — use the `memlin_status` MCP tool

To report whether Memlin is wired up and current (auth/expiry, bound account +
project, MCP routing, last sync, pending local changes) call the
**`memlin_status`** MCP tool (no arguments) and relay its `summary` field. Do
NOT run a `memlin status` terminal command — the Codex plugin ships no `memlin`
binary on PATH; the bundled stdio MCP server answers status locally instead.

## The `memlin` CLI

Codex has no custom slash commands, so Memlin's other workspace operations run
through the bundled `memlin` CLI. **The plugin does not put `memlin` on your
PATH** — it ships the CLI inside the installed plugin bundle. Invoke it with
`node` and the bundled dispatcher (the same cache path the MCP server and hooks
use):

```bash
node "$HOME/.codex/plugins/cache/memlin/memlin/0.1.0/dist/cli/main.js" <command>
```

For convenience, define a one-time shell alias (add to `~/.zshrc` / `~/.bashrc`):

```bash
alias memlin='node "$HOME/.codex/plugins/cache/memlin/memlin/0.1.0/dist/cli/main.js"'
```

With the alias in place (or substituting the full `node …` form), the commands are:

| Command                                         | Purpose                                          |
| ----------------------------------------------- | ------------------------------------------------ |
| `memlin login`                                  | OAuth device-flow sign-in (run once per machine) |
| `memlin sync`                                   | full bidirectional sync (pull + push)            |
| `memlin pull` / `memlin push`                   | one-way memory/skill sync                        |
| `memlin ask "<question>"`                       | natural-language query with citations            |
| `memlin scribe`                                 | extract decisions/memories from this session     |
| `memlin inbox`                                  | review scribe proposals (`accept`/`reject <id>`) |
| `memlin pull-plans` / `memlin push-plan <file>` | plan sync                                        |
| `memlin add-project` / `memlin link`            | bind workspace to a project/account              |
| `memlin doctor`                                 | diagnose auth / connectivity / config            |

When the user asks to sync, sign in, or query the workspace, run the matching
command and relay the result. For status, prefer the `memlin_status` MCP tool
above.
