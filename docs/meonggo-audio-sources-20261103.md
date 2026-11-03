# Additional audio and battle revision — 2026-11-03

This revision supersedes the earlier BGM placement table in `meonggo-user-followup-20261103.md`.

| Screen | Current music |
| --- | --- |
| Discovery popup | Pallet Town |
| My album, community album, dog meeting | Pallet Town → Lavender Town, alternating playlist |
| Camera after consent | 8bit_action_boss_battle_bpm145 |
| Battle selection and fight | 8bit_action_boss_battle_bpm145 |

BGM volume changed from 0.48 to 0.20, and battle from 0.42 to 0.18. During impact, battle BGM drops to 0.035 for 650 ms. Uploaded music is unmodified; SHA-256 hashes are in `assets/meonggo-bgm-20261103.json`.

## Downloaded sounds

- Real dog barking: “Tiny Dog Barking in Park” by qubodup, https://freesound.org/people/qubodup/sounds/213855/. The source page states CC0, changed from CC BY on 2024-06-11. Source preview: https://cdn.freesound.org/previews/213/213855_71257-hq.mp3. Three short excerpts start at 0.58, 7.00 and 13.42 seconds, filtered and level-adjusted, exported as `SFX_20/21/22_Real_Dog_*.mp3`. These replace the former synthetic bark mappings without modifying the original supplied SFX files. Bark triggers: discovery result, dog meeting entry/tap/walk and successful interaction, battle result after the dog appears.
- Physical impact: “Dull Heavy Thud 42” by SFXMint, https://sfxmint.com/sounds/impact-thud-42. Source page states AI-generated, CC0, commercial use and modification allowed. Download: https://sfxmint.com/dl/impact-thud-42.mp3. Silence trimmed and level adjusted, exported as `SFX_23_Heavy_Card_Impact.mp3`. This replaces the battle impact mapping. Original SFX_06 remains intact.
- Additional sound hashes are in `assets/meonggo-additional-sfx-20261103.json`; checked before every build.

## Behavior and layout

- Battle “all cards” excludes the authenticated member's cards in the server query, before pagination/count. “My cards” and the public community album retain their existing scopes. Overall dog-kind eligibility still considers all available cards so players can choose one of their cards and one other player's card across tabs.
- Battle duration: 7.6 seconds. Initial contact at 1.848 seconds, further pushes at 3.275 and 4.750 seconds, followed by recoil. Three contact sounds synchronize with those frames. Skip remains available.
- Card wordmark moves from (10,21) to (16,23); author and clipping origin move from x=10 to x=16. These align with the photo/name/stat left edge. Date remains aligned with the photo's right edge. Shared SVG and PNG export use the same coordinates, including existing and future cards.
- Popup testing mode stays enabled until the user requests restoration.

Validation includes production build, existing unit tests plus playlist advance/mute/disposal regression, and read-only database verification: for an account owning 2 approved cards, “all cards” contains 1 other card and 0 own cards. Actual authenticated battle and physical-phone camera testing remain separate from public browser smoke checks.
