import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef(({ className, checked, onCheckedChange, onChange, disabled, ...props }, ref) => {
  // Handle both onCheckedChange (Radix style) and onChange (native style)
  const handleChange = (e) => {
    if (onCheckedChange) {
      onCheckedChange(e.target.checked);
    }
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <input
        type="checkbox"
        ref={ref}
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        className="sr-only peer"
        {...props}
      />
      <div
        className={cn(
          "h-4 w-4 shrink-0 rounded-sm border border-primary shadow cursor-pointer",
          "peer-focus-visible:outline-none peer-focus-visible:ring-1 peer-focus-visible:ring-ring",
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
          checked ? "bg-primary text-primary-foreground" : "bg-background",
          className
        )}
        onClick={() => {
          if (!disabled && onCheckedChange) {
            onCheckedChange(!checked);
          }
        }}
      >
        {checked && (
          <div className="flex items-center justify-center text-current h-full">
            <Check className="h-3 w-3 text-white" />
          </div>
        )}
      </div>
    </div>
  );
});

Checkbox.displayName = "Checkbox"

export { Checkbox }
