import React from "react"
import { cn } from "../../lib/utils"

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-3xl bg-black/[0.06] dark:bg-white/[0.08]",
        className,
      )}
      {...props}
    />
  )
}

export function StatCardSkeleton() {
  return (
    <div className="p-6 rounded-4xl ordan-card space-y-3">
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-24 rounded-full" />
        <Skeleton className="h-10 w-10 rounded-2xl" />
      </div>
      <Skeleton className="h-9 w-20 rounded-xl" />
      <Skeleton className="h-3 w-32 rounded-full" />
    </div>
  )
}

export function SnackCardSkeleton() {
  return (
    <div className="p-5 rounded-4xl ordan-card space-y-4">
      <Skeleton className="h-32 w-full rounded-3xl" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4 rounded-full" />
        <Skeleton className="h-3.5 w-1/2 rounded-full" />
      </div>
      <div className="pt-2 flex gap-2">
        <Skeleton className="h-10 flex-1 rounded-full" />
        <Skeleton className="h-10 w-14 rounded-full" />
      </div>
    </div>
  )
}
