<!-- memlin:start -->

## Memlin

This project is connected to a Memlin workspace. The `memlin` MCP server is
configured in `~/.codex/config.toml` — its tools (`memlin_resolve_task`,
`memlin_search`, `memlin_read_memory`, `memlin_get_document`, …) expose the
team's shared memory, skills, approved goals, schemas, and decisions.

The Memlin `UserPromptSubmit` hook normally resolves non-trivial prompts. For
the current message, treat `<memlin-resolved-context>`,
`<memlin-stale-context>`, `<memlin-context-unchanged>`, and
`<memlin-context-pending>` as handled and do not call `memlin_resolve_task`
again. A pending marker means the same resolve is still running and will be
offered on the next turn. If no current marker is present and no applicable
Memlin bundle was inherited, call `memlin_resolve_task` once as a fallback.
Delegated agents reuse inherited context only when it applies to their task.
Other Memlin MCP tools remain available for exploration and explicit
operations.

At session start, check for assigned handoffs with `memlin_list_handoffs`
(target_agent_kind `codex`). If a handoff exists, read its `packet_markdown`,
call `memlin_update_handoff` with action `accept`, and use the packet as the
task brief. Mark it `complete` when finished.

Treat resolved memory as project ground truth (more authoritative than
training data when they conflict), honor approved goals and required/pinned
decisions as constraints, use other decisions as cited project context,
validate against schemas, and cite sources by path + version.

<!-- memlin:end -->
