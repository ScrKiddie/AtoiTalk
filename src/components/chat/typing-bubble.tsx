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
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex w-full justify-start"
    >
      <div className="flex items-end gap-2 max-w-[80%]">
        <div className="bg-background border p-[10px] pt-3 rounded-md flex gap-1 items-center h-auto min-h-[42px]">
          <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
          <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
          <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce"></span>
        </div>
      </div>
    </motion.div>
  );
}
