import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const glassTextVariants = cva(
  "font-light tracking-wide transition-all duration-300",
  {
    variants: {
      variant: {
        default:
          "text-glass-edge",
        primary:
          "text-glass-strong",
        secondary:
          "text-glass-soft",
        muted:
          "text-white/70 drop-shadow-sm",
        accent:
          "text-blue-200/90 drop-shadow-md",
        time:
          "text-glass-time font-thin",
        date:
          "text-glass-date font-light",
      },
      size: {
        xs: "text-xs",
        sm: "text-sm",
        base: "text-base",
        lg: "text-lg",
        xl: "text-xl",
        "2xl": "text-2xl",
        "3xl": "text-3xl",
        "4xl": "text-4xl",
        "5xl": "text-5xl",
        "6xl": "text-6xl",
        "7xl": "text-7xl",
        "8xl": "text-8xl",
        "9xl": "text-9xl",
      },
      weight: {
        thin: "font-thin",
        light: "font-light",
        normal: "font-normal",
        medium: "font-medium",
        semibold: "font-semibold",
        bold: "font-bold",
      },
      effect: {
        none: "",
        edge: "text-glass-edge",
        soft: "text-glass-soft", 
        strong: "text-glass-strong",
        blur: "backdrop-blur-sm",
        glass: "backdrop-blur-sm bg-white/5 px-2 py-1 rounded",
        frosted: "backdrop-blur-md bg-white/10 px-3 py-2 rounded-lg border border-white/20",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "base",
      weight: "light",
      effect: "none",
    },
  }
);

export interface GlassTextProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassTextVariants> {
  as?: "div" | "span" | "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

const GlassText = React.forwardRef<HTMLDivElement, GlassTextProps>(
  ({ className, variant, size, weight, effect, as = "div", children, ...props }, ref) => {
    const Component = as;

    return (
      <Component
        className={cn(glassTextVariants({ variant, size, weight, effect, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
GlassText.displayName = "GlassText";

// 预设组件
export const TimeText = React.forwardRef<HTMLDivElement, Omit<GlassTextProps, 'variant' | 'size' | 'weight'>>(
  ({ className, ...props }, ref) => (
    <GlassText
      ref={ref}
      variant="time"
      size="9xl"
      weight="thin"
      className={cn("text-center", className)}
      {...props}
    />
  )
);
TimeText.displayName = "TimeText";

export const DateText = React.forwardRef<HTMLDivElement, Omit<GlassTextProps, 'variant' | 'size' | 'weight'>>(
  ({ className, ...props }, ref) => (
    <GlassText
      ref={ref}
      variant="date"
      size="lg"
      weight="light"
      className={cn("text-center", className)}
      {...props}
    />
  )
);
DateText.displayName = "DateText";

export const GlassTitle = React.forwardRef<HTMLDivElement, Omit<GlassTextProps, 'variant' | 'effect'>>(
  ({ className, ...props }, ref) => (
    <GlassText
      ref={ref}
      variant="primary"
      size="4xl"
      weight="light"
      effect="frosted"
      className={cn("text-center", className)}
      {...props}
    />
  )
);
GlassTitle.displayName = "GlassTitle";

export { GlassText, glassTextVariants };
