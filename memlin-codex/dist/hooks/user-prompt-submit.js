#!/usr/bin/env node
import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);
import { fileURLToPath as __ftp } from 'node:url'; import { dirname as __dn } from 'node:path';
const __filename = __ftp(import.meta.url); const __dirname = __dn(__filename);

// apps/codex-plugin/src/hooks/user-prompt-submit.ts
import { promises as fs4 } from "node:fs";
import { randomUUID } from "node:crypto";
import os5 from "node:os";
import path6 from "node:path";
import { fileURLToPath } from "node:url";

// apps/codex-plugin/src/hook-io.ts
function readHookInput() {
  return new Promise((resolve) => {
    let data = "";
    const done = () => {
      try {
        resolve(data.trim() ? JSON.parse(data) : null);
      } catch {
        resolve(null);
      }
    };
    const timer = setTimeout(done, 1e3);
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => {
      clearTimeout(timer);
      done();
    });
    process.stdin.on("error", () => {
      clearTimeout(timer);
      done();
    });
  });
}

// packages/plugin-core/dist/state.js
import { promises as fs2 } from "node:fs";
import path2 from "node:path";
import os from "node:os";
import crypto from "node:crypto";

// packages/plugin-core/dist/atomic-rename.js
import { promises as fs } from "node:fs";
import path from "node:path";
var RETRYABLE_CODES = /* @__PURE__ */ new Set(["EPERM", "EACCES", "EBUSY"]);
var MAX_ATTEMPTS = 10;
var BASE_DELAY_MS = 10;
var MAX_DELAY_MS = 100;
var renameQueues = /* @__PURE__ */ new Map();
async function renameWithRetry(from, to, rename) {
  for (let attempt = 1; ; attempt++) {
    try {
      await rename(from, to);
      return;
    } catch (error) {
      const code = error.code;
      if (attempt >= MAX_ATTEMPTS || !code || !RETRYABLE_CODES.has(code)) throw error;
      const cap = Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS);
      const delay = cap / 2 + Math.random() * (cap / 2);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
async function atomicRename(from, to, dependencies = {}) {
  const rename = dependencies.rename ?? fs.rename;
  const queueKey = path.resolve(to);
  const previous = renameQueues.get(queueKey) ?? Promise.resolve();
  const run = previous.catch(() => void 0).then(() => renameWithRetry(from, to, rename));
  renameQueues.set(queueKey, run);
  try {
    await run;
  } finally {
    if (renameQueues.get(queueKey) === run) renameQueues.delete(queueKey);
  }
}

// packages/plugin-core/dist/state.js
var STATE_FILE = path2.join(os.homedir(), ".config", "memlin", "state.json");
var MAX_LAST_RESOLVE_SESSIONS = 32;
var EMPTY = { documents: {} };
async function readState() {
  try {
    const raw = await fs2.readFile(STATE_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return { ...EMPTY };
  }
}
async function writeState(state) {
  await fs2.mkdir(path2.dirname(STATE_FILE), { recursive: true });
  const tmp = `${STATE_FILE}.${process.pid}.tmp`;
  await fs2.writeFile(tmp, JSON.stringify(state, null, 2), "utf8");
  await atomicRename(tmp, STATE_FILE);
}
var LOCK_DIR = `${STATE_FILE}.lock`;
var LOCK_STALE_MS = 2e3;
var LOCK_WAIT_MS = 2e3;
var LOCK_RETRY_MS = 50;
async function acquireStateLock() {
  const deadline = Date.now() + LOCK_WAIT_MS;
  for (; ; ) {
    try {
      await fs2.mkdir(LOCK_DIR);
      return true;
    } catch {
      try {
        const stat = await fs2.stat(LOCK_DIR);
        if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
          await fs2.rmdir(LOCK_DIR).catch(() => {
          });
          continue;
        }
      } catch {
        continue;
      }
      if (Date.now() >= deadline) return false;
      await new Promise((r) => setTimeout(r, LOCK_RETRY_MS));
    }
  }
}
async function releaseStateLock() {
  await fs2.rmdir(LOCK_DIR).catch(() => {
  });
}
async function updateState(mutate) {
  const locked = await acquireStateLock();
  try {
    const state = await readState();
    await mutate(state);
    await writeState(state);
    return state;
  } finally {
    if (locked) await releaseStateLock();
  }
}
function getLastResolveForSession(state, sessionId) {
  if (sessionId) {
    return state.last_resolves?.[sessionId] ?? (state.last_resolve?.session_id === sessionId ? state.last_resolve : void 0);
  }
  return state.last_resolve?.session_id ? void 0 : state.last_resolve;
}
function cacheLastResolve(state, entry) {
  state.last_resolve = entry;
  if (!entry.session_id) return;
  state.last_resolves ??= {};
  state.last_resolves[entry.session_id] = entry;
  const entries = Object.entries(state.last_resolves);
  if (entries.length <= MAX_LAST_RESOLVE_SESSIONS) return;
  entries.sort(([, a], [, b]) => b.resolved_at - a.resolved_at).slice(MAX_LAST_RESOLVE_SESSIONS).forEach(([sessionId]) => {
    delete state.last_resolves?.[sessionId];
  });
}
async function recordLastResolve(entry) {
  try {
    await updateState((state) => {
      cacheLastResolve(state, entry);
    });
  } catch {
  }
}
async function markLastResolveDelivered(input) {
  if (!input.auditId) return;
  try {
    await updateState((state) => {
      const entry = getLastResolveForSession(state, input.sessionId);
      if (entry?.audit_id !== input.auditId || entry.host !== input.host || entry.cwd !== input.cwd) {
        return;
      }
      entry.delivered = true;
      if (state.last_resolve?.audit_id === input.auditId && state.last_resolve.session_id === entry.session_id) {
        state.last_resolve.delivered = true;
      }
    });
  } catch {
  }
}

// packages/plugin-core/dist/deploy-broker.js
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import os2 from "node:os";
import path3 from "node:path";
function deployWaiterDir() {
  const override = process.env.MEMLIN_DEPLOY_WAITER_DIR?.trim();
  if (override) return override;
  return path3.join(os2.homedir(), ".config", "memlin", "deploy-waiters");
}
function waiterPath(sessionId) {
  const safe = sessionId.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 180);
  return path3.join(deployWaiterDir(), `${safe}.json`);
}
function clearLocalDeployWaiter(sessionId) {
  try {
    unlinkSync(waiterPath(sessionId));
  } catch {
  }
}
function readLocalDeployWaiter(sessionId) {
  try {
    const raw = readFileSync(waiterPath(sessionId), "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.session_id !== "string") return null;
    if (parsed.session_id !== sessionId) return null;
    if (parsed.status !== "waiting" && parsed.status !== "ready") return null;
    const expiresAt = parsed.expires_at ? new Date(parsed.expires_at).getTime() : new Date(parsed.queued_at).getTime() + 60 * 60 * 1e3;
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      clearLocalDeployWaiter(sessionId);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
function hasPendingDeployWaiter(sessionId) {
  if (!sessionId) return false;
  if (!existsSync(waiterPath(sessionId))) return false;
  return readLocalDeployWaiter(sessionId) != null;
}

// packages/plugin-core/dist/continuity.js
var CONTINUITY_WINDOW_MS = 10 * 60 * 1e3;
function bundleHasContinuityContent(bundle) {
  const claims = bundle.claim_guardrails;
  return Boolean(bundle.primary_skill) || bundle.supporting_skills.length > 0 || bundle.memory.length > 0 || bundle.goals.length > 0 || bundle.schemas.length > 0 || (bundle.decisions?.length ?? 0) > 0 || (bundle.required_core?.length ?? 0) > 0 || (bundle.pinned?.length ?? 0) > 0 || (bundle.session_working?.length ?? 0) > 0 || (bundle.open_threads?.length ?? 0) > 0 || (bundle.pack_context?.length ?? 0) > 0 || (claims?.approved.length ?? 0) > 0 || (claims?.blocked.length ?? 0) > 0 || (claims?.competitor_facts.length ?? 0) > 0;
}
var CONTINUATION_PATTERNS = [
  /^\s*(and|also|then|now|next|plus|but|or|so)\b(?=\s+\S)/i,
  /^\s*(what about|how about|tell me more|go on|continue|keep going)\b/i,
  /^\s*(explain|show me|expand|elaborate)\s+(that|this|it|the|more)\b/i,
  /^\s*(yes|yeah|yep|ok|okay|sure|right|sounds good)[,;:]?\s+(now|and|so|continue|keep|do|ship|merge|apply|proceed)\b/i,
  /^\s*(can you|could you)\s+(also|now|then|continue|elaborate)\b/i,
  /^\s*(can|could|would|will)\s+you\s+(please\s+)?(do|fix|change|update|ship|merge|apply|open|show|explain|retry|run|test)\s+(it|that|this|them|those|these)\b/i,
  /^\s*(do|fix|change|update|ship|merge|apply|open|show|explain|expand|remove|delete|revert|retry|run|test|review|check)\s+(it|that|this|them|those|these|the same)\b/i,
  /^\s*(go ahead|please do|do it|ship it|merge it|apply it|try again|same (for|with)|one more time)\b/i,
  /^\s*(why|how|how so|where|when|what next|which one|show me|more)\s*[?.!]*$/i,
  /^\s*(the (first|second|third|last|other) one|option\s+(one|two|three|[1-3]))\s*[?.!]*$/i,
  /^\s*(actually|instead|rather|to clarify|i mean|correction:)\b/i,
  /^\s*(here(?:'s| is) (the|that|it|what)|here you go)\b/i,
  /\b(the one|that|those|these)\b.*\?$/i
];
var IGNORABLE_PROMPT_PATTERNS = [
  /^\s*(hi|hey|hello|yo|sup|thanks?|thx|ty|ok|okay|cool|nice|got it|sounds good)[!.\s]*$/i,
  /^\s*(yes|no|yep|nope|sure|maybe|idk)[!.\s]*$/i,
  /^\s*\/[a-z-]+(?:\s|$)/i,
  // slash commands are handled by the host/agent
  /^\s*[<>][a-z]/i
  // partial host tags / XML envelopes
];
function isIgnorablePrompt(prompt) {
  const trimmed = prompt.trim();
  if (!trimmed) return true;
  return IGNORABLE_PROMPT_PATTERNS.some((re) => re.test(trimmed));
}
function isContinuation(prompt, cwd, host, last, sessionId) {
  if (last.host !== host) return false;
  if ((sessionId ?? null) !== (last.session_id ?? null)) return false;
  if (last.delivered === false) return false;
  if (last.cwd !== cwd) return false;
  if (Date.now() - last.resolved_at > CONTINUITY_WINDOW_MS) return false;
  if (!last.had_content) return false;
  const trimmed = prompt.trim();
  for (const re of CONTINUATION_PATTERNS) {
    if (re.test(trimmed)) return true;
  }
  return false;
}
function continuationForPrompt(state, prompt, cwd, host, sessionId) {
  if (hasPendingDeployWaiter(sessionId)) return null;
  const last = getLastResolveForSession(state, sessionId);
  return last && isContinuation(prompt, cwd, host, last, sessionId) ? last : null;
}
function buildContinuityMarker(auditId) {
  return [
    "<memlin-context-unchanged>",
    `# This turn is a follow-up to the prior turn. The same Memlin context applies.`,
    `# Refer to the bundle injected on the previous turn (audit_id: ${auditId}).`,
    "# Do not invoke memlin_resolve_task automatically for this follow-up.",
    "</memlin-context-unchanged>"
  ].join("\n");
}

// packages/plugin-core/dist/pending-bundle.js
import { spawn } from "node:child_process";
import crypto2 from "node:crypto";
import { promises as fs3 } from "node:fs";
import path4 from "node:path";
import os3 from "node:os";
var PENDING_BUNDLE_MAX_AGE_MS = 10 * 60 * 1e3;
function pendingBundlePath() {
  return process.env.MEMLIN_RESOLVE_OUT ?? path4.join(os3.homedir(), ".config", "memlin", "pending-bundle.json");
}
var PENDING_BUNDLE_DIR = "pending-bundles";
function pendingBundleSpoolDir() {
  return process.env.MEMLIN_PENDING_BUNDLE_DIR ?? path4.join(os3.homedir(), ".config", "memlin", PENDING_BUNDLE_DIR);
}
function pendingBundleKey(cwd, host, sessionId, task) {
  return crypto2.createHash("sha256").update(JSON.stringify([cwd, host, sessionId ?? null, task])).digest("hex");
}
function canonicalPendingBundlePathFor(cwd, host, sessionId, task) {
  return path4.join(pendingBundleSpoolDir(), `${pendingBundleKey(cwd, host, sessionId, task)}.json`);
}
function pendingBundleTurnIndexPath(cwd, host, sessionId) {
  const key = crypto2.createHash("sha256").update(JSON.stringify([cwd, host, sessionId ?? null])).digest("hex");
  return path4.join(pendingBundleSpoolDir(), `turn-${key}.json`);
}
function pendingBundlePathFor(cwd, host, sessionId, task) {
  return process.env.MEMLIN_RESOLVE_OUT ?? canonicalPendingBundlePathFor(cwd, host, sessionId, task);
}
async function takePendingBundle(cwd, host, match) {
  const explicitFile = process.env.MEMLIN_RESOLVE_OUT;
  const spoolDir = pendingBundleSpoolDir();
  let files;
  if (explicitFile) {
    files = [explicitFile];
  } else if (match?.task !== void 0) {
    files = [pendingBundlePathFor(cwd, host, match.sessionId ?? null, match.task)];
  } else {
    const indexFile = pendingBundleTurnIndexPath(cwd, host, match?.sessionId ?? null);
    try {
      const parsed = JSON.parse(await fs3.readFile(indexFile, "utf8"));
      files = /^[a-f0-9]{64}\.json$/.test(parsed.file ?? "") ? [path4.join(spoolDir, parsed.file)] : [];
    } catch {
      files = [];
    }
    files.push(pendingBundlePath());
  }
  const matches = [];
  for (const file of [...new Set(files)]) {
    let bundle;
    try {
      await fs3.chmod(file, 384).catch(() => {
      });
      bundle = JSON.parse(await fs3.readFile(file, "utf8"));
    } catch {
      continue;
    }
    if (typeof bundle !== "object" || bundle === null || typeof bundle.rendered !== "string" || bundle.rendered.length === 0 || typeof bundle.completed_at !== "number") {
      await fs3.rm(file, { force: true }).catch(() => {
      });
      continue;
    }
    if (Date.now() - bundle.completed_at > PENDING_BUNDLE_MAX_AGE_MS) {
      await fs3.rm(file, { force: true }).catch(() => {
      });
      continue;
    }
    if (bundle.cwd !== cwd || bundle.host !== host) continue;
    if ((bundle.session_id ?? null) !== (match?.sessionId ?? null)) {
      continue;
    }
    if (match?.task !== void 0 && bundle.task !== match.task) continue;
    matches.push({ file, bundle });
  }
  matches.sort((a, b) => b.bundle.completed_at - a.bundle.completed_at);
  const selected = matches[0];
  if (!selected) return null;
  const claimed = `${selected.file}.${process.pid}.${Date.now()}.claim`;
  try {
    await fs3.rename(selected.file, claimed);
    await fs3.chmod(claimed, 384).catch(() => {
    });
  } catch {
    return null;
  }
  if (!explicitFile) {
    const indexFile = pendingBundleTurnIndexPath(cwd, host, match?.sessionId ?? null);
    try {
      const pointer = JSON.parse(await fs3.readFile(indexFile, "utf8"));
      if (pointer.file === path4.basename(selected.file)) {
        await fs3.rm(indexFile, { force: true });
      }
    } catch {
    }
  }
  if (match?.task === void 0) {
    await Promise.all(
      matches.slice(1).map(({ file }) => fs3.rm(file, { force: true }).catch(() => void 0))
    );
  }
  await fs3.rm(claimed, { force: true }).catch(() => {
  });
  return selected.bundle;
}
var DEFAULT_RESOLVE_BUDGET_MS = 6e3;
function resolveBudgetMs(defaultMs = DEFAULT_RESOLVE_BUDGET_MS) {
  const v = Number(process.env.MEMLIN_RESOLVE_BUDGET_MS);
  const fallback = Number.isFinite(defaultMs) && defaultMs >= 1e3 ? Math.floor(defaultMs) : DEFAULT_RESOLVE_BUDGET_MS;
  return Number.isFinite(v) && v >= 1e3 ? Math.floor(v) : fallback;
}
function runResolveWithBudget(opts) {
  const budget = opts.budgetMs ?? resolveBudgetMs();
  const outputFile = pendingBundlePathFor(opts.cwd, opts.host, opts.sessionId ?? null, opts.task);
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(process.execPath, [opts.resolveBin, opts.task], {
        windowsHide: true,
        cwd: opts.cwd,
        env: {
          ...process.env,
          MEMLIN_HOST: opts.host,
          // Handoff contract with cli/resolve.ts: write the compiled bundle
          // to this file (atomic), and report a resolve.delivery telemetry
          // row when the deadline was missed.
          MEMLIN_RESOLVE_OUT: outputFile,
          MEMLIN_RESOLVE_DEADLINE_MS: String(budget),
          // Forward the agent's session id so the resolve's usage_event is
          // attributable to this session (concurrent-work awareness).
          ...opts.sessionId ? { MEMLIN_SESSION_ID: opts.sessionId } : {},
          ...opts.turnId ? { MEMLIN_TURN_ID: opts.turnId } : {}
        },
        // Detached + no shared stdio: when the caller stops waiting, the
        // child owns its own lifetime and finishes in the background.
        detached: true,
        stdio: "ignore"
      });
    } catch {
      resolve({ bundle: null, stillRunning: false });
      return;
    }
    let settled = false;
    let claimInFlight = null;
    const claimBundle = () => {
      if (claimInFlight) return claimInFlight;
      claimInFlight = takePendingBundle(opts.cwd, opts.host, {
        sessionId: opts.sessionId ?? null,
        task: opts.task
      }).finally(() => {
        claimInFlight = null;
      });
      return claimInFlight;
    };
    const settleFromBundle = async () => {
      const bundle = await claimBundle();
      if (!bundle || settled) return false;
      settled = true;
      clearTimeout(timer);
      clearInterval(bundlePoll);
      child.unref();
      resolve({ bundle, stillRunning: false });
      return true;
    };
    const timer = setTimeout(() => {
      if (settled) return;
      clearInterval(bundlePoll);
      void claimBundle().then((bundle) => {
        if (settled) return;
        settled = true;
        child.unref();
        resolve(bundle ? { bundle, stillRunning: false } : { bundle: null, stillRunning: true });
      });
    }, budget);
    const bundlePoll = setInterval(() => {
      if (!settled) void settleFromBundle();
    }, 40);
    child.on("exit", () => {
      if (settled) return;
      void settleFromBundle().then((found) => {
        if (found || settled) return;
        settled = true;
        clearTimeout(timer);
        clearInterval(bundlePoll);
        resolve({ bundle: null, stillRunning: false });
      });
    });
    child.on("error", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(bundlePoll);
      resolve({ bundle: null, stillRunning: false });
    });
  });
}
function buildLateDeliveryEnvelope(bundle, opts = {}) {
  return [
    "<memlin-late-context>",
    "# Memlin context resolved for the PREVIOUS prompt \u2014 it finished after that",
    `# turn's delivery deadline. It is not fresh context for the current prompt.`,
    ...bundle.stale ? [
      `# ADDITIONALLY: the backend was unreachable (${bundle.stale.reason}) \u2014 this is a STALE`,
      "# fallback bundle, not a live resolve. Weigh it accordingly."
    ] : [],
    opts.currentResolvePending ? "# Treat as background context. The current prompt resolve is already in flight; do not invoke memlin_resolve_task again." : "# Treat as background context; invoke memlin_resolve_task if this turn needs fresh context.",
    "",
    bundle.rendered,
    "</memlin-late-context>"
  ].join("\n");
}
function buildPendingContextEnvelope() {
  return [
    "<memlin-context-pending>",
    "# Memlin is still resolving context for THIS prompt in the background.",
    "# Codex will inject full enrichment at the next safe point; if this turn ends first,",
    "# the persisted result remains available to the next invocation.",
    "# Do not invoke memlin_resolve_task for this message; that would duplicate the same resolve.",
    "</memlin-context-pending>"
  ].join("\n");
}
function buildProgressiveDeliveryEnvelope(phase, rendered, hookResolveRef) {
  const phaseLine = phase === "hot" ? "# FAST: honor required/pinned context; semantic enrichment follows." : "# ENRICHMENT: documents delivered in FAST are omitted.";
  return [
    `<memlin-resolved-context phase="${phase}">`,
    phaseLine,
    "# Canonical for this turn; do not call memlin_resolve_task again.",
    ...hookResolveRef ? [`<!-- memlin-resolve-ref: ${hookResolveRef} -->`] : [],
    "",
    rendered.trim(),
    "</memlin-resolved-context>"
  ].join("\n");
}
function buildResolveFailedEnvelope(failure) {
  const detail = failure?.message?.replace(/\s+/g, " ").slice(0, 180);
  return [
    "<memlin-context-pending>",
    "# Memlin could not complete this turn\u2019s context resolve.",
    ...detail ? [`# ${detail}`] : [],
    failure?.retryable ? "# The operation may be retried on a later turn; do not duplicate it through MCP now." : "# The operation was rejected deterministically; do not duplicate it through MCP.",
    "</memlin-context-pending>"
  ].join("\n");
}
function boundAdditionalContextForHook(additionalContext, options) {
  const outputBytes = Buffer.byteLength(additionalContext, "utf8");
  if (outputBytes <= options.maxBytes) {
    return { context: additionalContext, capped: false, outputBytes };
  }
  const context = buildResolveFailedEnvelope({
    message: `Memlin ${options.label} context exceeded the safe hook envelope; its required content was not delivered.`,
    retryable: true
  });
  const degradedBytes = Buffer.byteLength(context, "utf8");
  if (degradedBytes > options.maxBytes) {
    throw new Error("degraded hook marker exceeds its UTF-8 byte budget");
  }
  return { context, capped: true, outputBytes: degradedBytes };
}
function buildInlineDeliveryEnvelope(bundle) {
  if (bundle.stale) {
    return [
      "<memlin-stale-context>",
      `# Memlin backend unreachable (${bundle.stale.reason}) \u2014 this is the LAST SUCCESSFUL bundle`,
      "# for this project, not a live resolve. Treat as possibly out of date; retry",
      "# memlin_resolve_task later for fresh context. Memory writes are unavailable.",
      "",
      bundle.rendered,
      "</memlin-stale-context>"
    ].join("\n");
  }
  return [
    "<memlin-resolved-context>",
    "# Auto-resolved by Memlin \u2014 authoritative project context. Apply skills; honor",
    "# approved goals and required/pinned decisions/directives; use other decisions as cited",
    "# context; validate schemas; cite sources; do not re-invoke memlin_resolve_task.",
    "",
    bundle.rendered,
    "</memlin-resolved-context>"
  ].join("\n");
}

// packages/plugin-core/dist/scribe-notice.js
function count(value) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
function buildScribeNotice(capturedValue, pendingValue) {
  const captured = count(capturedValue);
  if (captured === 0) return "";
  const pending = Math.min(captured, count(pendingValue ?? captured));
  const handled = captured - pending;
  const proposalLabel = captured === 1 ? "proposal" : "proposals";
  const reviewLabel = pending === 1 ? "needs" : "need";
  let status;
  if (pending === 0) {
    status = `Memlin auto-captured ${captured} new ${proposalLabel} and handled ${captured === 1 ? "it" : "them"} automatically; no inbox review is needed for this batch.`;
  } else if (handled === 0) {
    status = `Memlin auto-captured ${captured} new ${proposalLabel}; ${pending} ${reviewLabel} review with /memlin-inbox.`;
  } else {
    status = `Memlin auto-captured ${captured} new ${proposalLabel}; ${handled} handled automatically and ${pending} ${reviewLabel} review with /memlin-inbox.`;
  }
  return [
    "<memlin-notice>",
    "# Status line for the user \u2014 surface it, do not act on it.",
    status,
    "</memlin-notice>",
    ""
  ].join("\n");
}
async function takeScribeNotice(currentSessionId) {
  let state;
  try {
    state = await readState();
  } catch {
    return "";
  }
  const notice = state.scribe_notice;
  const n = notice?.unsurfaced ?? 0;
  if (n <= 0) return "";
  try {
    delete state.scribe_notice;
    await writeState(state);
  } catch {
  }
  if (currentSessionId && notice?.session_id && notice.session_id !== currentSessionId) {
    return "";
  }
  return buildScribeNotice(n, notice?.pending);
}
async function takeCorrectionNotice(currentSessionId) {
  let state;
  try {
    state = await readState();
  } catch {
    return "";
  }
  const notice = state.correction_notice;
  if (!notice || !notice.rule_title) return "";
  try {
    delete state.correction_notice;
    await writeState(state);
  } catch {
  }
  if (currentSessionId && notice.session_id && notice.session_id !== currentSessionId) {
    return "";
  }
  return [
    "<memlin-notice>",
    "# Status line for the user \u2014 surface it, do not act on it.",
    `\u26A1 Memlin captured a correction \u2192 rule: "${notice.rule_title}". It's active now; review or undo with /memlin-inbox.`,
    "</memlin-notice>",
    ""
  ].join("\n");
}

// packages/plugin-core/dist/runtime-shared.js
async function closeHttpSockets() {
  try {
    const dispatcher = globalThis[/* @__PURE__ */ Symbol.for("undici.globalDispatcher.1")];
    if (dispatcher && typeof dispatcher.close === "function") {
      let timer;
      await Promise.race([
        dispatcher.close(),
        new Promise((resolve) => {
          timer = setTimeout(resolve, 250);
          timer.unref?.();
        })
      ]).finally(() => {
        if (timer !== void 0) clearTimeout(timer);
      });
    }
  } catch {
  }
}

// packages/plugin-core/dist/hook-exit.js
var HOOK_WATCHDOG_MS = 2e3;
function releaseStdin() {
  try {
    const stdin = process.stdin;
    stdin.pause();
    stdin.unref?.();
  } catch {
  }
}
function exitHook(code) {
  process.exitCode = code;
  releaseStdin();
  void closeHttpSockets();
  setTimeout(() => process.exit(), HOOK_WATCHDOG_MS).unref();
}

// packages/plugin-core/dist/companion-client.js
import http from "node:http";
import crypto3 from "node:crypto";
import os4 from "node:os";
import path5 from "node:path";
var COMPANION_PROTOCOL = 1;
var MIN_COMPANION_PROTOCOL = 1;
var MAX_COMPANION_PROTOCOL = 1;
var NO_COMPANION_ENV = "MEMLIN_NO_DAEMON";
var IS_COMPANION_ENV = "MEMLIN_DAEMON";
var COMPANION_SOCKET_ENV = "MEMLIN_COMPANION_SOCKET";
function companionSocketPath(env = process.env) {
  const override = env[COMPANION_SOCKET_ENV];
  if (override) return override;
  if (process.platform === "win32") {
    return `\\\\.\\pipe\\memlin-companion-${os4.userInfo().username}`;
  }
  return path5.join(os4.homedir(), ".config", "memlin", "run", "companion.sock");
}
var CODEX_ADDITIONAL_CONTEXT_MAX_BYTES = 2200;
var CONNECT_TIMEOUT_MS = 150;
var DEFAULT_CALL_TIMEOUT_MS = 1e3;
var CALL_TIMEOUTS = {
  "workspace.resolve": 2e3,
  "resolve.start": 750,
  "resolve.reuse": 4500,
  "resolve.reserve": 750,
  "resolve.reserve-late": 750,
  "resolve.commit": 750,
  "resolve.release": 500,
  "resolve.report": 500,
  "sync.now": 5e3,
  "login.start": 1e4,
  // Local-store reads walk the materialized doc tree on disk.
  "memory.search": 2e3,
  "memory.read": 2e3
};
var socketDeadUntil = 0;
var SOCKET_DEAD_TTL_MS = 5e3;
function companionDisabled(env = process.env) {
  const off = env[NO_COMPANION_ENV];
  if (off === "1" || off === "true" || off === "yes") return true;
  return env[IS_COMPANION_ENV] === "1";
}
async function companionRequest(method, body, opts = {}) {
  const env = opts.env ?? process.env;
  if (companionDisabled(env)) return null;
  if (Date.now() < socketDeadUntil) return null;
  const timeoutMs = opts.timeoutMs ?? CALL_TIMEOUTS[method] ?? DEFAULT_CALL_TIMEOUT_MS;
  const payload = JSON.stringify(body ?? {});
  return new Promise((resolve) => {
    let settled = false;
    const fail = (markDead) => {
      if (settled) return;
      settled = true;
      if (markDead) socketDeadUntil = Date.now() + SOCKET_DEAD_TTL_MS;
      resolve(null);
    };
    const req = http.request(
      {
        socketPath: companionSocketPath(env),
        path: `/v1/${method}`,
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload),
          "memlin-client-protocol": String(COMPANION_PROTOCOL)
        },
        // Overall call budget; the connect phase gets its own tighter cap
        // below via the socket timeout before the connection exists.
        timeout: timeoutMs
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          if (settled) return;
          settled = true;
          if (res.statusCode !== 200) return resolve(null);
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch {
            resolve(null);
          }
        });
        res.on("error", () => fail(false));
      }
    );
    const connectTimer = setTimeout(() => {
      req.destroy();
      fail(true);
    }, CONNECT_TIMEOUT_MS);
    connectTimer.unref?.();
    req.on("socket", (socket) => {
      socket.once("connect", () => clearTimeout(connectTimer));
    });
    req.on("timeout", () => {
      req.destroy();
      fail(false);
    });
    req.on("error", () => fail(true));
    req.end(payload);
  });
}
async function companionStatus(opts = {}) {
  const status = await companionRequest("status.get", {}, opts);
  if (!status) return null;
  if (status.protocol < MIN_COMPANION_PROTOCOL || status.protocol > MAX_COMPANION_PROTOCOL) {
    return null;
  }
  return status;
}
async function companionResolveStart(req, opts = {}) {
  return companionRequest("resolve.start", req, opts);
}
async function companionResolveTake(req) {
  return companionRequest("resolve.take", req, {
    timeoutMs: Math.max(250, req.wait_ms + 250)
  });
}
async function companionResolveJoin(req) {
  return companionRequest("resolve.join", req, {
    timeoutMs: Math.max(250, req.wait_ms + 250)
  });
}
async function companionReserveResolveDelivery(req, opts = {}) {
  return companionRequest("resolve.reserve", req, opts);
}
async function companionReserveLateResolveDelivery(req, opts = {}) {
  return companionRequest("resolve.reserve-late", req, opts);
}
async function companionCommitResolveDelivery(req, opts = {}) {
  return (await companionRequest("resolve.commit", req, opts))?.accepted ?? null;
}
async function companionReleaseResolveDelivery(req, opts = {}) {
  return (await companionRequest("resolve.release", req, opts))?.released ?? null;
}
async function companionReportResolveDelivery(req, opts = {}) {
  return (await companionRequest("resolve.report", req, opts))?.accepted ?? null;
}

// apps/codex-plugin/src/hooks/user-prompt-submit.ts
var HOOK_DIR = path6.dirname(fileURLToPath(import.meta.url));
var RESOLVE_BIN = path6.resolve(HOOK_DIR, "../cli/resolve.js");
var CODEX_RESOLVE_BUDGET_MS = 8e3;
var CODEX_RESOLVE_BUDGET_MAX_MS = 8e3;
var CODEX_HOT_HOOK_BUDGET_MS = 2500;
var CODEX_HOT_WORK_BUDGET_MS = 2100;
var CODEX_BACKGROUND_JOIN_MS = 8e3;
var CODEX_BACKGROUND_CLAIM_WAIT_MS = 7500;
var DELIVERY_REPORT_BUDGET_MS = 150;
var DELIVERY_RESERVATION_POLL_MS = 25;
var SYSTEM_MESSAGE_MAX_BYTES = 700;
async function hasToken() {
  try {
    const raw = await fs4.readFile(
      path6.join(os5.homedir(), ".config", "memlin", "token.json"),
      "utf8"
    );
    return Boolean(JSON.parse(raw).access_token);
  } catch {
    return false;
  }
}
function utf8Prefix(value, maxBytes) {
  let out = "";
  let bytes = 0;
  for (const character of value) {
    const size = Buffer.byteLength(character, "utf8");
    if (bytes + size > maxBytes) break;
    out += character;
    bytes += size;
  }
  return out;
}
function noticeSystemMessage(notice) {
  const human = notice.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("<") && !line.startsWith("#")).join("\n");
  return utf8Prefix(human, SYSTEM_MESSAGE_MAX_BYTES);
}
async function emitAdditionalContext(additionalContext, systemMessage = "") {
  const outputBytes = Buffer.byteLength(additionalContext, "utf8");
  if (outputBytes > CODEX_ADDITIONAL_CONTEXT_MAX_BYTES) {
    throw new Error("Codex additionalContext exceeds the safe UTF-8 byte envelope");
  }
  const serialized = JSON.stringify({
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext },
    ...systemMessage ? { systemMessage: utf8Prefix(systemMessage, SYSTEM_MESSAGE_MAX_BYTES) } : {}
  });
  await new Promise((resolve, reject) => {
    process.stdout.write(serialized, (error) => error ? reject(error) : resolve());
  });
  return outputBytes;
}
function waitRequest(started, input, waitMs) {
  return {
    resolve_id: started.resolve_id,
    turn_id: started.turn_id,
    host: "codex",
    session_id: input.session_id ?? null,
    wait_ms: Math.max(0, Math.floor(waitMs))
  };
}
async function reportDelivery(started, input, outcome, beganAt, output, phase) {
  return companionReportResolveDelivery(
    {
      ...waitRequest(started, input, 0),
      outcome,
      phase: phase?.type === "hot" || phase?.type === "full" ? phase.type : null,
      hook_latency_ms: Date.now() - beganAt,
      output_chars: output.length,
      output_bytes: Buffer.byteLength(output),
      hook_trusted: true,
      canary_cohort: process.env.MEMLIN_RESOLVE_CANARY_COHORT ?? null,
      companion_used: true,
      fallback_path: null,
      required_core_complete: phase?.required_core_complete,
      output_capped: phase?.output_capped,
      visible_document_ids: []
    },
    { timeoutMs: DELIVERY_REPORT_BUDGET_MS }
  );
}
async function reservePhase(started, input, phase, waitUntil) {
  const requestId = randomUUID();
  do {
    const reservation = await companionReserveResolveDelivery(
      {
        ...waitRequest(started, input, 0),
        phase,
        owner: "hook",
        request_id: requestId
      },
      { timeoutMs: Math.max(100, Math.min(500, waitUntil - Date.now())) }
    );
    if (!reservation || reservation.status !== "busy") return reservation;
    const pause = Math.max(
      1,
      Math.min(DELIVERY_RESERVATION_POLL_MS, reservation.retry_after_ms, waitUntil - Date.now())
    );
    if (Date.now() + pause > waitUntil) return reservation;
    await new Promise((resolve) => setTimeout(resolve, pause));
  } while (Date.now() < waitUntil);
  return null;
}
async function emitReservedPhase(args) {
  const reservation = await reservePhase(args.started, args.input, args.phase, args.waitUntil);
  if (!reservation) return "unknown";
  if (reservation.status !== "reserved") return reservation.status;
  if (!reservation.reservation_token || !reservation.phase) return "unknown";
  const phase = reservation.phase;
  await emitClaimedPhase({
    identity: waitRequest(args.started, args.input, 0),
    reservation: {
      ...reservation,
      reservation_token: reservation.reservation_token,
      phase
    },
    beganAt: args.beganAt,
    context: phaseContext(phase),
    systemMessage: args.systemMessage,
    fallbackPath: null,
    attribution: args.attribution
  });
  return "emitted";
}
async function emitClaimedPhase(args) {
  const { phase } = args.reservation;
  try {
    await emitAdditionalContext(args.context, args.systemMessage);
  } catch (error) {
    await companionReleaseResolveDelivery(
      {
        ...args.identity,
        phase: phase.type,
        reservation_token: args.reservation.reservation_token
      },
      { timeoutMs: DELIVERY_REPORT_BUDGET_MS }
    );
    throw error;
  }
  const complete = phase.required_core_complete !== false && phase.output_capped !== true;
  const outcome = phase.type === "failed" ? "failed" : complete ? phase.type === "full" ? "background_full" : "inline_hot" : "failed";
  const commitRequest = {
    ...args.identity,
    phase: phase.type,
    reservation_token: args.reservation.reservation_token,
    outcome,
    hook_latency_ms: Date.now() - args.beganAt,
    output_chars: args.context.length,
    output_bytes: Buffer.byteLength(args.context),
    hook_trusted: true,
    canary_cohort: process.env.MEMLIN_RESOLVE_CANARY_COHORT ?? null,
    companion_used: true,
    fallback_path: args.fallbackPath,
    required_core_complete: phase.required_core_complete,
    output_capped: phase.output_capped,
    visible_document_ids: complete && outcome !== "failed" ? phase.visible_document_ids ?? [] : []
  };
  let committed = await companionCommitResolveDelivery(commitRequest, {
    timeoutMs: Math.max(DELIVERY_REPORT_BUDGET_MS, 500)
  });
  if (committed === null) {
    await new Promise((resolve) => setTimeout(resolve, DELIVERY_RESERVATION_POLL_MS));
    committed = await companionCommitResolveDelivery(commitRequest, {
      timeoutMs: Math.max(DELIVERY_REPORT_BUDGET_MS, 500)
    });
  }
  if (committed !== true) {
    return true;
  }
  const auditId = phase.audit_id?.trim();
  if (phase.type === "full" && complete && auditId && args.attribution) {
    await recordLastResolve({
      task: args.attribution.task,
      audit_id: auditId,
      resolved_at: Date.now(),
      cwd: args.attribution.cwd,
      had_content: args.reservation.result ? bundleHasContinuityContent(args.reservation.result.bundle) : false,
      host: args.identity.host,
      session_id: args.identity.session_id,
      delivered: true,
      turn_started_at: args.attribution.turnStartedAt
    });
  }
  return true;
}
async function emitPriorLatePhase(started, input, cwd, beganAt) {
  const late = await companionReserveLateResolveDelivery(
    {
      ...waitRequest(started, input, 0),
      owner: "hook",
      request_id: randomUUID()
    },
    { timeoutMs: 500 }
  );
  if (late?.status !== "reserved" || !late.reservation_token || !late.phase || late.phase.type !== "full" || !late.source) {
    return false;
  }
  const completedAt = Date.parse(late.phase.completed_at);
  const context = buildLateDeliveryEnvelope(
    {
      resolve_id: late.source.resolve_id,
      turn_id: late.source.turn_id,
      trace_id: late.phase.trace_id,
      task: "",
      cwd,
      host: late.source.host,
      session_id: late.source.session_id,
      rendered: late.phase.rendered ?? "",
      audit_id: late.phase.audit_id,
      completed_at: Number.isFinite(completedAt) ? completedAt : Date.now(),
      latency_ms: late.phase.timing_ms ?? 0,
      deadline_ms: CODEX_RESOLVE_BUDGET_MAX_MS
    },
    { currentResolvePending: true }
  );
  const bounded = boundAdditionalContextForHook(context, {
    maxBytes: CODEX_ADDITIONAL_CONTEXT_MAX_BYTES,
    label: "late"
  });
  const phase = bounded.capped ? {
    ...late.phase,
    required_core_complete: false,
    output_capped: true,
    visible_document_ids: []
  } : late.phase;
  return emitClaimedPhase({
    identity: late.source,
    reservation: {
      ...late,
      reservation_token: late.reservation_token,
      phase
    },
    beganAt,
    context: bounded.context,
    systemMessage: "",
    fallbackPath: "companion-late"
  });
}
function phaseContext(phase) {
  if (phase.type === "failed") return buildResolveFailedEnvelope(phase.error ?? void 0);
  return buildProgressiveDeliveryEnvelope(phase.type, phase.rendered ?? "", phase.hook_resolve_ref);
}
async function runCompanionPath(mode, input, prompt, cwd, beganAt, systemMessage) {
  if (!input.turn_id?.trim()) return "unavailable";
  if (mode === "hot") {
    const status = await companionStatus({
      timeoutMs: Math.max(100, Math.min(400, CODEX_HOT_WORK_BUDGET_MS - (Date.now() - beganAt)))
    });
    if (!status?.capabilities.includes("resolve-v2-singleflight") || !status.capabilities.includes("resolve-v2-delivery-reservations")) {
      return "unavailable";
    }
  }
  const startRequest = {
    task: prompt,
    cwd,
    host: "codex",
    session_id: input.session_id ?? null,
    turn_id: input.turn_id,
    join_only: mode === "full",
    plugin_version: "0.2.46",
    deadline_at: new Date(beganAt + CODEX_RESOLVE_BUDGET_MAX_MS).toISOString(),
    workspace_signals: { cwd }
  };
  let started = null;
  const claimWaitUntil = beganAt + CODEX_BACKGROUND_CLAIM_WAIT_MS;
  do {
    const attemptBudget = mode === "full" ? beganAt + CODEX_RESOLVE_BUDGET_MAX_MS - Date.now() : CODEX_HOT_WORK_BUDGET_MS - (Date.now() - beganAt);
    started = await companionResolveStart(startRequest, {
      timeoutMs: Math.max(100, Math.min(500, attemptBudget))
    });
    if (mode !== "full" || !started || started.phase?.error?.code !== "RESOLVE_NOT_FOUND" || Date.now() >= claimWaitUntil) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  } while (Date.now() < claimWaitUntil);
  if (!started) {
    if (mode === "hot") {
      await emitAdditionalContext(buildPendingContextEnvelope(), systemMessage);
    }
    return "handled";
  }
  const startFailureCode = started.phase?.error?.code;
  if (startFailureCode === "WORKSPACE_INACTIVE") {
    return "handled";
  }
  if (startFailureCode === "PROJECT_RESOLUTION_UNAVAILABLE") {
    return mode === "hot" ? "unavailable" : "handled";
  }
  if (mode === "full") {
    if (started.phase?.error?.code === "RESOLVE_NOT_FOUND") return "handled";
    let phase2 = started.phase?.type === "full" || started.phase?.type === "failed" ? started.phase : null;
    if (!phase2) {
      const joined = await companionResolveJoin(
        waitRequest(
          started,
          input,
          Math.max(
            0,
            Math.min(CODEX_BACKGROUND_JOIN_MS, beganAt + CODEX_RESOLVE_BUDGET_MAX_MS - Date.now())
          )
        )
      );
      if (!joined) return "handled";
      phase2 = joined.phase;
    }
    if (phase2?.type === "full" && phase2.rendered !== null) {
      await emitReservedPhase({
        started,
        input,
        phase: "full",
        beganAt,
        systemMessage,
        waitUntil: beganAt + CODEX_RESOLVE_BUDGET_MAX_MS,
        attribution: {
          task: prompt,
          cwd,
          turnStartedAt: beganAt
        }
      });
      return "handled";
    }
    if (phase2?.type === "failed") {
      await emitReservedPhase({
        started,
        input,
        phase: "failed",
        beganAt,
        systemMessage,
        waitUntil: beganAt + CODEX_RESOLVE_BUDGET_MAX_MS
      });
      return "handled";
    }
    if (await emitPriorLatePhase(started, input, cwd, beganAt)) return "handled";
    await reportDelivery(started, input, "host_timeout", beganAt, "", null);
    return "handled";
  }
  const remaining = Math.max(0, CODEX_HOT_WORK_BUDGET_MS - (Date.now() - beganAt));
  const taken = await companionResolveTake(waitRequest(started, input, remaining));
  if (!taken) {
    const context2 = buildPendingContextEnvelope();
    await emitAdditionalContext(context2, systemMessage);
    await reportDelivery(started, input, "pending", beganAt, context2, null);
    return "handled";
  }
  const phase = taken.phase;
  if (phase?.type === "hot") {
    const delivery = await emitReservedPhase({
      started,
      input,
      phase: "hot",
      beganAt,
      systemMessage,
      waitUntil: beganAt + CODEX_HOT_WORK_BUDGET_MS
    });
    if (delivery === "unavailable") {
      const context2 = buildPendingContextEnvelope();
      await emitAdditionalContext(context2, systemMessage);
      await reportDelivery(started, input, "pending", beganAt, context2, null);
    }
    return "handled";
  }
  if (phase?.type === "full" || phase?.type === "failed") {
    const context2 = buildPendingContextEnvelope();
    await emitAdditionalContext(context2, systemMessage);
    await reportDelivery(started, input, "pending", beganAt, context2, null);
    return "handled";
  }
  const context = buildPendingContextEnvelope();
  await emitAdditionalContext(context, systemMessage);
  await reportDelivery(started, input, "pending", beganAt, context, null);
  return "handled";
}
async function main() {
  const beganAt = Date.now();
  const input = await readHookInput() ?? {};
  const prompt = input.prompt ?? "";
  const cwd = input.cwd ?? process.cwd();
  const sessionId = input.session_id ?? null;
  const mode = process.argv.includes("--background") ? "full" : "hot";
  if (isIgnorablePrompt(prompt)) {
    exitHook(0);
    return;
  }
  const scribeNotice = mode === "hot" ? await takeCorrectionNotice(sessionId ?? void 0) + await takeScribeNotice(sessionId ?? void 0) : "";
  const scribeSystemMessage = noticeSystemMessage(scribeNotice);
  try {
    const state = await readState();
    const continuation = continuationForPrompt(state, prompt, cwd, "codex", sessionId);
    if (continuation) {
      if (mode === "hot") {
        await emitAdditionalContext(
          buildContinuityMarker(continuation.audit_id),
          scribeSystemMessage
        );
      }
      return;
    }
  } catch {
  }
  if (mode === "full") {
    await runCompanionPath("full", input, prompt, cwd, beganAt, "");
    exitHook(0);
    return;
  }
  if (await runCompanionPath("hot", input, prompt, cwd, beganAt, scribeSystemMessage) === "handled") {
    return;
  }
  if (!await hasToken()) {
    if (scribeSystemMessage) await emitAdditionalContext("", scribeSystemMessage);
    exitHook(0);
    return;
  }
  const lateBundle = await takePendingBundle(cwd, "codex", { sessionId });
  const fallbackBudget = Math.max(100, CODEX_HOT_HOOK_BUDGET_MS - (Date.now() - beganAt) - 100);
  const outcome = await runResolveWithBudget({
    resolveBin: RESOLVE_BIN,
    task: prompt,
    cwd,
    host: "codex",
    sessionId,
    turnId: input.turn_id ?? null,
    budgetMs: Math.min(fallbackBudget, CODEX_RESOLVE_BUDGET_MS)
  });
  if (outcome.bundle?.rendered) {
    const bounded = boundAdditionalContextForHook(buildInlineDeliveryEnvelope(outcome.bundle), {
      maxBytes: CODEX_ADDITIONAL_CONTEXT_MAX_BYTES,
      label: "inline"
    });
    await emitAdditionalContext(bounded.context, scribeSystemMessage);
    return;
  }
  if (lateBundle) {
    const bounded = boundAdditionalContextForHook(
      buildLateDeliveryEnvelope(lateBundle, {
        currentResolvePending: outcome.stillRunning
      }),
      { maxBytes: CODEX_ADDITIONAL_CONTEXT_MAX_BYTES, label: "late" }
    );
    await emitAdditionalContext(bounded.context, scribeSystemMessage);
    if (!bounded.capped) {
      await markLastResolveDelivered({
        auditId: lateBundle.audit_id,
        sessionId,
        host: "codex",
        cwd
      });
    }
    return;
  }
  if (outcome.stillRunning) {
    await emitAdditionalContext(buildPendingContextEnvelope(), scribeSystemMessage);
    return;
  }
  if (scribeSystemMessage) await emitAdditionalContext("", scribeSystemMessage);
  exitHook(0);
}
main().catch(() => exitHook(0));
