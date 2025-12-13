import * as React from "react"
import { cn } from "@/lib/utils"

// React 19 compatible RadioGroup using native HTML inputs
const RadioGroup = React.forwardRef(({ className, value, defaultValue, onValueChange, children, ...props }, ref) => {
  const [selectedValue, setSelectedValue] = React.useState(value || defaultValue || "");
  
  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  const handleChange = (newValue) => {
    setSelectedValue(newValue);
    onValueChange?.(newValue);
  };

  return (
    <div 
      ref={ref}
      role="radiogroup"
      className={cn("grid gap-2", className)} 
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === RadioGroupItem) {
          return React.cloneElement(child, {
            checked: selectedValue === child.props.value,
            onChange: () => handleChange(child.props.value),
          });
        }
        return child;
      })}
    </div>
  );
});
RadioGroup.displayName = "RadioGroup";

const RadioGroupItem = React.forwardRef(({ className, value, checked, onChange, disabled, children, ...props }, ref) => {
  const id = React.useId();
  
  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <input
          type="radio"
          id={id}
          ref={ref}
          value={value}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only peer"
          {...props}
        />
        <div
          onClick={() => !disabled && onChange?.()}
          className={cn(
            "aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow cursor-pointer",
            "peer-focus:outline-none peer-focus-visible:ring-1 peer-focus-visible:ring-ring",
            "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
            checked ? "bg-primary" : "bg-background",
            className
          )}
        >
          {checked && (
            <div className="flex items-center justify-center h-full">
              <div className="h-2 w-2 rounded-full bg-white" />
            </div>
          )}
        </div>
      </div>
      {children && (
        <label htmlFor={id} className="text-sm cursor-pointer">
          {children}
        </label>
      )}
    </div>
  );
});
RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem }
