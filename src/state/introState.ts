// Deliberately an in-memory module variable, NOT sessionStorage/localStorage.
// This module is re-evaluated fresh on every real page load (hard navigation
// or browser refresh) but stays loaded across client-side route changes —
// so the intro replays on every fresh load, and never replays from clicking
// around the dashboard.
let introShownThisLoad = false;

export function hasShownIntro(): boolean {
  return introShownThisLoad;
}

export function markIntroShown(): void {
  introShownThisLoad = true;
}
