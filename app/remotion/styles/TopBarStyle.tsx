/**
 * Top-Bar Caption Style (News-Style)
 * Semi-transparent background bar at top
 */

import { useVideoConfig } from "remotion";
import type { Caption } from "@/types";

interface TopBarStyleProps {
  caption: Caption;
}

export const TopBarStyle: React.FC<TopBarStyleProps> = ({ caption }) => {
  const { height } = useVideoConfig();

  return (
    <div
      style={{
        position: "absolute",
        top: height * 0.05, // 5% from top
        left: 0,
        width: "100%",
        backgroundColor: "rgba(0,0,0,0.7)",
        padding: "15px 30px",
        textAlign: "center",
        fontFamily: "Noto Sans, Noto Sans Devanagari, Arial, sans-serif",
        fontSize: 28,
        color: "#FFFFFF",
        zIndex: 10,
      }}
    >
      {caption.text}
    </div>
  );
};

