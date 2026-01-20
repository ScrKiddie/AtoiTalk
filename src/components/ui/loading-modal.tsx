import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

import { cn } from "@/lib/utils";

interface LoadingModalProps {
  isOpen: boolean;
  className?: string;
  overlayClassName?: string;
}

export function LoadingModal({ isOpen, className, overlayClassName }: LoadingModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className={cn(
          "bg-transparent border-none shadow-none flex items-center justify-center w-auto max-w-none [&>button]:hidden outline-none",
          className
        )}
        overlayClassName={overlayClassName}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        aria-describedby={undefined}
      >
        <VisuallyHidden>
          <DialogTitle>Loading</DialogTitle>
          <DialogDescription>Please wait...</DialogDescription>
        </VisuallyHidden>
        <Spinner className="h-10 w-10 text-white" />
      </DialogContent>
    </Dialog>
  );
}
