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

## The `memlin` CLI

Codex has no custom slash commands, so Memlin's workspace operations run
through the `memlin` CLI in the terminal:

| Command                                         | Purpose                                          |
| ----------------------------------------------- | ------------------------------------------------ |
| `memlin login`                                  | OAuth device-flow sign-in (run once per machine) |
| `memlin status`                                 | auth, bound account + project, sync state        |
| `memlin sync`                                   | full bidirectional sync (pull + push)            |
| `memlin pull` / `memlin push`                   | one-way memory/skill sync                        |
| `memlin ask "<question>"`                       | natural-language query with citations            |
| `memlin scribe`                                 | extract decisions/memories from this session     |
| `memlin inbox`                                  | review scribe proposals (`accept`/`reject <id>`) |
| `memlin pull-plans` / `memlin push-plan <file>` | plan sync                                        |
| `memlin add-project` / `memlin link`            | bind workspace to a project/account              |
| `memlin doctor`                                 | diagnose auth / connectivity / config            |

When the user asks to sync, sign in, query the workspace, or check Memlin
status, run the matching command and relay the result.
