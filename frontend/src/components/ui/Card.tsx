import React from "react"
import { cn } from "../../lib/utils"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  dark?: boolean
}

export function Card({ className, children, dark = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        dark ? "ordan-card-dark text-white" : "ordan-card",
        "rounded-4xl p-6 transition-all duration-200",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn("flex items-center justify-between pb-4 mb-5 relative", className)}
      {...props}
    >
      {children}
      <div className="ordan-divider absolute bottom-0 left-0 right-0" />
    </div>
  )
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-semibold text-pantry-text tracking-tight", className)}
      {...props}
    >
      {children}
    </h3>
  )
}
