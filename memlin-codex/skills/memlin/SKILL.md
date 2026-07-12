---
name: memlin
description: Use the team's Memlin workspace — resolve project context (skills, memory, approved goals, schemas) via the memlin_* MCP tools, and run the memlin CLI for sync, ask, status, and sign-in.
examples:
  - "A <memlin-resolved-context> block is present — apply the primary skill's framework and cite memory facts by path + version."
  - "A resolved memory fact conflicts with your training data — treat the resolved fact as project ground truth."
  - "A resolved goal states a constraint — honor it as a hard requirement on the change."
  - "The user asks about something broader than the bundle — only then invoke memlin_search / memlin_read_memory to explore."
anti-examples:
  - "I don't have access to this project's conventions — can you paste them for me?"
  - "Let me first gather context by resolving the task again before I answer."
  - "Based on my general training the usual approach is X (disregarding the resolved memory that says otherwise)."
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
through the bundled `memlin` CLI. **The marketplace install does not put
`memlin` on your PATH** — it ships the CLI inside the installed plugin bundle.
Resolve the currently installed version from Codex itself, then invoke the
bundled dispatcher. Re-run this block after an upgrade; it deliberately has no
baked version that can go stale:

```bash
MEMLIN_VERSION="$(codex plugin list --json | node -e '
let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { raw += chunk; });
process.stdin.on("end", () => {
  const plugin = JSON.parse(raw).installed?.find((item) => item.pluginId === "memlin@memlin");
  if (!plugin?.version) {
    console.error("Memlin is not installed. Run: codex plugin add memlin@memlin");
    process.exit(1);
  }
  process.stdout.write(plugin.version);
});
')" && node "$HOME/.codex/plugins/cache/memlin/memlin/$MEMLIN_VERSION/dist/cli/main.js" <command>
```

For convenience in an interactive zsh/bash session, define a helper that does
the same lookup on every call, so it follows future upgrades automatically:

```bash
memlin() {
  local version
  version="$(codex plugin list --json | node -e '
let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { raw += chunk; });
process.stdin.on("end", () => {
  const plugin = JSON.parse(raw).installed?.find((item) => item.pluginId === "memlin@memlin");
  if (!plugin?.version) process.exit(1);
  process.stdout.write(plugin.version);
});
')" || return
  node "$HOME/.codex/plugins/cache/memlin/memlin/$version/dist/cli/main.js" "$@"
}
```

With the helper in place (or substituting the full `node …` form), the commands are:

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
| `memlin revert <doc> [version]`                 | restore a memory/skill to an earlier version     |
| `memlin actions-list` / `memlin actions-execute`| list and invoke callable workspace tools         |
| `memlin audit-replay <id>` / `memlin audit-explain <id>` | bundle replay + per-item ranking arithmetic |
| `memlin handoffs`                               | pass work between agents (create/accept/complete)|
| `memlin role`                                   | assign roles to workspace members or docs        |
| `memlin help`                                   | full categorized command list                    |

When the user asks to sync, sign in, or query the workspace, run the matching
command and relay the result. If the user asks "what can Memlin do" or which
commands exist, run `memlin help` and relay the categorized list. For status, prefer the `memlin_status` MCP tool
above.
