/**
 * STT Provider Test API
 * Tests STT provider configuration and API key validity
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const diagnostics: Record<string, unknown> = {
      environment: {
        hasHuggingFaceKey: !!process.env.HUGGINGFACE_API_KEY,
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        sttProvider: process.env.STT_PROVIDER || "auto",
        huggingFaceKeyPrefix: process.env.HUGGINGFACE_API_KEY
          ? process.env.HUGGINGFACE_API_KEY.substring(0, 5) + "..."
          : "not set",
      },
    };

    // Determine which provider would be selected
    const provider = process.env.STT_PROVIDER || "auto";
    let selectedProvider: "huggingface" | "openai" | "none";
    
    if (provider === "huggingface" || provider === "openai") {
      selectedProvider = provider;
    } else {
      // Auto-detect
      if (process.env.HUGGINGFACE_API_KEY) {
        selectedProvider = "huggingface";
      } else if (process.env.OPENAI_API_KEY) {
        selectedProvider = "openai";
      } else {
        selectedProvider = "none";
      }
    }

    diagnostics.selectedProvider = selectedProvider;

    // Test Hugging Face API key if available
    if (process.env.HUGGINGFACE_API_KEY) {
      const hfTests: Record<string, unknown> = {};
      
      // Test 1: whoami endpoint (general API access)
      try {
        const testResponse = await fetch("https://huggingface.co/api/whoami-v2", {
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          },
        });

        if (testResponse.ok) {
          try {
            const responseText = await testResponse.text();
            if (responseText) {
              const userInfo = JSON.parse(responseText);
              hfTests.whoami = {
                valid: true,
                userName: userInfo.name || "unknown",
              };
            } else {
              hfTests.whoami = {
                valid: false,
                error: "Empty response",
              };
            }
          } catch (parseError) {
            hfTests.whoami = {
              valid: false,
              error: "Failed to parse response",
            };
          }
        } else {
          const errorText = await testResponse.text();
          hfTests.whoami = {
            valid: false,
            error: `HTTP ${testResponse.status}`,
            errorText: errorText || "No error message",
          };
        }
      } catch (error) {
        hfTests.whoami = {
          valid: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }

      // Test 2: Inference API endpoint (the one actually used for transcription)
      // Test with a minimal request to see if we get auth error
      try {
        const model = "openai/whisper-large-v3";
        const inferenceUrl = `https://router.huggingface.co/hf-inference/models/${model}`;
        
        // We can't test with actual file here, just surface the endpoint info.
        
        hfTests.inferenceApi = {
          endpoint: inferenceUrl,
          model: model,
          note: "Will be tested during actual transcription request",
        };
      } catch (error) {
        hfTests.inferenceApi = {
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }

      // Overall assessment
      const whoamiTest = hfTests.whoami as Record<string, unknown> | undefined;
      diagnostics.huggingFace = {
        ...hfTests,
        keyValid: whoamiTest?.valid === true,
        overallStatus: whoamiTest?.valid === true 
          ? "API key is valid for general access. Inference API will be tested during actual transcription."
          : "API key validation failed. Check your token.",
      };
    }

    // Test OpenAI API key if available
    if (process.env.OPENAI_API_KEY) {
      diagnostics.openAI = {
        keySet: true,
        keyPrefix: process.env.OPENAI_API_KEY.substring(0, 7) + "...",
        // Note: We don't test OpenAI key here to avoid unnecessary API calls
      };
    }

    const recommendations: string[] = [];

    if (selectedProvider === "none") {
      recommendations.push("❌ No STT provider configured. Set HUGGINGFACE_API_KEY (free, recommended) or OPENAI_API_KEY");
    } else if (selectedProvider === "huggingface") {
      const hf = diagnostics.huggingFace as Record<string, unknown> | undefined;
      if (hf?.keyValid) {
        recommendations.push(`✅ Hugging Face is selected and API key is valid!`);
        recommendations.push(`✅ Provider: ${selectedProvider}`);
      } else {
        recommendations.push(`❌ Hugging Face is selected but API key is invalid`);
        recommendations.push(`💡 Check your HUGGINGFACE_API_KEY in .env.local`);
        recommendations.push(`💡 Get a new key from: https://huggingface.co/settings/tokens`);
      }
    } else if (selectedProvider === "openai") {
      recommendations.push(`⚠️ OpenAI is selected (paid). Hugging Face (free) is available but not being used.`);
      recommendations.push(`💡 To use Hugging Face, set STT_PROVIDER=huggingface or remove OPENAI_API_KEY`);
    }

    return NextResponse.json({
      success: true,
      diagnostics,
      recommendations,
    });
  } catch (error) {
    logger.error("STT test error", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

