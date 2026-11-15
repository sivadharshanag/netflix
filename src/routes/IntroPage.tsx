import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { IntroSequence } from "@/components/IntroSequence/IntroSequence";
import { markIntroShown } from "@/state/introState";

export default function IntroPage() {
  const navigate = useNavigate();
  const { authenticated } = useAuth();

  function complete() {
    markIntroShown();
    if (!authenticated) {
      navigate("/login", { replace: true });
      return;
    }
    const hasProfile = sessionStorage.getItem("varunika:profileSelected") === "true";
    navigate(hasProfile ? "/home" : "/profiles", { replace: true });
  }

  return <IntroSequence onComplete={complete} />;
}
