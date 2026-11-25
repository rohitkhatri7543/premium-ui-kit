# Changelog

Frozen snapshots of each version are kept outside the plugin at `../premium-ui-kit-releases/`, so that future edits never overwrite them.

## 3.3.0 (2026-11-10): new mechanics before new skins
Field report from Kora under v3.2.0: the gate correctly blocked 7/7, but 4 full directions (painted, cloth, tailor-shop world, dye shader) plus a hybrid, ~90 min each, were all themed skins on a standard store layout: 7/7, "seen before", the user's verdict was "worst final result". Part of the cause was the kit: its "real app" rule listed the standard store home (search, chips, grid, bag) as a requirement.
- **Paradigm sweep first** (SKILL.md §1.0, `PHASE: paradigms`): 6 rough single-screen sketches of new *mechanics* (how people browse, choose, act), ~20 min each, in parallel. The critic answers never-seen for each, and the user picks. Then 4 art directions for that paradigm, or straight to stills.
- **Gate:** the new `paradigms` phase (≥6 `PARADIGM` lines with mechanic, sketch file and never-seen, plus a critic report). Every later phase needs `PICKED` + `PICKED-BY-USER`, the user's exact words (AskUserQuestion answers are now matched per chosen option, so short labels work). `ASSETS` is required; `stock-cutouts` caps First glance at 7. A `Skeleton: standard` line in the critic report caps Wow at 7. Self-test extended.
- **ui-critic:** a standard-skeleton cap (browse, discovery and product screens; checkout, payment, forms and settings are exempt), a stock-cutout cap, a paradigm-sweep mode, and "real app" now means every real function is there and findable, not the standard layout.
- **Asset reality check** before art-heavy scenes: pick non-photographic paradigms, or tell the user real photography is needed for 9.
- **`references/flutter-repos.md`:** pattern → exact file in Wonderous, Vignettes, Flutter shader examples, Rive, flutter_animate and Flame. Clone on demand, never vendored.

## 3.2.0 (2026-11-10): the bar is enforced, not advised
Field report from Kora under v3.1.0: 4 same-type styling directions with no custom art and no custom rendering, 8/6 called "ready", then several agent rounds on that base. The user asked: "if you are really able to break the rules then what is the meaning of the rules?" (Part of it was v3.1's own fault: the pivot was set at 8, below the bar of 9.)
- **`premium-gate` hook** (`scripts/premium-gate.py`, PreToolUse `Artifact|Agent`, active in projects with `.premium-ui`): it blocks every Artifact publish, and every build/polish `ui-feature-agent` spawn, until `PREMIUM_GATES.md` proves:
  - 4 directions spanning art-led, art+motion, world and wild card, each with an existing file and custom art file;
  - ≥2 custom-rendered elements per key screen;
  - existing rest stills and a visible-difference check;
  - SEEN-BEFORE: NO;
  - First glance and Wow read from a saved critic report.

  Below 9/9 it passes only with `USER-OK`, which must match words the user really typed, or an AskUserQuestion answer, in the transcript. Text from Claude, tool output and other sessions are rejected. `--selftest` covers 14 cases.
- **New template:** `templates/PREMIUM_GATES.template.md`.
- **The bar, in the user's words**, at the top of SKILL.md and in ui-critic: custom-built everything, never seen before, GOD level. "Normal premium" is a fail.
- **ui-critic hard caps:**
  - "styling, not design" (no custom art or rendering) caps First glance at 6;
  - SEEN-BEFORE: YES caps First glance and Wow at 7;
  - directions that don't span the range mean RETHINK for the set;
  - < 9 is "below bar", never "ready".
- **SKILL.md:**
  - the pivot threshold is the bar (9, not 8);
  - no silent progress below the bar (ask, state the gap, record USER-OK);
  - approved stills must carry the art;
  - real app AND art-led, never a trade-off;
  - Bootstrap copies the gate template.

## 3.1.0 (2026-11-09): look first, then move
Field report from the Kora store run: a deep parallel round built physics, sound and tap moments over an inherited layout, the critic rose 6/4 → 7/6, and the user saw "nothing changed".
- **SKILL.md, look first:**
  - redesign the resting screens and get no-tap stills approved before any physics or sound;
  - a ≤30-minute static mock before agents;
  - a visible-difference check (old vs new rest stills; "the same app" isn't ready);
  - pivot rule: First glance < 8 means a new visual direction, never polish;
  - "never downgrade" protects features, not layouts.
- **§1:** every direction must read as a real, shippable app of its kind.
- **§6:** "more premium / not wow" now means fix what a still shows first; signature moments only once First glance ≥ 8. New: a cost vs visible value check.
- **ui-critic:**
  - two-pass scoring: First glance and the static axes from rest stills only; motion is scored separately and can't raise First glance;
  - the visible-difference question;
  - a real-app cap;
  - First glance < 8 forces RETHINK, with fixes visible in a still.
- **Agent brief template:** a required `VISIBLE IN A STILL` line, with "fork and go deeper" banned as the whole instruction; old vs new stills in the report.
- **fast-orchestration.md:** step 0, approved look first.

## 3.0.0 (2026-11-07): Softbound — web hero to device-perfect Flutter
- **Web-to-Flutter port recipe:** `references/web-to-flutter-port.md`: shared camera (`Cam.plane`, flattened z for hit-testing), 2.5D BookView with baked faces, baked studio light, pixel-level side-by-side vs the web reference, parity checklists, render-test harness (`Render.boot/shot/strip`).
- **Device performance:** `references/flutter-device-performance.md`: opt-in `PERF_LOG` frame logger and adb sessions, build vs raster split, Impeller GPU rules (vertex-colour modulate instead of `ColorFilter`, no `saveLayer`/advanced blends), idle = zero frames, async bakes, deferred image dispose, `IgnorePointer` for inactive views, audioplayers pitfalls (lowLatency, no-op position updater, no audio focus).
- **Fast orchestration:** `references/fast-orchestration.md`: contract-first, isolated copies, one writer per file, sub-agents for review/verify, tokens never line-merged, scoped agent tests, orchestrator measures on device and messages numbers.
- **Patterns:** creative patterns from Softbound (living covers, clay bin, pull-cord globe, list modes + view picker) added to `flutter-patterns.md`.
- **Fix:** `scripts/merge_agent.sh` resolves base/main/agent to absolute paths (relative paths used to merge nothing).
- **Templates:** `templates/flutter/` (copyable world/cam/render-harness/PERF_LOG starter), `templates/orchestration/` (CONTRACT, agent-brief, PROGRESS pause/resume), `templates/examples/softbound-v3/` (the web hero).
- **Case study:** `references/case-study-softbound.md` (scores, failures, fixes, device numbers).
- **Scripts:** `scripts/device_perf.sh` (install with downgrade hint, adb restart retry, front-app guard before every input, condensed PERF lines, `--assert` that state changed; never captures the screen).
- **Agents:** `ui-feature-agent` now runs scoped tests only, spawns critic/verifier sub-agents, reports measured vs unmeasured perf claims, uses absolute paths; new `perf-verifier` (haiku).
- **Rule:** UI work is never done without device numbers (raster p50/p90, jank) per key interaction per theme/time-of-day. `CLAUDE.project.md` carries it.
- SKILL.md stays short: one-line pointers only.

## 2.0.0 (2026-11-03): a range of directions
- **Concept round:** 4 live directions instead of 3 worlds:
  - A, art-led polish;
  - B, art plus signature motion;
  - C, a world;
  - D, a wild card.
  Every direction must have real artwork. This came from a client who showed Dribbble shots after the world-only round.
- **Critic:** `ui-critic` gained a *First glance* axis. The loop stops when every axis is ≥8 and both First glance and Wow are ≥9.
- **Preview page:**
  - The page runs a ghost-finger autoplay of each signature moment, uses the same content across directions, and the hybrid direction is recommended.
  - The 4-direction preview is built in parallel: `templates/examples/directions-shell.html`, `scripts/build_directions.py`, and `scripts/shot.js` (parallel-safe headless screenshots).
- **Benchmark:** `templates/examples/notes-directions/` holds the finished page and stills, written up in `references/case-study-notes-directions.md`. It covers scores per round, lessons, and the path to Wow 9.
- **Working rules:** keep preview work inside the project, not `/tmp`; ask before another fix round once a usable version is published.

## 1.0.0 (2026-11-01): Atelier
- The process extracted from building Atelier, the paper-desk Flutter notes app:
  - a concept world, with 3 live previews and the user picks one;
  - signature moments, craft standards and the performance architecture;
  - the screenshot + `ui-critic` loop;
  - parallel agents with models by difficulty.
- Agents: `ui-critic`, `ui-feature-agent`. Hooks: `ui-lint` (opt-in with `.premium-ui`) and `device-privacy-guard`.
- Note: v1 files were edited in place to make v2 (there was no snapshot then). The v1 process is what this entry describes; the Atelier app itself is the v1 benchmark.
