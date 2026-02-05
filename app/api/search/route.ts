import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateEmbedding } from "@/lib/openai";

// POST /api/search - Semantic search across members
export async function POST(req: NextRequest) {
  const { query, limit = 10 } = await req.json();

  if (!query) {
    return NextResponse.json(
      { error: "Query is required" },
      { status: 400 }
    );
  }

  try {
    const embedding = await generateEmbedding(query);
    const embeddingStr = `[${embedding.join(",")}]`;

    const results = await prisma.$queryRawUnsafe(
      `
      SELECT
        m.id,
        m."firstName",
        m."lastName",
        m.email,
        m.phone,
        m.city,
        m.state,
        m."graduationYear",
        m.major,
        m.status,
        m.company,
        m."jobTitle",
        m.industry,
        m.bio,
        1 - (m.embedding <=> $1::vector) as similarity
      FROM "Member" m
      WHERE m.embedding IS NOT NULL
      ORDER BY m.embedding <=> $1::vector
      LIMIT $2
      `,
      embeddingStr,
      limit
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
