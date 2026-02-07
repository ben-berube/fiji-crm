import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { indexMember } from "@/lib/member-indexing";

// POST /api/embeddings - Index member(s): generate embedding + infer industry
// Body options:
//   { memberId: "..." }         - index a single member
//   { onlyMissing: true }       - only index members without embeddings
//   {} or no body               - re-index all members
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { memberId, onlyMissing } = body;

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured. Cannot generate embeddings." },
      { status: 503 }
    );
  }

  try {
    let memberIds: string[];

    if (memberId) {
      // Single member
      memberIds = [memberId];
    } else if (onlyMissing) {
      // Only members without embeddings
      const results = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM "Member" WHERE embedding IS NULL ORDER BY "updatedAt" DESC`
      );
      memberIds = results.map((r) => r.id);
    } else {
      // All members
      const results = await prisma.member.findMany({
        select: { id: true },
        orderBy: { updatedAt: "desc" },
      });
      memberIds = results.map((r) => r.id);
    }

    if (memberIds.length === 0) {
      return NextResponse.json({
        message: "No members to index",
        updated: 0,
        errors: 0,
        total: 0,
      });
    }

    // Process members: generate embeddings + infer industry
    let updated = 0;
    let errors = 0;

    for (let i = 0; i < memberIds.length; i++) {
      try {
        await indexMember(memberIds[i]);
        updated++;
      } catch (err) {
        console.error(`Error indexing member ${memberIds[i]}:`, err);
        errors++;
      }

      // Rate limiting: pause every 5 members
      if (i > 0 && i % 5 === 0) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    return NextResponse.json({
      message: `Indexed ${updated} of ${memberIds.length} members`,
      updated,
      errors,
      total: memberIds.length,
    });
  } catch (error) {
    console.error("Embedding generation error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to generate embeddings", details: errorMessage },
      { status: 500 }
    );
  }
}

// GET /api/embeddings - Get indexing status
export async function GET() {
  try {
    const [total, indexed] = await Promise.all([
      prisma.member.count(),
      prisma.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT COUNT(*) as count FROM "Member" WHERE embedding IS NOT NULL`
      ),
    ]);

    const indexedCount = Number(indexed[0]?.count || 0);

    return NextResponse.json({
      total,
      indexed: indexedCount,
      pending: total - indexedCount,
      percentComplete: total > 0 ? Math.round((indexedCount / total) * 100) : 100,
    });
  } catch (error) {
    console.error("Failed to get indexing status:", error);
    return NextResponse.json(
      { error: "Failed to get indexing status" },
      { status: 500 }
    );
  }
}
