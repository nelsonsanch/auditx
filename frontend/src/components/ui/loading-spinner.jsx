import * as React from "react"
import { cn } from "@/lib/utils"

// React 19 compatible Loading Spinner using pure CSS
// This avoids DOM manipulation issues with lucide-react's animated icons
const LoadingSpinner = React.forwardRef(({ className, size = "default", ...props }, ref) => {
  const sizeClasses = {
    xs: "h-3 w-3 border",
    sm: "h-4 w-4 border-2",
    default: "h-5 w-5 border-2",
    lg: "h-6 w-6 border-2",
    xl: "h-8 w-8 border-2",
  };

  return (
    <span
      ref={ref}
      role="status"
      aria-label="Cargando"
      className={cn(
        "inline-block rounded-full border-current border-r-transparent animate-spin",
        sizeClasses[size] || sizeClasses.default,
        className
      )}
      {...props}
    />
  );
});

LoadingSpinner.displayName = "LoadingSpinner"

export { LoadingSpinner }
