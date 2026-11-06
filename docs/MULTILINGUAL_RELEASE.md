# Multilingual mission interface — 2026-11-06

The owner selected 12 major languages with deeper gameplay coverage. This release adds Spanish, French, German, Portuguese, Arabic, Hindi, Simplified Chinese, Japanese, Russian and Indonesian alongside existing English and Bengali.

## Implemented

- Native-name language picker in settings and assistant preferences; persistent selection; HTML language and Arabic right-to-left direction; script-aware system font fallbacks.
- Each new pack contains 173 source-key translations covering navigation, onboarding, mission flow, resource labels, build presets, crew approvals, report labels and contextual assistant shortcuts. English source fallback remains visible for untranslated content.
- Vite loads language packs on demand. The service worker precaches the complete hosted release for offline use, including packs. The standalone build embeds them. No translation API, credentials, external fonts or new runtime service.
- Translated quick-question text resolves to the existing engine intent. Active flight telemetry remains authoritative, and answers retain snapshot semantics. Detailed explanations remain English for the new languages, with an explicit localized notice; this is not a multilingual generative chatbot.
- Orbital horizon, atmospheric glow and more spacious heading hierarchy use original CSS artwork and existing planets. Animation uses transform/opacity, follows reduced-motion settings, and pauses with background motion. No extra renderer or video asset.

## Limits and next work

Translations are authored drafts, not native-speaker-reviewed. Scenario narratives, detailed explanations, some accessibility descriptions and advanced engineering prose still fall back to English. This is a first multilingual release, not full localization. Units, equations and model calculations are unchanged. Crew remains same-device pass-and-play; no online multiplayer backend was added.

To regenerate packs, run `node scripts/author-locales.mjs`, then `node scripts/author-gameplay-locales.mjs`, then `node scripts/author-navigation-locales.mjs`. Keep all three authoring tables aligned with JSON changes. Coverage and placeholder tests enforce consistent keys across the ten packs.

## Visual references inspected in the owner's Edge

- [Blockchain landing page](https://www.pinterest.com/pin/731764639474403599/): illuminated orbital focal point and restrained hierarchy.
- [Sellix UI and 3D](https://www.pinterest.com/pin/1145532855388728551/): spacious headings and fine violet accents.
- [Modern technology concept](https://www.pinterest.com/pin/934285885213156073/): planetary horizon arc.
- [Satellite landing animation](https://www.pinterest.com/pin/366973069645672072/): spacecraft as the hero subject and clear primary action.
- [Atmospheric planetary composition](https://www.pinterest.com/pin/647814727689403582/): cropped orbital forms and layered depth.
- [Blue immersive composition](https://www.pinterest.com/pin/882142646132874062/): blue illumination and negative space.

These informed composition only; no reference media or code was copied.

## Validation

Automated checks cover all 12 preference round trips, all ten lazy-loaded packs, fallback, matching coverage and placeholders, invalid locale handling, prototype-safe dictionaries, and translated intent routing against a real paused Mars flight at 20% battery without mutating the run. Existing engineering, security, crew and interface suites also run.

Edge manual checks: Arabic direction and persistence after reload, 390×844 Arabic chat with no horizontal overflow and successful status answer; 320×568 German layout; Japanese font fallback and LTR restoration at 1365×900; dark/light themes. Physical Android/iOS, Safari, assistive technology and native-language linguistic review were not performed.
