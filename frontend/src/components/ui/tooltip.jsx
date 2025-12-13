import * as React from "react"
import { cn } from "@/lib/utils"

// React 19 compatible Tooltip using CSS only
const TooltipProvider = ({ children }) => children;

const Tooltip = ({ children }) => {
  return <div className="relative inline-block group">{children}</div>;
};

const TooltipTrigger = React.forwardRef(({ className, asChild, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("inline-block", className)} {...props}>
      {children}
    </div>
  );
});
TooltipTrigger.displayName = "TooltipTrigger";

const TooltipContent = React.forwardRef(({ className, sideOffset = 4, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "absolute z-50 hidden group-hover:block overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95",
      "left-1/2 -translate-x-1/2 bottom-full mb-2",
      className
    )}
    {...props}
  >
    {children}
  </div>
));
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
