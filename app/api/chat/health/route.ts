import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const maxDuration = 30;

interface ProviderResult {
  configured: boolean;
  working: boolean;
  error?: string;
  model?: string;
}

async function testGemini(): Promise<ProviderResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { configured: false, working: false, error: "GEMINI_API_KEY not set" };
  }

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent("Say hello in one word.");
    const text = result.response.text();
    if (!text) {
      return {
        configured: true,
        working: false,
        error: "Empty response from Gemini",
        model: "gemini-2.0-flash",
      };
    }
    return { configured: true, working: true, model: "gemini-2.0-flash" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { configured: true, working: false, error: msg, model: "gemini-2.0-flash" };
  }
}

async function testDatabase(): Promise<{
  connected: boolean;
  memberCount?: number;
  embeddingCount?: number;
  error?: string;
}> {
  try {
    const memberCount = await prisma.member.count();
    const embeddingResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count FROM "Member" WHERE embedding IS NOT NULL`
    );
    const embeddingCount = Number(embeddingResult[0]?.count || 0);
    return { connected: true, memberCount, embeddingCount };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { connected: false, error: msg };
  }
}

export async function GET() {
  const [gemini, database] = await Promise.all([
    testGemini(),
    testDatabase(),
  ]);

  return NextResponse.json({
    status: gemini.working && database.connected ? "healthy" : "unhealthy",
    provider: gemini,
    database,
    timestamp: new Date().toISOString(),
  });
}
