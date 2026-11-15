import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useMedia } from "@/context/MediaContext";
import { useClickBurst } from "@/hooks/useClickBurst";
import { NavigationBar } from "@/components/NavigationBar/NavigationBar";
import { SearchOverlay } from "@/components/SearchOverlay/SearchOverlay";
import { EasterEgg } from "@/components/EasterEgg/EasterEgg";

/**
 * Shared chrome (nav bar, search, Easter egg) for the browsing pages —
 * dashboard, title detail, gallery, timeline. Mounted once as a layout
 * route so the logo/search/Easter-egg state survives navigating between
 * those pages (BUG-02's fix: the logo is a real link to /home everywhere
 * this shell wraps). The full-screen video player, the letter, and the
 * end credits intentionally keep their own minimal chrome instead.
 */
export function AppShell() {
  const { items, itemsById, editorial } = useMedia();
  const [searchOpen, setSearchOpen] = useState(false);
  const [easterEggOpen, setEasterEggOpen] = useState(false);

  const onLogoActivate = useClickBurst(editorial?.easterEgg.clickThreshold ?? 5, () => setEasterEggOpen(true));

  return (
    <>
      <NavigationBar onOpenSearch={() => setSearchOpen(true)} onLogoActivate={onLogoActivate} />
      <Outlet />
      <SearchOverlay open={searchOpen} items={items} onClose={() => setSearchOpen(false)} />
      {easterEggOpen && editorial && (
        <EasterEgg
          message={editorial.easterEgg.message}
          favoriteItem={editorial.easterEgg.favoriteMediaId ? itemsById.get(editorial.easterEgg.favoriteMediaId) : undefined}
          onClose={() => setEasterEggOpen(false)}
        />
      )}
    </>
  );
}
