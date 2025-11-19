/**
 * STT Key Validation API
 * Validates and tests the Hugging Face API key directly
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    
    const diagnostics: Record<string, unknown> = {
      keyExists: !!apiKey,
      keyLength: apiKey?.length || 0,
      keyPrefix: apiKey ? apiKey.substring(0, 10) + "..." : "not set",
      keyStartsWithHF: apiKey?.startsWith("hf_") || false,
      hasSpaces: apiKey?.includes(" ") || false,
      hasQuotes: (apiKey?.startsWith('"') && apiKey?.endsWith('"')) || 
                 (apiKey?.startsWith("'") && apiKey?.endsWith("'")) || false,
    };

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "HUGGINGFACE_API_KEY is not set in environment variables",
        diagnostics,
        recommendations: [
          "Set HUGGINGFACE_API_KEY in .env.local",
          "Make sure the file is named exactly .env.local (not env.local or .env)",
          "Restart your dev server after adding the key",
        ],
      });
    }

    // Check key format
    const trimmedKey = apiKey.trim();
    const issues: string[] = [];
    
    if (!trimmedKey.startsWith("hf_")) {
      issues.push("Key should start with 'hf_'");
    }
    if (trimmedKey.length < 20) {
      issues.push("Key seems too short (should be longer)");
    }
    if (apiKey.includes(" ")) {
      issues.push("Key contains spaces - remove any spaces");
    }
    if ((apiKey.startsWith('"') && apiKey.endsWith('"')) || 
        (apiKey.startsWith("'") && apiKey.endsWith("'"))) {
      issues.push("Key is wrapped in quotes - remove quotes from .env.local");
    }
    if (trimmedKey.includes("your-") || trimmedKey.includes("placeholder")) {
      issues.push("Key appears to be a placeholder - use your actual key");
    }

    // Test the key with Hugging Face API
    let apiTest: Record<string, unknown> = {};
    try {
      const testResponse = await fetch("https://huggingface.co/api/whoami-v2", {
        headers: {
          Authorization: `Bearer ${trimmedKey}`,
        },
      });

      if (testResponse.ok) {
        const userInfo = await testResponse.json();
        apiTest = {
          valid: true,
          userName: userInfo.name || "unknown",
          email: userInfo.email || "not shown",
        };
      } else {
        const errorText = await testResponse.text();
        apiTest = {
          valid: false,
          status: testResponse.status,
          error: errorText || "Unknown error",
        };
      }
    } catch (error) {
      apiTest = {
        valid: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // Test inference API endpoint (the one actually used)
    let inferenceTest: Record<string, unknown> = {};
    try {
      // Just test if we can reach the endpoint (without sending a file)
      const model = "openai/whisper-large-v3";
      const inferenceUrl = `https://api-inference.huggingface.co/models/${model}`;
      
      // Make a HEAD request to check endpoint
      const headResponse = await fetch(inferenceUrl, {
        method: "HEAD",
        headers: {
          Authorization: `Bearer ${trimmedKey}`,
        },
      });

      inferenceTest = {
        endpoint: inferenceUrl,
        reachable: headResponse.status !== 404,
        status: headResponse.status,
        statusText: headResponse.statusText,
      };
    } catch (error) {
      inferenceTest = {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    const recommendations: string[] = [];

    if (issues.length > 0) {
      recommendations.push("❌ Key format issues found:");
      issues.forEach(issue => recommendations.push(`  - ${issue}`));
    }

    if (apiTest.valid === true) {
      recommendations.push("✅ API key is valid for general Hugging Face access");
    } else if (apiTest.valid === false) {
      recommendations.push("❌ API key validation failed");
      recommendations.push(`   Status: ${apiTest.status || "unknown"}`);
      recommendations.push(`   Error: ${apiTest.error || "unknown"}`);
      recommendations.push("   Get a new key from: https://huggingface.co/settings/tokens");
    }

    if (inferenceTest.reachable === false) {
      recommendations.push("⚠️ Inference API endpoint might not be accessible");
    }

    if (apiKey !== trimmedKey) {
      recommendations.push("⚠️ Key has leading/trailing whitespace - this has been trimmed for testing");
    }

    return NextResponse.json({
      success: issues.length === 0 && apiTest.valid === true,
      diagnostics: {
        ...diagnostics,
        trimmedKey: trimmedKey.substring(0, 10) + "...",
        issues,
        apiTest,
        inferenceTest,
      },
      recommendations,
    });
  } catch (error) {
    logger.error("STT validation error", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


