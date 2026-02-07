import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export const maxDuration = 60;

// ---------- AI Provider Setup ----------

type AIProvider = "openai" | "gemini" | "none";

function getActiveProvider(): AIProvider {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "none";
}

// Stream chat using Gemini
async function* streamWithGemini(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  message: string
): AsyncGenerator<string> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
  });

  const chatHistory = history.slice(-20).map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("model" as const),
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({ history: chatHistory });
  const result = await chat.sendMessageStream(message);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}

// Stream chat using OpenAI
async function* streamWithOpenAI(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  message: string
): AsyncGenerator<string> {
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  for (const h of history.slice(-20)) {
    if (h.role === "user" || h.role === "assistant") {
      messages.push({ role: h.role, content: h.content });
    }
  }
  messages.push({ role: "user", content: message });

  const stream = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    stream: true,
    max_tokens: 1024,
    temperature: 0.7,
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) yield text;
  }
}

// ---------- Member Search ----------

async function searchMembers(query: string) {
  try {
    // Try semantic search if embeddings exist and Gemini is available
    if (process.env.GEMINI_API_KEY) {
      try {
        const embeddingCount = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
          `SELECT COUNT(*) as count FROM "Member" WHERE embedding IS NOT NULL`
        );
        if (Number(embeddingCount[0]?.count || 0) > 0) {
          const { generateEmbedding } = await import("@/lib/gemini");
          const embedding = await generateEmbedding(query);
          const embeddingStr = `[${embedding.join(",")}]`;

          const results = await prisma.$queryRawUnsafe(
            `SELECT m.id, m."firstName", m."lastName", m.email, m.phone, m.city, m.state,
                    m."graduationYear", m.major, m.status, m.company, m."jobTitle", m.industry, m.bio
             FROM "Member" m WHERE m.embedding IS NOT NULL
             ORDER BY m.embedding <=> $1::vector LIMIT 10`,
            embeddingStr
          );
          if (Array.isArray(results) && results.length > 0) return results;
        }
      } catch (e) {
        console.warn("Semantic search failed, falling back to text:", e);
      }
    }
  } catch {
    // Fall through to text search
  }

  // Text search fallback (always works)
  return textSearchMembers(query);
}

async function textSearchMembers(query: string) {
  try {
    const words = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);

    if (words.length === 0) {
      return prisma.member.findMany({
        take: 15,
        orderBy: { updatedAt: "desc" },
        include: { tags: true },
      });
    }

    const conditions = words.flatMap((word) => [
      { firstName: { contains: word, mode: "insensitive" as const } },
      { lastName: { contains: word, mode: "insensitive" as const } },
      { city: { contains: word, mode: "insensitive" as const } },
      { state: { contains: word, mode: "insensitive" as const } },
      { industry: { contains: word, mode: "insensitive" as const } },
      { company: { contains: word, mode: "insensitive" as const } },
      { jobTitle: { contains: word, mode: "insensitive" as const } },
      { major: { contains: word, mode: "insensitive" as const } },
    ]);

    return prisma.member.findMany({
      where: { OR: conditions },
      take: 15,
      include: { tags: true },
    });
  } catch (error) {
    console.error("Text search error:", error);
    return prisma.member.findMany({
      take: 10,
      orderBy: { updatedAt: "desc" },
      include: { tags: true },
    });
  }
}

// ---------- Formatting ----------

function formatMemberContext(members: Array<Record<string, unknown>>): string {
  if (members.length === 0) return "No matching brothers found.";

  return members
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
        Array.isArray(r.tags) && r.tags.length > 0
          ? `Tags: ${r.tags.map((t: { name: string }) => t.name).join(", ")}`
          : null,
      ];
      return parts.filter(Boolean).join(" | ");
    })
    .join("\n");
}

// ---------- Main Handler ----------

export async function POST(req: NextRequest) {
  // Parse request
  let message: string;
  let history: Array<{ role: string; content: string }>;
  try {
    const body = await req.json();
    message = body.message;
    history = body.history || [];
  } catch {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }

  if (!message || typeof message !== "string" || !message.trim()) {
    return jsonResponse({ error: "Message is required" }, 400);
  }

  const provider = getActiveProvider();
  if (provider === "none") {
    return jsonResponse(
      { error: "No AI provider configured. Please set GEMINI_API_KEY or OPENAI_API_KEY." },
      503
    );
  }

  try {
    // Search for members
    const members = await searchMembers(message.trim());
    const context = formatMemberContext(members as Array<Record<string, unknown>>);

    let totalCount = 0;
    try {
      totalCount = await prisma.member.count();
    } catch {
      // Non-fatal
    }

    const systemPrompt = `You are the FIJI CRM assistant for the University of San Diego Phi Gamma Delta chapter. You help brothers find and connect with other brothers in the fraternity.

You have access to a directory of ${totalCount} brothers. Based on the user's question, here are the most relevant brothers from the directory:

${context}

Guidelines:
- Be helpful, warm, and brotherly in tone
- Answer questions about who's in what industry, location, or graduation year
- If asked to find brothers matching certain criteria, list the relevant matches from the search results
- Include contact info (email, phone) when listing brothers so they can connect
- If the search results don't contain a good match, say so honestly
- Never make up information about brothers that isn't in the data
- Keep responses concise but informative`;

    // Try primary provider, fall back to the other
    let streamGen: AsyncGenerator<string>;
    try {
      streamGen =
        provider === "gemini"
          ? streamWithGemini(systemPrompt, history, message)
          : streamWithOpenAI(systemPrompt, history, message);
    } catch (primaryError) {
      console.error(`Primary provider (${provider}) failed:`, primaryError);
      // Try the other provider as fallback
      const fallback = provider === "gemini" ? "openai" : "gemini";
      const fallbackKey =
        fallback === "gemini"
          ? process.env.GEMINI_API_KEY
          : process.env.OPENAI_API_KEY;

      if (fallbackKey) {
        console.log(`Falling back to ${fallback}`);
        streamGen =
          fallback === "gemini"
            ? streamWithGemini(systemPrompt, history, message)
            : streamWithOpenAI(systemPrompt, history, message);
      } else {
        throw primaryError;
      }
    }

    // Convert to SSE
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const text of streamGen) {
            if (text) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (streamError) {
          console.error("Stream error:", streamError);
          const errorMsg =
            streamError instanceof Error
              ? streamError.message
              : "An unexpected error occurred";

          // Provide user-friendly error messages
          let userMessage = `Sorry, I encountered an error. Please try again.`;
          if (errorMsg.includes("quota") || errorMsg.includes("429")) {
            userMessage = `The AI service is temporarily at capacity. Please try again in a moment.`;
          } else if (errorMsg.includes("API key") || errorMsg.includes("auth")) {
            userMessage = `The AI service is not properly configured. Please contact an administrator.`;
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ text: `\n\n${userMessage}` })}\n\n`
            )
          );
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
    const msg = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse({ error: "Chat failed", details: msg }, 500);
  }
}

function jsonResponse(data: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
