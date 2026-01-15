import { cn } from "@/lib/utils";
import { useAuthStore, useChatStore } from "@/store";
import { AnimatePresence, motion } from "motion/react";

interface TypingBubbleProps {
  chatId: string;
}

export function TypingBubble({ chatId }: TypingBubbleProps) {
  const typingUsers = useChatStore((state) => state.typingUsers);
  const currentUser = useAuthStore((state) => state.user);

  const activeTyping = (typingUsers[chatId] || []).filter((id) => id !== currentUser?.id);
  const isTyping = activeTyping.length > 0;

  return (
    <AnimatePresence>
      {isTyping && (
        <motion.div
          key="typing-indicator"
          initial={{ opacity: 0, y: 10, scale: 0.9, x: -20 }}
          animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.9, x: -20 }}
          transition={{ duration: 0.2 }}
          className="flex w-full justify-start items-end origin-bottom-left"
        >
          <div
            className={cn(
              "p-4 pb-3 rounded-md border bg-background text-foreground flex items-center gap-1.5 h-fit w-fit justify-center min-w-[60px]"
            )}
          >
            <motion.div
              className="w-2 h-2 bg-foreground/50 rounded-full"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="w-2 h-2 bg-foreground/50 rounded-full"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div
              className="w-2 h-2 bg-foreground/50 rounded-full"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
