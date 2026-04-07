import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
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
        <p className="text-sm text-muted-foreground">
          Clone a repo and start asking questions.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col gap-4 p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col gap-1 rounded-lg px-4 py-3",
              msg.role === "user"
                ? "ml-auto max-w-[80%] bg-primary text-primary-foreground"
                : "mr-auto max-w-[80%] bg-muted text-foreground"
            )}
          >
            <span className="text-xs font-medium opacity-70">
              {msg.role === "user" ? "You" : "Reposcope"}
            </span>
            <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
          </div>
        ))}
        {isLoading && (
          <div className="mr-auto max-w-[80%] rounded-lg bg-muted px-4 py-3">
            <span className="text-xs font-medium text-muted-foreground">
              Reposcope
            </span>
            <p className="text-sm text-muted-foreground">Thinking...</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
