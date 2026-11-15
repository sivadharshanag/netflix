import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen/LoadingScreen";
import { hasShownIntro } from "@/state/introState";

/**
 * Enforces "intro first" as an explicit route guard (not just CSS/initial
 * routing): any route other than /intro redirects back to it unless the
 * intro has already played during this page load. Because introState.ts is
 * a plain in-memory module variable, this resets on every real page
 * load/refresh but stays satisfied across client-side navigation.
 */
export function RequireIntroSeen() {
  if (!hasShownIntro()) return <Navigate to="/intro" replace />;
  return <Outlet />;
}

export function RequireAuth() {
  const { authenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!authenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

export function RequireProfile() {
  const hasProfile = sessionStorage.getItem("varunika:profileSelected") === "true";
  if (!hasProfile) return <Navigate to="/profiles" replace />;
  return <Outlet />;
}

export function RootRedirect() {
  const { authenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;

  if (!hasShownIntro()) return <Navigate to="/intro" replace />;

  if (!authenticated) return <Navigate to="/login" replace />;

  const hasProfile = sessionStorage.getItem("varunika:profileSelected") === "true";
  return <Navigate to={hasProfile ? "/home" : "/profiles"} replace />;
}
