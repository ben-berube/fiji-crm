import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { generateEmbedding, streamChat } from "@/lib/gemini";

// POST /api/chat - AI chatbot with semantic search context
export async function POST(req: NextRequest) {
  const { message, history = [] } = await req.json();

  if (!message) {
    return new Response(JSON.stringify({ error: "Message is required" }), {
      status: 400,
    });
  }

  try {
    // Check if any members have embeddings
    const embeddingCount = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count FROM "Member" WHERE embedding IS NOT NULL`
    );
    const hasEmbeddings = Number(embeddingCount[0]?.count || 0) > 0;

    let results: Array<{
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
      city: string | null;
      state: string | null;
      graduationYear: number | null;
      major: string | null;
      status: string;
      company: string | null;
      jobTitle: string | null;
      industry: string | null;
      bio: string | null;
    }> = [];

    if (hasEmbeddings) {
      // Semantic search for context
      const embedding = await generateEmbedding(message);
      const embeddingStr = `[${embedding.join(",")}]`;

      results = await prisma.$queryRawUnsafe(
        `
        SELECT
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
          m.bio
        FROM "Member" m
        WHERE m.embedding IS NOT NULL
        ORDER BY m.embedding <=> $1::vector
        LIMIT 10
        `,
        embeddingStr
      );
    } else {
      // Fallback: simple text search on name, city, state, industry
      const searchTerm = `%${message.toLowerCase()}%`;
      results = await prisma.$queryRawUnsafe(
        `
        SELECT
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
          m.bio
        FROM "Member" m
        WHERE 
          LOWER(m."firstName") LIKE $1 OR
          LOWER(m."lastName") LIKE $1 OR
          LOWER(COALESCE(m.city, '')) LIKE $1 OR
          LOWER(COALESCE(m.state, '')) LIKE $1 OR
          LOWER(COALESCE(m.industry, '')) LIKE $1 OR
          LOWER(COALESCE(m.company, '')) LIKE $1
        LIMIT 15
        `,
        searchTerm
      );
    }

    // Build context from results
    const context = results
      .map((r, i) => {
        const parts = [
          `${i + 1}. ${r.firstName} ${r.lastName}`,
          r.status ? `Status: ${r.status}` : null,
          r.graduationYear ? `Class of ${r.graduationYear}` : null,
          r.major ? `Major: ${r.major}` : null,
          r.company ? `Company: ${r.company}` : null,
          r.jobTitle ? `Title: ${r.jobTitle}` : null,
          r.industry ? `Industry: ${r.industry}` : null,
          r.city || r.state
            ? `Location: ${[r.city, r.state].filter(Boolean).join(", ")}`
            : null,
          r.email ? `Email: ${r.email}` : null,
          r.phone ? `Phone: ${r.phone}` : null,
          r.bio ? `Bio: ${r.bio}` : null,
        ];
        return parts.filter(Boolean).join(" | ");
      })
      .join("\n");

    // Get total member count for context
    const totalCount = await prisma.member.count();

    const systemPrompt = `You are the FIJI CRM assistant for the University of San Diego Phi Gamma Delta chapter. You help brothers find and connect with other brothers in the fraternity.

You have access to a directory of ${totalCount} brothers. Based on the user's question, here are the most relevant brothers from the directory:

${context || "No matching brothers found for this query."}

Guidelines:
- Be helpful, warm, and brotherly in tone
- Answer questions about who's in what industry, location, or graduation year
- If asked to find brothers matching certain criteria, list the relevant matches from the search results
- Include contact info (email, phone) when listing brothers so they can connect
- If the search results don't contain a good match, say so honestly
- Never make up information about brothers that isn't in the data
- Keep responses concise but informative
- Use the FIJI motto "Not Merely for College Days Alone" when appropriate`;

    // Format history for Gemini
    const chatHistory = history.map((h: { role: string; content: string }) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    }));

    // Create a ReadableStream using Gemini
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const text of streamChat(systemPrompt, chatHistory, message)) {
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          console.error("Stream error:", err);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: "Sorry, I encountered an error. Please try again." })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        }
        controller.close();
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: "Chat failed" }), {
      status: 500,
    });
  }
}
