import type { VariantProps } from "class-variance-authority"
import { cva } from "class-variance-authority"

export { default as Button } from "./Button.vue"

export const buttonVariants = cva(
  // Charte : formes pleines arrondies, typographie portée par la taille.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-terracotta-fonce",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-ardoise/12 bg-creme text-ardoise hover:bg-ardoise/5",
        secondary:
          "border border-terracotta/35 bg-creme text-terracotta hover:bg-terracotta/5",
        ghost: "text-ardoise hover:bg-ardoise/5",
        link: "text-terracotta underline-offset-4 hover:underline",
      },
      size: {
        "default": "h-11 rounded-full px-5 text-button-md",
        "sm": "h-9 rounded-full px-4 text-label-md font-medium",
        "lg": "h-14 rounded-full px-6 text-button-lg",
        "icon": "size-10 rounded-full",
        "icon-sm": "size-8 rounded-full",
        "icon-lg": "size-12 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>
