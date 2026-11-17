# Deployment preparation — backup exception accepted

The user explicitly instructed: “부족한 백업 그냥 무시하고 하자”. This waives completing the missing backup gate, not production deployment authorization, paid infrastructure, or all remaining functional checks. Keep backup status INCOMPLETE / USER-ACCEPTED EXCEPTION; never relabel it PASS.

Read-only discovery found existing schema `meonggo_release_backup_20261115`: 19 application table copies plus `_manifest`, dated 2026-11-15 02:03:24 UTC. Manifest counts total 2,122 at creation, including 18 members. Current production has 20 members, 14 dogs, 55 cards, 46 random battle records, and Storage 176 objects / 57,596,793 bytes. This same-database copy is not a complete current backup or a separate original-photo archive. No production changes were made.

Follow-up code includes trusted SHA-256 comparison in the offline backup verifier. Security readiness: Next.js and eslint-config-next pinned from 16.4.3 to 16.4.6 after the original build raised SecurityFatalError and npm audit identified a fixed Next.js advisory. The patched ON and OFF production builds completed; Node 124/124 tests passed after the dependency update and again after the user's backup exception. Do not claim all dependency advisories resolved; a full post-update audit was not performed.

Outstanding, independent of the backup exception:
- Real authenticated HTTP purchase/admin-upload/two-member PvP verification remains unperformed. Mock API browser tests and synthetic SQL tests are not substitutes.
- Final deployment configuration must add the stage4 store and stage5 PvP flag pairs; existing production has older stage3 PvP naming. Do not change production flags before approval.
- Production `go_official_purchases_coins_check` still permits only 200C; the reviewed stage4 SQL must be applied in order for 300C purchases. No production migration was run.
- Remote persistence of local follow-up commits is not confirmed; the earlier Git push was rejected by automatic approval review. Do not bypass this via another upload route.
- Final explicit production deployment approval is still outstanding. Main, Vercel production and Supabase DB/Storage remain unchanged.
