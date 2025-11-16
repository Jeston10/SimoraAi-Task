/**
 * Karaoke-Style Caption
 * Word-by-word highlighting with animation
 */

import { useVideoConfig } from "remotion";
import type { Caption } from "@/types";

interface KaraokeStyleProps {
  caption: Caption;
  currentTime: number;
}

export const KaraokeStyle: React.FC<KaraokeStyleProps> = ({
  caption,
  currentTime,
}) => {
  const { width, height } = useVideoConfig();

  // If caption has word-level timing, use it; otherwise highlight entire text
  const renderWords = () => {
    if (caption.words && caption.words.length > 0) {
      return caption.words.map((word, index) => {
        const isActive =
          currentTime >= word.start && currentTime <= word.end;
        return (
          <span
            key={index}
            style={{
              color: isActive ? "#FFD700" : "#FFFFFF",
              transition: "color 0.1s ease-in-out",
              marginRight: "8px",
            }}
          >
            {word.text}
          </span>
        );
      });
    }
    // Fallback: highlight entire text if no word timing
    return (
      <span
        style={{
          color: "#FFD700",
        }}
      >
        {caption.text}
      </span>
    );
  };

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
        fontSize: 36,
        textShadow: "2px 2px 4px rgba(0,0,0,0.8), -2px -2px 4px rgba(0,0,0,0.8)",
        maxWidth: width * 0.8,
        lineHeight: 1.4,
        zIndex: 10,
      }}
    >
      {renderWords()}
    </div>
  );
};

