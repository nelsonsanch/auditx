import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// React 19 compatible Select using native HTML select
// Simple wrapper that maintains the same API but uses native select

const Select = ({ children, value, defaultValue, onValueChange, ...props }) => {
  const [selectedValue, setSelectedValue] = React.useState(value || defaultValue || "");
  const [options, setOptions] = React.useState([]);

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setSelectedValue(newValue);
    onValueChange?.(newValue);
  };

  // Extract options from children
  const extractOptions = (children) => {
    const opts = [];
    React.Children.forEach(children, (child) => {
      if (!child) return;
      if (child.type === SelectContent) {
        React.Children.forEach(child.props.children, (item) => {
          if (item?.type === SelectItem) {
            opts.push({ value: item.props.value, label: item.props.children });
          }
        });
      } else if (child.type === SelectTrigger) {
        // Extract placeholder from SelectValue inside trigger
        React.Children.forEach(child.props.children, (triggerChild) => {
          if (triggerChild?.type === SelectValue && triggerChild.props.placeholder) {
            // Add placeholder as first option
          }
        });
      }
    });
    return opts;
  };

  const opts = extractOptions(children);
  
  // Find the trigger child to get its className
  let triggerClassName = "";
  let placeholder = "";
  React.Children.forEach(children, (child) => {
    if (child?.type === SelectTrigger) {
      triggerClassName = child.props.className || "";
      React.Children.forEach(child.props.children, (triggerChild) => {
        if (triggerChild?.type === SelectValue) {
          placeholder = triggerChild.props.placeholder || "";
        }
      });
    }
  });

  return (
    <div className="relative">
      <select
        value={selectedValue}
        onChange={handleChange}
        className={cn(
          "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer pr-8",
          triggerClassName
        )}
        {...props}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {opts.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
    </div>
  );
};

// These components are just markers for the Select to extract data from
const SelectGroup = ({ children }) => children;
const SelectValue = ({ placeholder }) => null;
const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => null);
SelectTrigger.displayName = "SelectTrigger";

const SelectContent = React.forwardRef(({ className, children, ...props }, ref) => null);
SelectContent.displayName = "SelectContent";

const SelectLabel = React.forwardRef(({ className, children, ...props }, ref) => null);
SelectLabel.displayName = "SelectLabel";

const SelectItem = React.forwardRef(({ className, children, value, ...props }, ref) => null);
SelectItem.displayName = "SelectItem";

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => null);
SelectSeparator.displayName = "SelectSeparator";

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
