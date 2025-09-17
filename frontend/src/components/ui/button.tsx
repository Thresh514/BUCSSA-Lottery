import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center text-md font-lighter tracking-wider ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden backdrop-blur-md",
  {
    variants: {
      variant: {
        default:
          "bg-white/10 text-white border border-white/30 hover:bg-white/30 hover:border-white/50 shadow-lg hover:shadow-xl",
        destructive:
          "bg-red-500/30 text-red-100 border border-red-400/40 hover:bg-red-500/40 hover:border-red-400/60 backdrop-blur-md",
        outline:
          "border border-white/40 bg-white/5 hover:bg-white/15 hover:border-white/50 text-lg md:text-2xl font-medium backdrop-blur-sm shadow-lg hover:shadow-xl",
        secondary:
          "bg-white/25 text-white border border-white/35 hover:bg-white/35 hover:border-white/50 backdrop-blur-md shadow-lg hover:shadow-xl",
        ghost: "hover:bg-white/20 hover:text-white hover:shadow-sm backdrop-blur-sm",
        link: "text-white underline-offset-4 hover:underline hover:text-white/80",
        glass:
          "bg-white/20 text-white border border-white/30 hover:bg-white/30 hover:border-white/50 backdrop-blur-md shadow-lg hover:shadow-xl",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-16 rounded-md px-4 md:px-12",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "glass",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
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
        <span className="absolute inset-0 bg-white/15 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-[inherit]"></span>

        {/* Content wrapper */}
        <span className="relative z-10 flex items-center justify-center gap-2">
          {children}
        </span>
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
