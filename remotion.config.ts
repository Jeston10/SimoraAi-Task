import { Config } from "@remotion/cli/config";

// Remotion configuration
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setPixelFormat("yuv420p");
Config.setCodec("h264");

// Set output directory
Config.setOutputLocation("out/video.mp4");

// Enable progress bar
Config.setLevel("info");

// Set entry point for Remotion
Config.setEntryPoint("./remotion/index.ts");

