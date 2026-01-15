import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface LoadingModalProps {
  isOpen: boolean;
}

export function LoadingModal({ isOpen }: LoadingModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="bg-transparent border-none shadow-none flex items-center justify-center w-auto max-w-none [&>button]:hidden outline-none"
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
