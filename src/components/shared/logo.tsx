import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const sizeMap = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

const textSizeMap = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
};

export function Logo({ className, size = "md", showText = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Logo icon — stylized "T" with a table/flow motif */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold",
          sizeMap[size]
        )}
      >
        <span className={size === "sm" ? "text-xs" : "text-sm"}>T</span>
        {/* Animated dot accent */}
        <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-chart-2" />
      </div>
      {showText && (
        <span
          className={cn(
            "font-heading font-bold tracking-tight",
            textSizeMap[size]
          )}
        >
          Table
          <span className="text-primary">Flow</span>
        </span>
      )}
    </div>
  );
}
