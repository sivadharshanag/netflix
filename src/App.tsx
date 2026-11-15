import { Route, Routes } from "react-router-dom";
import { RequireAuth, RequireIntroSeen, RequireProfile, RootRedirect } from "@/routes/guards";
import { ScrollToTop } from "@/components/ScrollToTop/ScrollToTop";
import { AppShell } from "@/components/AppShell/AppShell";
import IntroPage from "@/routes/IntroPage";
import LoginPage from "@/routes/LoginPage";
import ProfilesPage from "@/routes/ProfilesPage";
import HomePage from "@/routes/HomePage";
import TitleDetailPage from "@/routes/TitleDetailPage";
import WatchPage from "@/routes/WatchPage";
import GalleryPage from "@/routes/GalleryPage";
import TimelinePage from "@/routes/TimelinePage";
import LetterPage from "@/routes/LetterPage";
import CreditsPage from "@/routes/CreditsPage";
import NotFoundPage from "@/routes/NotFoundPage";

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/intro" element={<IntroPage />} />

        {/* Every route below requires the intro to have played this page load first. */}
        <Route element={<RequireIntroSeen />}>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<RequireAuth />}>
            <Route path="/profiles" element={<ProfilesPage />} />

            <Route element={<RequireProfile />}>
              {/* Shared nav/search/Easter-egg chrome for the browsing pages. */}
              <Route element={<AppShell />}>
                <Route path="/home" element={<HomePage />} />
                <Route path="/title/:id" element={<TitleDetailPage />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/timeline" element={<TimelinePage />} />
              </Route>

              {/* Full-screen / minimal-chrome pages intentionally stay outside AppShell. */}
              <Route path="/watch/:id" element={<WatchPage />} />
              <Route path="/letter" element={<LetterPage />} />
              <Route path="/credits" element={<CreditsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
