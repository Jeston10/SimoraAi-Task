/**
 * Storage Diagnostic API
 * Tests storage configuration and connectivity
 */

import { NextResponse } from "next/server";
import { getStorageStatus } from "@/lib/storage";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const status = getStorageStatus();
    const diagnostics: Record<string, unknown> = {
      storageStatus: status,
      environment: {
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasVercelToken: !!process.env.VERCEL_BLOB_STORAGE_TOKEN,
        storageProvider: process.env.STORAGE_PROVIDER || "auto",
        bucketName: process.env.SUPABASE_STORAGE_BUCKET || "videos",
      },
    };

    // Test Supabase connection if configured
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        const bucket = process.env.SUPABASE_STORAGE_BUCKET || "videos";

        // Check if bucket exists
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        
        diagnostics.supabase = {
          connected: true,
          buckets: buckets?.map((b) => ({ name: b.name, public: b.public })),
          targetBucket: bucket,
          bucketExists: buckets?.some((b) => b.name === bucket) || false,
          listError: listError ? listError.message : null,
        };

        // Try to get bucket info
        const supabaseInfo = diagnostics.supabase as Record<string, unknown>;
        if (supabaseInfo.bucketExists) {
          const { error: filesError } = await supabase.storage
            .from(bucket)
            .list("", { limit: 1 });
          
          supabaseInfo.bucketAccessible = !filesError;
          supabaseInfo.filesError = filesError ? filesError.message : null;
        }
      } catch (error) {
        diagnostics.supabase = {
          connected: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }

    return NextResponse.json({
      success: true,
      diagnostics,
      recommendations: getRecommendations(diagnostics),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

function getRecommendations(diagnostics: Record<string, unknown>): string[] {
  const recommendations: string[] = [];
  const env = diagnostics.environment as Record<string, unknown>;

  if (!env.hasSupabaseUrl && !env.hasVercelToken) {
    recommendations.push("❌ No storage provider configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (recommended) or VERCEL_BLOB_STORAGE_TOKEN");
  }

  if (env.hasSupabaseUrl && !env.hasSupabaseKey) {
    recommendations.push("❌ SUPABASE_URL is set but SUPABASE_SERVICE_ROLE_KEY is missing. Get it from Supabase Dashboard > Settings > API > service_role (secret)");
  }

  if (env.hasSupabaseKey && !env.hasSupabaseUrl) {
    recommendations.push("❌ SUPABASE_SERVICE_ROLE_KEY is set but SUPABASE_URL is missing. Get it from Supabase Dashboard > Settings > API > Project URL");
  }

  const supabase = diagnostics.supabase as Record<string, unknown> | undefined;
  if (supabase) {
    if (!supabase.connected) {
      recommendations.push("❌ Cannot connect to Supabase. Check your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are correct");
      recommendations.push("💡 Make sure you're using the service_role key (NOT the anon key)");
    } else if (!supabase.bucketExists) {
      recommendations.push(`❌ Bucket "${supabase.targetBucket}" does not exist. Create it in Supabase Dashboard > Storage`);
      recommendations.push(`💡 The bucket will be auto-created, but you should make it PUBLIC manually`);
    } else if (!supabase.bucketAccessible) {
      recommendations.push(`❌ Bucket "${supabase.targetBucket}" exists but is not accessible`);
      recommendations.push(`💡 Make the bucket PUBLIC: Supabase Dashboard > Storage > ${supabase.targetBucket} > Settings > Toggle "Public bucket" to ON`);
      recommendations.push(`💡 This is usually caused by Row Level Security (RLS) policies blocking access`);
    } else {
      recommendations.push(`✅ Bucket "${supabase.targetBucket}" is configured correctly!`);
    }
  }

  // Add general recommendations
  if (env.hasSupabaseUrl && env.hasSupabaseKey) {
    recommendations.push("💡 After fixing issues, restart your dev server (Ctrl+C, then npm run dev)");
    recommendations.push("💡 Check SUPABASE_STORAGE_FIX.md for detailed troubleshooting steps");
  }

  return recommendations;
}

