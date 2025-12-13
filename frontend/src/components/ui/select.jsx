import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// React 19 compatible Select using native HTML select
const SelectContext = React.createContext({})

const Select = ({ children, value, defaultValue, onValueChange, ...props }) => {
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
    <SelectContext.Provider value={{ value: selectedValue, onChange: handleChange }}>
      {children}
    </SelectContext.Provider>
  );
};

const SelectGroup = ({ children }) => <>{children}</>;

const SelectValue = ({ placeholder }) => {
  const { value, options } = React.useContext(SelectContext);
  const selectedOption = options?.find(opt => opt.value === value);
  return <span>{selectedOption?.label || value || placeholder}</span>;
};

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
  const { value, onChange, options, setOptions } = React.useContext(SelectContext);
  const [isOpen, setIsOpen] = React.useState(false);
  const selectRef = React.useRef(null);

  return (
    <div className="relative" ref={ref}>
      <select
        ref={selectRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
    </div>
  );
});
SelectTrigger.displayName = "SelectTrigger";

const SelectContent = React.forwardRef(({ className, children, ...props }, ref) => {
  // In native implementation, content is rendered inside the select element
  return <>{children}</>;
});
SelectContent.displayName = "SelectContent";

const SelectLabel = React.forwardRef(({ className, children, ...props }, ref) => (
  <optgroup label={children} ref={ref} className={cn("font-semibold", className)} {...props} />
));
SelectLabel.displayName = "SelectLabel";

const SelectItem = React.forwardRef(({ className, children, value, ...props }, ref) => (
  <option ref={ref} value={value} className={cn("py-1.5 pl-2 pr-8 text-sm", className)} {...props}>
    {children}
  </option>
));
SelectItem.displayName = "SelectItem";

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <option disabled ref={ref} className={cn("border-t", className)} {...props}>
    ──────────
  </option>
));
SelectSeparator.displayName = "SelectSeparator";

// These are not needed for native select but exported for compatibility
const SelectScrollUpButton = () => null;
const SelectScrollDownButton = () => null;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
