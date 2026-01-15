import { cn } from "@/lib/utils";

interface SkeletonProps extends React.ComponentProps<"div"> {
  variant?: "default" | "revert";
}

function Skeleton({ className, variant = "default", ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-md bg-muted-foreground/20",
        variant === "revert" && "theme-revert",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
