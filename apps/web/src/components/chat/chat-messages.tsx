import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string };

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm opacity-60">
          Clone a repo and start asking questions.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col gap-4 p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col gap-1 rounded-lg px-4 py-3",
              msg.role === "user"
                ? "chat chat-end"
                : "chat chat-start"
            )}
          >
            <div className="chat-header text-xs font-medium opacity-70">
              {msg.role === "user" ? "You" : "Reposcope"}
            </div>
            <div className={cn(
              "chat-bubble",
              msg.role === "user" ? "chat-bubble-primary" : "chat-bubble-neutral"
            )}>
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="chat chat-start">
            <div className="chat-header text-xs font-medium opacity-70">
              Reposcope
            </div>
            <div className="chat-bubble chat-bubble-neutral">
              <span className="loading loading-dots loading-sm"></span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
