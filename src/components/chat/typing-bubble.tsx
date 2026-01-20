import { useChatStore } from "@/store";
import { motion } from "motion/react";

interface TypingBubbleProps {
  chatId: string;
}

export function TypingBubble({ chatId }: TypingBubbleProps) {
  const typingUsers = useChatStore((state) => state.typingUsers);
  const isTyper = (typingUsers[chatId] || []).length > 0;

  if (!isTyper) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex w-full justify-start mb-2"
    >
      <div className="flex items-end gap-2 max-w-[80%]">
        <div className="bg-muted p-3 py-4 rounded-2xl rounded-bl-sm flex gap-1 items-center h-10">
          <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
          <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
          <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce"></span>
        </div>
      </div>
    </motion.div>
  );
}
