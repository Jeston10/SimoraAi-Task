import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function GET() {
  return NextResponse.json({ success: true, message: "Debug endpoint OK" });
}

export async function POST(request: NextRequest) {
  try {
    logger.info("Debug POST received", {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
    });
  } catch (err) {
    console.warn("Failed to log debug POST", err);
  }

  const body = await request.text();
  return NextResponse.json({ success: true, message: "Debug POST received", bodyLength: body.length });
}
