import * as React from "react"
import { cn } from "@/lib/utils"

// React 19 compatible Popover using native HTML
const PopoverContext = React.createContext({})

const Popover = ({ children, open, onOpenChange, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = React.useState(open ?? defaultOpen);
  const triggerRef = React.useRef(null);
  const contentRef = React.useRef(null);

  React.useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);

  const handleOpenChange = (newOpen) => {
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        isOpen &&
        contentRef.current &&
        !contentRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        handleOpenChange(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on escape
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleOpenChange(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <PopoverContext.Provider value={{ isOpen, setIsOpen: handleOpenChange, triggerRef, contentRef }}>
      <div className="relative inline-block">
        {children}
      </div>
    </PopoverContext.Provider>
  );
};

const PopoverTrigger = React.forwardRef(({ children, asChild, ...props }, ref) => {
  const { isOpen, setIsOpen, triggerRef } = React.useContext(PopoverContext);
  
  const combinedRef = (node) => {
    triggerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      ref: combinedRef,
      onClick: (e) => {
        children.props.onClick?.(e);
        setIsOpen(!isOpen);
      }
    });
  }

  return (
    <button 
      ref={combinedRef} 
      type="button" 
      onClick={() => setIsOpen(!isOpen)} 
      {...props}
    >
      {children}
    </button>
  );
});
PopoverTrigger.displayName = "PopoverTrigger";

const PopoverAnchor = React.forwardRef(({ children, ...props }, ref) => (
  <div ref={ref} {...props}>{children}</div>
));
PopoverAnchor.displayName = "PopoverAnchor";

const PopoverContent = React.forwardRef(({ className, align = "center", sideOffset = 4, children, ...props }, ref) => {
  const { isOpen, contentRef } = React.useContext(PopoverContext);

  const combinedRef = (node) => {
    contentRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  if (!isOpen) return null;

  return (
    <div
      ref={combinedRef}
      className={cn(
        "absolute z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95",
        align === "start" && "left-0",
        align === "center" && "left-1/2 -translate-x-1/2",
        align === "end" && "right-0",
        "top-full mt-1",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
PopoverContent.displayName = "PopoverContent";

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
