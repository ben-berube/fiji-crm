import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { openai, generateEmbedding } from "@/lib/openai";

// POST /api/chat - AI chatbot with semantic search context
export async function POST(req: NextRequest) {
  const { message, history = [] } = await req.json();

  if (!message) {
    return new Response(JSON.stringify({ error: "Message is required" }), {
      status: 400,
    });
  }

  try {
    // Semantic search for context
    const embedding = await generateEmbedding(message);
    const embeddingStr = `[${embedding.join(",")}]`;

    const results: Array<{
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
      similarity: number;
    }> = await prisma.$queryRawUnsafe(
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
        m.bio,
        1 - (m.embedding <=> $1::vector) as similarity
      FROM "Member" m
      WHERE m.embedding IS NOT NULL
      ORDER BY m.embedding <=> $1::vector
      LIMIT 10
      `,
      embeddingStr
    );

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

You have access to a directory of ${totalCount} brothers. Based on the user's question, here are the most relevant brothers from a semantic search:

${context}

Guidelines:
- Be helpful, warm, and brotherly in tone
- Answer questions about who's in what industry, location, or graduation year
- If asked to find brothers matching certain criteria, list the relevant matches from the search results
- Include contact info (email, phone) when listing brothers so they can connect
- If the search results don't contain a good match, say so honestly
- Never make up information about brothers that isn't in the data
- Keep responses concise but informative
- Use the FIJI motto "Not Merely for College Days Alone" when appropriate`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...history.map((h: { role: string; content: string }) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user" as const, content: message },
    ];

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 1000,
    });

    // Create a ReadableStream
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
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
