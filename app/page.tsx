import type { Metadata } from "next";
import GameDemo from "./GameDemo";

export const metadata: Metadata = {
  title: "Draw It, I'll Guess! | LumaVill",
  description: "A cozy drawing and guessing mini game with Mimi.",
};

export default function Home() {
  return <GameDemo />;
}
