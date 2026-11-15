import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, Search, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useMedia } from "@/context/MediaContext";
import styles from "./NavigationBar.module.css";

interface NavigationBarProps {
  onOpenSearch: () => void;
  onLogoActivate: () => void;
}

const LINKS = [
  { label: "Home", href: "/home" },
  { label: "My Years", href: "/home#four-years" },
  { label: "Memories", href: "/home#featured" },
  { label: "Collections", href: "/gallery" },
  { label: "Timeline", href: "/timeline" },
  { label: "My List", href: "/home#my-list" },
];

export function NavigationBar({ onOpenSearch, onLogoActivate }: NavigationBarProps) {
  const { logout } = useAuth();
  const { editorial } = useMedia();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const profilePhotoUrl = editorial?.profile.photoMediaId ? `/api/media/file/${editorial.profile.photoMediaId}` : undefined;
  const profileName = editorial?.profile.name ?? "Profile";

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  return (
    <header className={styles.nav}>
      <div className={styles.left}>
        <button type="button" className={styles.mobileToggle} onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle menu">
          {mobileOpen ? <X /> : <Menu />}
        </button>
        {/* A real link to /home (not just an Easter-egg trigger) — it still counts
            toward the Easter egg on every click, since onLogoActivate fires first
            and this component instance (and its click-burst counter) persists
            across navigation within AppShell. */}
        <Link to="/home" className={styles.logo} onClick={onLogoActivate} aria-label="VARUNIKA — Home (click repeatedly for a surprise)">
          V
        </Link>
        <nav aria-label="Primary">
          <ul className={styles.links}>
            {LINKS.map((link) => (
              <li key={link.label}>
                <Link to={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className={styles.right}>
        <button type="button" className={styles.iconButton} onClick={onOpenSearch} aria-label="Search">
          <Search />
        </button>
        <div className={styles.menuWrap} ref={menuRef}>
          <button
            type="button"
            className={styles.menuButton}
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`${profileName} profile menu`}
          >
            {profilePhotoUrl ? <img className={styles.menuButtonAvatar} src={profilePhotoUrl} alt="" /> : "V"}
          </button>
          {menuOpen && (
            <div className={styles.dropdown} role="menu">
              <Link to="/letter" role="menuitem" onClick={() => setMenuOpen(false)}>
                One Last Thing...
              </Link>
              <Link to="/credits" role="menuitem" onClick={() => setMenuOpen(false)}>
                End Credits
              </Link>
              <button type="button" role="menuitem" onClick={() => logout()}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {mobileOpen && (
        <div className={styles.mobilePanel}>
          {LINKS.map((link) => (
            <Link key={link.label} to={link.href} onClick={() => setMobileOpen(false)}>
              {link.label}
            </Link>
          ))}
          <Link to="/letter" onClick={() => setMobileOpen(false)}>
            One Last Thing...
          </Link>
          <Link to="/credits" onClick={() => setMobileOpen(false)}>
            End Credits
          </Link>
        </div>
      )}
    </header>
  );
}
