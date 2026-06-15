import PulsePlayApp from "../components/pulseplay-app";
import { getTopScores } from "../lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initialScores = await getTopScores();

  return <PulsePlayApp initialScores={initialScores} />;
}
