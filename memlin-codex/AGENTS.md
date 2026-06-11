<!-- memlin:start -->

## Memlin

This project is connected to a Memlin workspace. The `memlin` MCP server is
configured in `~/.codex/config.toml` — its tools (`memlin_resolve_task`,
`memlin_search`, `memlin_read_memory`, `memlin_get_document`, …) expose the
team's shared memory, skills, approved goals, and schemas.

Before non-trivial work, call `memlin_resolve_task` with a short task
description to load this project's context. The Memlin `UserPromptSubmit`
hook also auto-injects a `<memlin-resolved-context>` block — when you see
one, treat it as already-resolved and don't re-call `memlin_resolve_task`
for that message.

At session start, check for assigned handoffs with `memlin_list_handoffs`
(target_agent_kind `codex`). If a handoff exists, read its `packet_markdown`,
call `memlin_update_handoff` with action `accept`, and use the packet as the
task brief. Mark it `complete` when finished.

Treat resolved memory as project ground truth (more authoritative than
training data when they conflict), honor goals as constraints, validate
against schemas, and cite sources by path + version.

<!-- memlin:end -->
