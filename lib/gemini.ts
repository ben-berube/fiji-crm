import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;

function getGemini(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const model = getGemini().getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

export async function* streamChat(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string
): AsyncGenerator<string> {
  const model = getGemini().getGenerativeModel({ model: "gemini-1.5-flash" });

  // Build chat history
  const history = messages.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({
    history,
    systemInstruction: systemPrompt,
  });

  const result = await chat.sendMessageStream(userMessage);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      yield text;
    }
  }
}

export function buildMemberText(member: {
  firstName: string;
  lastName: string;
  graduationYear?: number | null;
  industry?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  city?: string | null;
  state?: string | null;
  major?: string | null;
  bio?: string | null;
  tags?: { name: string }[];
}): string {
  const parts = [
    `${member.firstName} ${member.lastName}`,
    member.graduationYear ? `Class of ${member.graduationYear}` : null,
    member.major ? `Major: ${member.major}` : null,
    member.industry ? `Industry: ${member.industry}` : null,
    member.company ? `Company: ${member.company}` : null,
    member.jobTitle ? `Role: ${member.jobTitle}` : null,
    member.city || member.state
      ? `Location: ${[member.city, member.state].filter(Boolean).join(", ")}`
      : null,
    member.bio ? `Bio: ${member.bio}` : null,
    member.tags && member.tags.length > 0
      ? `Tags: ${member.tags.map((t) => t.name).join(", ")}`
      : null,
  ];
  return parts.filter(Boolean).join(". ");
}
