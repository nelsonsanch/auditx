import * as React from "react"
import { cn } from "@/lib/utils"

// React 19 compatible Slider using native HTML
const Slider = React.forwardRef(({ className, value, defaultValue, min = 0, max = 100, step = 1, onValueChange, disabled, ...props }, ref) => {
  const [internalValue, setInternalValue] = React.useState(value?.[0] ?? defaultValue?.[0] ?? min);
  
  React.useEffect(() => {
    if (value?.[0] !== undefined) {
      setInternalValue(value[0]);
    }
  }, [value]);

  const handleChange = (e) => {
    const newValue = parseFloat(e.target.value);
    setInternalValue(newValue);
    onValueChange?.([newValue]);
  };

  const percentage = ((internalValue - min) / (max - min)) * 100;

  return (
    <div className={cn("relative flex w-full touch-none select-none items-center", className)} ref={ref} {...props}>
      <div className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
        <div 
          className="absolute h-full bg-primary" 
          style={{ width: `${percentage}%` }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={internalValue}
        onChange={handleChange}
        disabled={disabled}
        className="absolute w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
      <div 
        className="absolute h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        style={{ left: `calc(${percentage}% - 8px)` }}
      />
    </div>
  );
});
Slider.displayName = "Slider"

export { Slider }
