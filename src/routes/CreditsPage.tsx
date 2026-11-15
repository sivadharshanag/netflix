import { useMedia } from "@/context/MediaContext";
import { EndCredits } from "@/components/EndCredits/EndCredits";
import { LoadingScreen } from "@/components/LoadingScreen/LoadingScreen";

export default function CreditsPage() {
  const { editorial, itemsById, loading } = useMedia();

  if (loading || !editorial) return <LoadingScreen />;

  return <EndCredits content={editorial.endCredits} itemsById={itemsById} />;
}
