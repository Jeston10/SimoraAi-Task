/**
 * Remotion Root Component
 * This is the entry point for all Remotion compositions
 */

import { Composition } from "remotion";
import { CaptionVideo } from "./CaptionVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="CaptionVideo"
        component={CaptionVideo as React.ComponentType<any>}
        durationInFrames={300} // Default 10 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          videoUrl: "",
          captions: [],
          style: "bottom",
        }}
      />
    </>
  );
};

