import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent text-sm font-bold cursor-pointer transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-primary/20 bg-primary text-primary-foreground shadow-soft hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-primary",
        destructive: "border-danger/20 bg-destructive text-destructive-foreground shadow-soft hover:-translate-y-0.5 hover:bg-destructive/90 hover:shadow-danger",
        hero: "border-primary/20 bg-gradient-primary text-primary-foreground shadow-primary hover:-translate-y-0.5 hover:shadow-elevate hover:brightness-110",
        danger: "border-danger/20 bg-gradient-danger text-danger-foreground shadow-danger hover:-translate-y-0.5 hover:brightness-110",
        success: "border-success/20 bg-gradient-success text-success-foreground shadow-soft hover:-translate-y-0.5 hover:brightness-105",
        outline:
          "border-input bg-card text-foreground shadow-soft hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent/10 hover:text-foreground hover:shadow-elevate",
        secondary: "border-secondary/20 bg-secondary text-secondary-foreground shadow-soft hover:-translate-y-0.5 hover:bg-secondary/90",
        ghost: "border-transparent text-foreground/80 hover:bg-card hover:text-foreground hover:shadow-soft",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-md px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);


export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
