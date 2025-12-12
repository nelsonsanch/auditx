import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// React 19 compatible Accordion using native HTML/React instead of Radix
const AccordionContext = React.createContext({})

const Accordion = React.forwardRef(({ className, type = "single", collapsible = true, defaultValue, value, onValueChange, children, ...props }, ref) => {
  const [openItems, setOpenItems] = React.useState(() => {
    if (value !== undefined) return Array.isArray(value) ? value : [value];
    if (defaultValue !== undefined) return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
    return [];
  });

  const toggleItem = React.useCallback((itemValue) => {
    setOpenItems(prev => {
      let newItems;
      if (type === "single") {
        newItems = prev.includes(itemValue) ? (collapsible ? [] : prev) : [itemValue];
      } else {
        newItems = prev.includes(itemValue) 
          ? prev.filter(v => v !== itemValue)
          : [...prev, itemValue];
      }
      onValueChange?.(type === "single" ? newItems[0] : newItems);
      return newItems;
    });
  }, [type, collapsible, onValueChange]);

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem, type }}>
      <div ref={ref} className={cn("", className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
});
Accordion.displayName = "Accordion";

const AccordionItemContext = React.createContext({});

const AccordionItem = React.forwardRef(({ className, value, children, ...props }, ref) => {
  const { openItems } = React.useContext(AccordionContext);
  const isOpen = openItems.includes(value);

  return (
    <AccordionItemContext.Provider value={{ value, isOpen }}>
      <div 
        ref={ref} 
        className={cn("border-b", className)} 
        data-state={isOpen ? "open" : "closed"}
        {...props}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
});
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
  const { toggleItem } = React.useContext(AccordionContext);
  const { value, isOpen } = React.useContext(AccordionItemContext);

  return (
    <div className="flex">
      <button
        ref={ref}
        type="button"
        onClick={() => toggleItem(value)}
        className={cn(
          "flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all hover:underline text-left",
          className
        )}
        data-state={isOpen ? "open" : "closed"}
        aria-expanded={isOpen}
        {...props}
      >
        {children}
        <ChevronDown 
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )} 
        />
      </button>
    </div>
  );
});
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef(({ className, children, ...props }, ref) => {
  const { isOpen } = React.useContext(AccordionItemContext);

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className={cn("overflow-hidden text-sm", className)}
      data-state={isOpen ? "open" : "closed"}
      {...props}
    >
      <div className={cn("pb-4 pt-0", className)}>{children}</div>
    </div>
  );
});
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
