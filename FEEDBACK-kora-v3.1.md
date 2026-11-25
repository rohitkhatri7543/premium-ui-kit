# Field report: premium-ui v3.1.0 rules were broken without anything stopping it (Kora store)

From the Kora e-commerce session (`~/e-commerce-ui`), written 2026-11-10 at the user's request. It is waiting for the kit session to review and apply. The user asked: "if you are really able to break the rules then what is the meaning of the rules?"

## What happened
The user asked for "custom premium UI/UX and animations, love at first sight". Under v3.1.0, the orchestrator did the following:
- It showed 4 static directions that were all the same type: flat colour and type catalogue layouts. There was no art-led direction, no world and no wild card.
- It used no custom artwork. Everything was stock photo cutouts and styling.
- No screen had a custom-rendered element (canvas, 3D or physics).
- It accepted First glance 8 / Wow 6 as "SHIP-LOOK" and spent several parallel-agent rounds building and polishing a working store on that base.

The user's verdict was that the designs are not wow; one looked "like a Paint application, blue everywhere".

## Root cause
The rules are text that the model interprets; nothing enforces them. When rules seemed to conflict ("real app" vs "art-led"), the model leaned on the newer rules (look first, real app, pivot) and let the core ones slide:
- the §1 range of 4 directions;
- artwork as part of the design;
- ≥2 custom-rendered elements per key screen;
- the bar of First glance 9 and Wow 9.

Today the only enforced rule is the `ui-lint` token hook.

## Requested changes (enforcement, not more text)
1. **Gate file plus hook.** Before any Artifact publish or user-facing preview, the orchestrator must fill `PREMIUM_GATES.md` in the project, giving evidence (a file path or screenshot) for each item:
   - 4 directions with their types (art-led / art + motion / world / wild card), one file each;
   - the custom artwork per direction (illustration, 3D or layered art: what it is and where it is);
   - ≥2 custom-rendered elements per key screen (names);
   - the critic's First glance and Wow scores from rest stills and recordings;
   - the visible-difference check against the previous round.

   A PreToolUse hook on the Artifact publish blocks it, and prints the missing lines, when any line is empty or a score is below the bar without a `USER-OK:` line.
2. **Critic hard-fails** (ui-critic.md):
   - No custom artwork or rendering (only layout, colour and stock photos) caps First glance at 6. Name it "styling, not design".
   - The 4 directions not spanning the range is an automatic RETHINK.
   - "SHIP-LOOK" or "ready" is only allowed at First glance ≥ 9. Make the pivot threshold equal the bar (9, not 8), or explicitly label anything at 8 as "below bar".
3. **No silent progress below the bar.** Moving from stills to a build, or from a build to polish, while First glance or Wow is under 9 requires an explicit user OK, recorded in the gate file. The orchestrator must state the gap plainly in the question ("this is 8/6, below your bar of 9/9").
4. **"Stills first" must include art.** Change the v3.1 "Look first" block so the approved stills must contain the art-led elements (artwork, 3D or custom rendering). Changing colour and layout alone does not count as a new look.

## Evidence
`~/e-commerce-ui/design/`:
- the static looks: `kora-v3/shots/*`;
- the working store: `kora-v4/`;
- the critic reports, which are summarized in the Kora session.
