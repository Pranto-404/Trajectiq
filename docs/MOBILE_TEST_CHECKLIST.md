# Five-minute phone test

Do this on a real phone before submitting, once on iPhone/Safari and once on Android/Chrome if you can. Record device, OS and browser version next to each result in `docs/QA_V6.md`.

Open https://trajectiq-omega.vercel.app/ in the browser (not an in-app preview).

1. **Load.** The mission board appears. Nothing scrolls sideways. The header shows the logo, **Assistant** and **Menu**.
2. **Board.** Tap Crew, then 3 players: three name fields appear. Tap Solo. Pick "Lunar Ice Hunter" and "Flight Director": the charter changes. Tap **Accept mission**.
3. **Hangar.** The 3D spacecraft is visible and rotates with a sideways drag. A vertical swipe scrolls the page instead of moving the camera. Scroll to **Choose destination**: the label, the dropdown and the help text are on separate lines and readable.
4. **Concept card.** Tap a "?" next to a resource: a card opens and **Close** works.
5. **Launch.** Tap launch readiness, read the "Recorder before first contact" row, authorise launch. The countdown plays once.
6. **Crisis.** Tap **Next event** until a decision appears. The explanation, the direction chips and the three responses all fit on screen. Tap a response.
7. **Result.** Continue to the end. The Mission Score, decision review and mission code are readable. Tap **Copy code**.
8. **Menu.** Tap Menu: it opens under the button, shows seven items, and closes after you pick one.
9. **Motion.** Turn on the phone's reduce-motion setting and reload: the scene stops drifting and the countdown does not animate.
10. **Offline.** Turn on airplane mode and reload: the game still opens (after one earlier online visit).

Pass means every step works without zooming or horizontal scrolling. Any step that fails: note the step number, device and browser.
