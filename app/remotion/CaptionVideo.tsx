/**
 * Main Remotion Composition for rendering video with captions
 */

import { useVideoConfig, useCurrentFrame, Video } from "remotion";
import type { Caption, CaptionStyleId } from "@/types";
import { BottomCenteredStyle } from "./styles/BottomCenteredStyle";
import { TopBarStyle } from "./styles/TopBarStyle";
import { KaraokeStyle } from "./styles/KaraokeStyle";

interface CaptionVideoProps {
  videoUrl: string;
  captions: Caption[];
  style: CaptionStyleId;
}

export const CaptionVideo: React.FC<CaptionVideoProps> = ({
  videoUrl,
  captions,
  style,
}) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const currentTime = frame / fps;

  // Find the current caption based on time
  const currentCaption = captions.find(
    (caption) => currentTime >= caption.start && currentTime <= caption.end
  );

  // Render the appropriate caption style
  const renderCaption = () => {
    if (!currentCaption) return null;

    switch (style) {
      case "bottom":
        return <BottomCenteredStyle caption={currentCaption} />;
      case "top":
        return <TopBarStyle caption={currentCaption} />;
      case "karaoke":
        return (
          <KaraokeStyle caption={currentCaption} currentTime={currentTime} />
        );
      default:
        return <BottomCenteredStyle caption={currentCaption} />;
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#000",
        position: "relative",
      }}
    >
      {videoUrl && (
        <Video
          src={videoUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      )}
      {renderCaption()}
    </div>
  );
};

