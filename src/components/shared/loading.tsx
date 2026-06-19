import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingProps {
  className?: string;
  variant?: "spinner" | "skeleton" | "dots";
  text?: string;
}

export function Loading({
  className,
  variant = "spinner",
  text,
}: LoadingProps) {
  if (variant === "skeleton") {
    return (
      <div className={cn("space-y-4 p-6", className)}>
        <Skeleton className="h-8 w-48" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  if (variant === "dots") {
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-1.5 py-8",
          className
        )}
      >
        <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
        <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
        <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
        {text && (
          <span className="ms-3 text-sm text-muted-foreground">{text}</span>
        )}
      </div>
    );
  }

  // Default: spinner
  return (
    <div
      className={cn("flex flex-col items-center justify-center py-8", className)}
    >
      <div className="relative h-8 w-8">
        <div className="absolute inset-0 rounded-full border-2 border-muted" />
        <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
      {text && (
        <p className="mt-3 text-sm text-muted-foreground">{text}</p>
      )}
    </div>
  );
}
