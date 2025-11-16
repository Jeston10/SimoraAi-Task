/**
 * CLI Render Script
 * Use this script to render videos locally using Remotion CLI
 * 
 * Usage:
 *   npx tsx scripts/render-cli.ts <videoUrl> <captionsFile> <style> <quality> <output>
 * 
 * Example:
 *   npx tsx scripts/render-cli.ts ./video.mp4 ./captions.json bottom 1080p ./output.mp4
 */

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs/promises";

async function renderVideoCLI(
  videoUrl: string,
  captionsPath: string,
  style: "bottom" | "top" | "karaoke",
  quality: "720p" | "1080p",
  outputPath: string
) {
  console.log("Starting video render...");
  console.log(`Video: ${videoUrl}`);
  console.log(`Captions: ${captionsPath}`);
  console.log(`Style: ${style}`);
  console.log(`Quality: ${quality}`);
  console.log(`Output: ${outputPath}`);

  // Read captions
  const captionsData = await fs.readFile(captionsPath, "utf-8");
  const captions = JSON.parse(captionsData);

  // Determine resolution
  const width = quality === "1080p" ? 1920 : 1280;
  const height = quality === "1080p" ? 1080 : 720;

  // Bundle Remotion project
  console.log("Bundling Remotion project...");
  const bundleLocation = await bundle({
    entryPoint: path.resolve(process.cwd(), "remotion/index.ts"),
    webpackOverride: (config) => config, // Can customize webpack config here
  });

  // Select composition
  console.log("Selecting composition...");
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "CaptionVideo",
    inputProps: {
      videoUrl,
      captions,
      style,
    },
  });

  // Update composition dimensions
  composition.width = width;
  composition.height = height;

  // Render video
  console.log("Rendering video...");
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: outputPath,
    onProgress: ({ progress }) => {
      console.log(`Progress: ${Math.round(progress * 100)}%`);
    },
  });

  console.log(`✅ Video rendered successfully: ${outputPath}`);
}

// CLI interface
const args = process.argv.slice(2);
if (args.length < 5) {
  console.error("Usage: npx tsx scripts/render-cli.ts <videoUrl> <captionsFile> <style> <quality> <output>");
  console.error("Example: npx tsx scripts/render-cli.ts ./video.mp4 ./captions.json bottom 1080p ./output.mp4");
  process.exit(1);
}

const [videoUrl, captionsPath, style, quality, outputPath] = args;

if (!["bottom", "top", "karaoke"].includes(style)) {
  console.error("Style must be: bottom, top, or karaoke");
  process.exit(1);
}

if (!["720p", "1080p"].includes(quality)) {
  console.error("Quality must be: 720p or 1080p");
  process.exit(1);
}

renderVideoCLI(
  videoUrl,
  captionsPath,
  style as "bottom" | "top" | "karaoke",
  quality as "720p" | "1080p",
  outputPath
).catch((error) => {
  console.error("Render failed:", error);
  process.exit(1);
});

