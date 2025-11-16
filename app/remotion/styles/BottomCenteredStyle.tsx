/**
 * Bottom-Centered Caption Style (Standard)
 * White text with black outline, centered at bottom
 */

import { useVideoConfig } from "remotion";
import type { Caption } from "@/types";

interface BottomCenteredStyleProps {
  caption: Caption;
}

export const BottomCenteredStyle: React.FC<BottomCenteredStyleProps> = ({
  caption,
}) => {
  const { width, height } = useVideoConfig();

  return (
    <div
      style={{
        position: "absolute",
        bottom: height * 0.1, // 10% from bottom
        left: "50%",
        transform: "translateX(-50%)",
        textAlign: "center",
        padding: "10px 20px",
        borderRadius: 4,
        fontFamily: "Noto Sans, Noto Sans Devanagari, Arial, sans-serif",
        fontSize: 32,
        color: "#FFFFFF",
        textShadow: "2px 2px 4px rgba(0,0,0,0.8), -2px -2px 4px rgba(0,0,0,0.8)",
        maxWidth: width * 0.8,
        lineHeight: 1.4,
        zIndex: 10,
      }}
    >
      {caption.text}
    </div>
  );
};

