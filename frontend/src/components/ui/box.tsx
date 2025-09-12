import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const boxVariants = cva(
  "relative overflow-hidden backdrop-blur-sm transition-all duration-300",
  {
    variants: {
      variant: {
        default:
          "bg-white/5 text-white border border-white/30 hover:bg-white/10 hover:border-white/40 shadow-lg hover:shadow-xl",
        outline:
          "border border-white/40 bg-white/5 hover:bg-white/15 hover:border-white/50 text-lg md:text-2xl font-medium backdrop-blur-sm shadow-lg hover:shadow-xl",
        secondary:
          "bg-white/10 text-white border border-white/25 hover:bg-white/20 hover:border-white/35 backdrop-blur-sm shadow-lg hover:shadow-xl",
        ghost: "hover:bg-white/5 hover:text-white hover:shadow-sm backdrop-blur-sm",
        glass:
          "bg-white/5 text-white border border-white/30 hover:bg-white/10 hover:border-white/40 backdrop-blur-sm shadow-lg hover:shadow-xl",
      },
      size: {
        sm: "p-3 rounded-md",
        default: "p-4 rounded-lg",
        lg: "p-6 rounded-xl",
        xl: "p-8 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "default",
    },
  }
);

export interface BoxProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof boxVariants> {}

const Box = React.forwardRef<HTMLDivElement, BoxProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    return (
      <div
        className={cn(boxVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {/* Gradient border effect */}
        <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-br from-white/15 via-transparent to-transparent p-[1px]">
          <div className="h-full w-full rounded-[inherit] bg-gradient-to-br from-white/10 via-white/5 to-transparent"></div>
        </div>
        
        {/* Glass background */}
        <div className="absolute inset-0 rounded-[inherit] bg-white/5 backdrop-blur-sm"></div>
        
        {/* Hover effect overlay */}
        <span className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-[inherit]"></span>

        {/* Content wrapper */}
        <div className="relative z-10">
          {children}
        </div>
      </div>
    );
  }
);
Box.displayName = "Box";

export { Box, boxVariants };
