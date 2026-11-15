import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Resets scroll position on real navigation (PUSH/REPLACE), without
 * interfering with the browser's own scroll restoration on back/forward
 * (POP) — that's left alone on purpose so "return to the previous page"
 * keeps working. A hash in the URL (e.g. /home#featured) scrolls to that
 * section instead of the top, retried across a few animation frames since
 * the target element may not exist yet while the page's data is loading.
 */
export function ScrollToTop() {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType === "POP") return;

    if (location.hash) {
      const id = decodeURIComponent(location.hash.slice(1));
      let frame: number;
      let attempts = 0;

      const tryScroll = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        attempts += 1;
        if (attempts < 60) frame = requestAnimationFrame(tryScroll);
      };

      tryScroll();
      return () => cancelAnimationFrame(frame);
    }

    window.scrollTo(0, 0);
  }, [location.pathname, location.hash, navigationType]);

  return null;
}
