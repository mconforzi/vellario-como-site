# VELLARIO COMO | Mobile Functional Root 0.1

## Boundary and purpose

Dedicated mobile-first functional base: NOT final visual UI and NOT the existing public homepage.
Live URL: https://mconforzi.github.io/vellario-como-site/mobile/
Canonical private source: mconforzi/vellario-como/mobile/
Public copy: mconforzi/vellario-como-site/mobile/
Original index.html and v5.html remain unchanged. No external APIs, backend, user tracking or paid services.

## Media: one source of truth

catalog.json is the only media registry: five models, per-model original poster / video / gallery, original resolution and six segments of MAS 46 FULL. Do not duplicate paths across future UI components.
Models: Quantum 999, MAS 36, MAS 56, GranTender 72 and Gran Marlin. MAS 36 uses a real static photo, never invented video. MAS 56 uses MAS56 originals only.
MAS 46 FULL master is 848x480; verified model film variants are 720p; do not promise 4K without new masters.

## Root acceptance contract — before any UI phase

1. Public HTML / catalog JSON / JS / CSS must load.
2. Catalogue schemaVersion 1, 5 unique models; no blank screen on failed boot.
3. MAS46 opening starts muted and inline and has 6-part film continuity with manual play/pause.
4. Five model tabs, next/previous, titles, poster, photo gallery and per-model video work.
5. A missing video displays the same yacht's source photograph and a clear status; no wrong yacht.
6. Expandable diagnostics checks real static media endpoints.
7. Real browser emulating iPhone viewport 390x844: no horizontal overflow or page JS errors.
8. Changing the UI must not rewrite media registry or working playback/navigation logic.
9. Never replace root production homepage until the functional mobile preview is reviewed.

## Files

index.html: semantic accessible root and controls.
catalog.json: media truth.
core.js: boot/playback/selection/fallback/diagnostics.
core.css: deliberately neutral mobile styling, not the future luxury UI.

## Verified browser results — 7 November 2026

Public HTML and all three root files HTTP 200; mobile Chromium emulation 390x844 passed boot, media and five-model selection.
MAS46 source video played with 848x480 metadata. Quantum, MAS56, GranTender and Gran Marlin original movies loaded and played. MAS36 image-only as designed.
Model selection tabs and next/previous worked; real HEAD media diagnostics PASS; zero page errors and zero horizontal overflow.
Forced blocking of MAS56 MP4 produced correct MAS56 photographic fallback; identified race where status was overwritten by autoplay handler, patched in this release.

## Not verified

Real physical iPhone Safari UAT, every film second of the 105-second opening, custom domain, brand registration and production readiness, AI.HQ integration receipt.
Zero incremental paid spend. Technical Gmail scan showed no new VELLARIO-specific alerts; unrelated AI.HQ CI failures are out of scope.

## Next phase

After owner reviews functional root, rebuild only presentation CSS / optional motion while preserving validated state machine, media registry and photo fallback.

## 2026-11-14 · Owner override — video-first (supersedes image-only MAS36 rule)

The owner now explicitly requires moving video in the yacht model presentations, **not still-only covers**. Supersedes the historical 'MAS36 image-only' choice above; the historical 7 November browser observation remains a dated record, not current behaviour.

- All five catalog entries must have a matching original film: Quantum 999 / quantum-hd.mp4, MAS 36 / mas36.mp4, MAS 56 / mas56-film-wide.mp4, GranTender 72 / grantender-hd.mp4, Gran Marlin / gran-marlin.mp4.
- Homepage, collection and all five model-detail collection tiles present muted autoplay looping video when in view. Static original photographs appear only before playback / as same-yacht error, user reduced-motion or data-saving fallback.
- Each of five model pages must show its matching film in the full-bleed hero, including MAS36.
- Single source of truth remains catalog.json + build_site.py. The V6 canonical /mobile/ site is now the root landing destination. The old functional diagnostic contract above applies to its historical route only.
- This update has **GitHub source/static QA and Pages deployment evidence**, but not physical iOS Safari autoplay or desktop browser acceptance. Resolution of MAS36 video is unverified; do not claim 4K.
