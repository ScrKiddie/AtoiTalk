"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function Avatar({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full border border-border",
        className
      )}
      {...props}
    />
  );
}

interface AvatarImageProps extends React.ComponentProps<typeof AvatarPrimitive.Image> {
  skeletonVariant?: "default" | "revert";
}

function AvatarImage({
  className,
  skeletonVariant = "default",
  onLoad,
  onLoadingStatusChange,
  ...props
}: AvatarImageProps) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  const handleLoad = React.useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      setIsLoaded(true);
      onLoad?.(e);
    },
    [onLoad]
  );

  const handleLoadingStatusChange = React.useCallback(
    (status: "idle" | "loading" | "loaded" | "error") => {
      if (status === "error") {
        setHasError(true);
      }
      onLoadingStatusChange?.(status);
    },
    [onLoadingStatusChange]
  );

  React.useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [props.src]);

  const showSkeleton = !isLoaded && !hasError && props.src;

  return (
    <>
      {showSkeleton && (
        <div className="absolute inset-0 z-10 bg-muted rounded-full overflow-hidden">
          <Skeleton variant={skeletonVariant} className="size-full rounded-full" />
        </div>
      )}
      <AvatarPrimitive.Image
        data-slot="avatar-image"
        className={cn("aspect-square size-full", !isLoaded && "opacity-0", className)}
        onLoad={handleLoad}
        onLoadingStatusChange={handleLoadingStatusChange}
        {...props}
      />
    </>
  );
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-blue-600 text-white flex size-full items-center justify-center rounded-full",
        className
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarFallback, AvatarImage };
