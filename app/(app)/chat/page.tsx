"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Bot, User, Sparkles, AlertTriangle } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          history: messages,
        }),
      });

      if (!res.ok) {
        let errorMessage = "Chat request failed.";
        try {
          const errorBody = await res.json();
          if (errorBody.code === "NO_PROVIDER") {
            errorMessage =
              "Gemini API key is not configured. GEMINI_API_KEY must be set in Vercel Environment Variables.";
          } else if (errorBody.details) {
            errorMessage = `${errorBody.error}: ${errorBody.details}`;
          } else if (errorBody.error) {
            errorMessage = errorBody.error;
          }
        } catch {
          errorMessage = `Server error (${res.status}). The chat service may be down.`;
        }

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: errorMessage, isError: true },
        ]);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last.role === "assistant") {
                      last.content += parsed.text;
                    }
                    return updated;
                  });
                }
              } catch {
                // skip invalid JSON
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Could not connect to the chat service. Check that the app is running and try again.",
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="flex h-[calc(100dvh-4rem)] md:h-[calc(100vh-6rem)] flex-col -mx-4 -mt-16 md:mx-0 md:mt-0">
      {/* Header - compact on mobile, full on desktop */}
      <div className="px-4 pt-14 pb-2 md:px-0 md:pt-0 md:pb-0 md:mb-4">
        <h1 className="text-lg md:text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-fiji-gold" />
          AI Brother Search
        </h1>
        <p className="hidden md:block text-sm text-muted-foreground">
          Ask questions like &ldquo;Who works in finance?&rdquo; or &ldquo;Find
          alumni in San Francisco&rdquo;
        </p>
      </div>

      {/* Chat Area - full-bleed on mobile, card on desktop */}
      <div className="flex flex-1 flex-col overflow-hidden md:rounded-xl md:border md:border-border md:shadow-sm bg-card">
        <ScrollArea className="flex-1 px-3 py-2 md:p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center py-10 md:py-20">
              <div className="flex h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-full bg-primary/10 mb-3 md:mb-4">
                <Bot className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              </div>
              <h3 className="text-base md:text-lg font-semibold mb-1 md:mb-2">
                FIJI Chapter Assistant
              </h3>
              <p className="hidden md:block max-w-md text-sm text-muted-foreground mb-6">
                I can help you find brothers by industry, location, graduation
                year, or any other criteria. Try asking me something!
              </p>
              <p className="md:hidden text-xs text-muted-foreground mb-4">
                Search brothers by name, industry, or location
              </p>
              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 max-w-lg w-full px-2 md:px-0">
                {[
                  "Who works in tech?",
                  "Find brothers in San Diego",
                  "List alumni from class of 2020",
                  "Who's in the finance industry?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="rounded-lg border border-border bg-card px-3 py-2 md:px-4 md:py-2.5 text-left text-sm hover:bg-muted transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 md:gap-3 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <Avatar className="h-6 w-6 md:h-8 md:w-8 shrink-0">
                      <AvatarFallback
                        className={
                          msg.isError
                            ? "bg-destructive/10 text-destructive text-xs"
                            : "bg-primary text-primary-foreground text-xs"
                        }
                      >
                        {msg.isError ? (
                          <AlertTriangle className="h-3 w-3 md:h-4 md:w-4" />
                        ) : (
                          <Bot className="h-3 w-3 md:h-4 md:w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[85%] md:max-w-[80%] rounded-xl px-3 py-2 md:px-4 md:py-3 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : msg.isError
                          ? "bg-destructive/10 text-destructive border border-destructive/20"
                          : "bg-muted"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    {msg.role === "assistant" &&
                      msg.content === "" &&
                      loading && (
                        <div className="flex gap-1">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0ms]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:150ms]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:300ms]" />
                        </div>
                      )}
                  </div>
                  {msg.role === "user" && (
                    <Avatar className="hidden md:flex h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-fiji-gold text-fiji-purple-dark text-xs">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Input - tight on mobile with safe-area padding */}
        <div className="border-t border-border p-2 pb-[env(safe-area-inset-bottom,0.5rem)] md:p-4 md:pb-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about brothers..."
              disabled={loading}
              className="flex-1 h-10 md:h-10 text-base md:text-sm"
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              size="icon"
              className="h-10 w-10 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
