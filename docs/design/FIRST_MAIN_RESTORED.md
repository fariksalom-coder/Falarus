# First main-panel presentation restored — 2026-09-10

Restored DailyCourseMapPage from ui-color-before-20260907.tar.gz, which contains
the initial deployed presentation before the subsequent color and academic
revisions: navy header, gold stage plaques, winding path and inline daily tasks.
The completed-day coin retains the user's later requirement to show a day number
on green instead of a checkmark. Shared current progress helpers remain in use.
No other panel, blue navigation, live AI or game module was reverted.

Local TypeScript passed. Synthetic API browser checks at 390, 768 and 1440 px
show the restored map, five lesson actions, no fantasy map, no horizontal
overflow or runtime errors. See first-main-restored-check.json and screenshots.

Deploy manifest contains only DailyCourseMapPage.tsx and service worker v44.
Before restoration, production sources were backed up to
/home/ubuntu/backups/main-before-first-restore-20260910.tar.gz.
