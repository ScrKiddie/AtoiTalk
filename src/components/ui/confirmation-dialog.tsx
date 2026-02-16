import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  cancelText?: string;
  confirmText?: string;
  onConfirm: () => void;
  variant?: "default" | "destructive";
  isLoading?: boolean;
  className?: string;
  overlayClassName?: string;
  modal?: boolean;
  size?: "default" | "sm" | "lg" | "xl" | "full";
  children?: React.ReactNode;
  showCancel?: boolean;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelText = "Cancel",
  confirmText = "Confirm",
  onConfirm,
  variant = "destructive",
  isLoading = false,
  className,
  overlayClassName,
  modal = true,
  size = "sm",
  children,
  showCancel = true,
}: ConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(val) => !isLoading && onOpenChange(val)} modal={modal}>
      <DialogContent
        size={size}
        className={className}
        overlayClassName={overlayClassName}
        onInteractOutside={(e) => isLoading && e.preventDefault()}
        onEscapeKeyDown={(e) => isLoading && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-4">
            {description}
          </DialogDescription>
        </DialogHeader>
        {children}
        <div className="flex justify-end gap-2 pt-4">
          {showCancel && (
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              {cancelText}
            </Button>
          )}
          <Button variant={variant} onClick={onConfirm} disabled={isLoading} className="relative">
            <span className={isLoading ? "opacity-0" : ""}>{confirmText}</span>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Spinner className="size-4" />
              </div>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
