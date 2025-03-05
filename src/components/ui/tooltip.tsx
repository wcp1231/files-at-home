import React, { useState, useRef, useEffect, ReactNode } from 'react';

interface TooltipProviderProps {
  children: ReactNode;
  delayDuration?: number;
}

const TooltipProvider: React.FC<TooltipProviderProps> = ({ 
  children,
  delayDuration = 700
}) => {
  return (
    <TooltipContext.Provider value={{ delayDuration }}>
      {children}
    </TooltipContext.Provider>
  );
};

interface TooltipContextType {
  delayDuration: number;
}

const TooltipContext = React.createContext<TooltipContextType>({ delayDuration: 700 });

function useTooltipContext() {
  return React.useContext(TooltipContext);
}

interface TooltipProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const Tooltip: React.FC<TooltipProps> = ({ 
  children, 
  open: controlledOpen, 
  onOpenChange 
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  
  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(newOpen);
    }
    if (onOpenChange) {
      onOpenChange(newOpen);
    }
  };

  return (
    <TooltipRootContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      {children}
    </TooltipRootContext.Provider>
  );
};

interface TooltipRootContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TooltipRootContext = React.createContext<TooltipRootContextType | undefined>(undefined);

function useTooltipRootContext() {
  const context = React.useContext(TooltipRootContext);
  if (!context) {
    throw new Error('Tooltip compound components must be used within a Tooltip component');
  }
  return context;
}

interface TooltipTriggerProps {
  children: ReactNode;
  asChild?: boolean;
}

const TooltipTrigger: React.FC<TooltipTriggerProps> = ({ 
  children, 
  asChild = false 
}) => {
  const { open, onOpenChange } = useTooltipRootContext();
  const { delayDuration } = useTooltipContext();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onOpenChange(true);
    }, delayDuration);
  };
  
  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onOpenChange(false);
    }, 100);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as any, {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    });
  }
  
  return (
    <span 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </span>
  );
};

interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  sideOffset?: number;
}

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className = '', sideOffset = 4, ...props }, ref) => {
    const { open } = useTooltipRootContext();
    
    if (!open) return null;
    
    return (
      <div
        ref={ref}
        className={`absolute z-50 overflow-hidden rounded-md border bg-white px-3 py-1.5 text-sm shadow-md ${className}`}
        {...props}
      />
    );
  }
);

TooltipContent.displayName = 'TooltipContent';

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }; 