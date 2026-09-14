# Original games presentation restored — 2026-09-08

Restored GamesPage and five inner game/map pages to their repository baseline presentation. The catalog again uses compact, colorful two-column cards; individual games use their original backgrounds. Game routes opt out of PanelScene artwork. GameGate request lifecycle fixes and all live dialogue/audio fixes remain in place.

Validation: TypeScript and production build passed. Browser checks with synthetic API fixtures passed 9 states each at 390 and 1440 px (catalog, four games, letter map, three active games), without horizontal overflow or runtime errors. No real game quota or result was written. See games-restored-check-390.json and games-restored-check-1440.json; screenshots use the restored- prefix.

Deployment scope: six page files, PanelScene.tsx and service worker v40. Server backup: /home/ubuntu/backups/games-before-restore-20260908.tar.gz. The production build uses the existing atomic deployment script and retains dist.rollback.
