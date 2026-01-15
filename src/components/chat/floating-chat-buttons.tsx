import { Button } from "@/components/ui/button";
import { ArrowDown, SendToBack } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface FloatingChatButtonsProps {
  showReturnButton?: boolean;
  onReturnJump?: () => void;
  showScrollButton: boolean;
  scrollToBottom: () => void;
}

export const FloatingChatButtons = ({
  showReturnButton,
  onReturnJump,
  showScrollButton,
  scrollToBottom,
}: FloatingChatButtonsProps) => {
  return (
    <div className="absolute -top-12 right-4 z-10 flex gap-2 pointer-events-none">
      <AnimatePresence>
        {showReturnButton && onReturnJump && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 10 }}
            className="pointer-events-auto"
          >
            <Button
              size="icon"
              className="rounded-full bg-background text-foreground border shadow-sm hover:bg-muted transition-all"
              onClick={onReturnJump}
            >
              <SendToBack className="size-5 md:size-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showScrollButton && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="pointer-events-auto"
          >
            <Button
              size="icon"
              className="rounded-full bg-background text-foreground border shadow-sm hover:bg-muted transition-all"
              onClick={scrollToBottom}
            >
              <ArrowDown className="size-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
