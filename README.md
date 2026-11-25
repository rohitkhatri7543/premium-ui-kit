# premium-ui: a Claude Code kit for award-level UI/UX

This kit captures the process that produced **Atelier**, a Flutter notes app in which:
- every note is a sheet of handmade paper on a lamp-lit wooden desk;
- you crumple notes to delete them and toss them into a wicker wastebasket;
- you pull a brass chain to switch day and night;
- you pinch the desk to gather the sheets into a stack, or fan them out like cards.

It works for **Flutter** and **web** (React/Next/HTML).

**v3 (current)** adds the Softbound lessons: web-hero-to-Flutter port recipe, device performance rules, ready-to-copy Flutter templates, a fast multi-agent playbook with templates, `device_perf.sh`, and a `perf-verifier` agent. See CHANGELOG.md.

**v2** adds a concept round of 4 live directions, from art-led Dribbble polish to a world to a wild card. Its benchmark is the notes preview in `skills/premium-ui/templates/examples/notes-directions/`, written up in `references/case-study-notes-directions.md`. See CHANGELOG.md.

## What's inside
```
premium-ui-kit/
  README.md  CHANGELOG.md
  .claude-plugin/        plugin.json, marketplace.json
  hooks/hooks.json       ui-lint (PostToolUse), device-privacy-guard (PreToolUse Bash)
  agents/
    ui-critic.md         Opus design critic: 10-axis score, top-5 fixes, POLISH/RETHINK
    ui-feature-agent.md  parallel feature builder (isolation, merge, scoped tests, sub-agents, honest perf claims)
    perf-verifier.md     haiku verifier: analyze + scoped tests + release build, never edits code
  skills/premium-ui/
    SKILL.md             the process (concept, signature moments, craft, performance, loop, user)
    references/
      flutter.md, web.md                       toolbox, gotchas, how to screenshot interactions
      flutter-patterns.md                      working code and creative patterns
      flutter-device-performance.md            PERF_LOG, Impeller rules, audio, image lifetime
      web-to-flutter-port.md                   web hero first, then pixel-compared Flutter port
      fast-orchestration.md, parallel-agents.md  contract-first multi-agent playbook
      case-study-notes-directions.md, case-study-softbound.md
    templates/
      CLAUDE.project.md        per-project house rules
      flutter/                 copyable Flutter starter (world, cam, render harness, PERF_LOG)
      orchestration/           CONTRACT, agent-brief, PROGRESS (pause/resume) templates
      examples/                live preview pages: notes-directions/, softbound-v3/, concept/interaction previews
    scripts/
      ui-lint.sh, device-privacy-guard.sh      hooks
      device_perf.sh           adb session: install, launch, gestures, PERF lines, asserts state changed (no screen capture)
      merge_agent.sh           3-way merge of an agent copy (absolute paths)
      shot.js, record.js, nocache_server.py, build_directions.py   web screenshots and the 4-direction page
```

## Install

**As a plugin** (any machine, shareable): push this folder to a git repo, then in Claude Code:
```
/plugin marketplace add <github-user>/<repo>
/plugin install premium-ui@premium-ui-kit
```

**User-level** (already done on the machine that built Atelier):
- copy `skills/premium-ui` → `~/.claude/skills/premium-ui`
- copy `agents/*.md` → `~/.claude/agents/`
- add both hooks to `~/.claude/settings.json`:
  - PostToolUse → `~/.claude/skills/premium-ui/scripts/ui-lint.sh`
  - PreToolUse (Bash) → `~/.claude/skills/premium-ui/scripts/device-privacy-guard.sh`
- add the "Premium UI/UX" pointer section to `~/.claude/CLAUDE.md`

To update an existing user-level install, re-copy `skills/premium-ui` and `agents/*.md`.

Use one install method per machine, not both, or the skill and agents will appear twice.

## Start a new project
1. Say: *"Build me a premium <app>. Use the premium-ui skill."* Or just ask for UI work; the skill triggers on its own.
2. It bootstraps the project: it adds `CLAUDE.md` from the template and creates `.premium-ui` to turn on the lint hook.
3. Expect 4 live concept previews to play with. Pick one, and it builds, screenshots, critiques and verifies.
4. Ask for "more premium / more unique" and it proposes the next layer of signature moments, then builds them in parallel.

Quick start for speed: write the contract (`templates/orchestration/CONTRACT.template.md`), brief agents from `agent-brief.template.md`, launch them in one message, merge each with `merge_agent.sh`, then measure on a device with `scripts/device_perf.sh`.

Requirements: `jq` (for the hook), `ffmpeg` (frame strips), Playwright MCP (browser screenshots), `adb` for device runs, and the Flutter or Node toolchain.
