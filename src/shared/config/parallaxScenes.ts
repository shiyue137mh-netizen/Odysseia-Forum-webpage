import back1 from "@/assets/parallax/back1.webp";
import back2 from "@/assets/parallax/back2.webp";
import back3 from "@/assets/parallax/back3.webp";
import back4 from "@/assets/parallax/back4.webp";
import front1 from "@/assets/parallax/front1.webp";
import front2 from "@/assets/parallax/front2.webp";
import front3 from "@/assets/parallax/front3.webp";
import front4 from "@/assets/parallax/front4.webp";

export const parallaxScenes = [
  { background: back1, foreground: front1, foregroundFit: "contain" },
  { background: back2, foreground: front2, foregroundFit: "cover" },
  { background: back3, foreground: front3, foregroundFit: "cover" },
  { background: back4, foreground: front4, foregroundFit: "cover" },
] as const;
