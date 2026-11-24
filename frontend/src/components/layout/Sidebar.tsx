"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "../../context/AuthContext"
import { useBasket } from "../../context/BasketContext"
import { RoleBadge } from "../ui/Badge"
import {
  LayoutDashboard,
  Package,
  Boxes,
  History,
  LogOut,
  UtensilsCrossed,
  ShoppingBag,
  Heart,
  Clock,
} from "lucide-react"
import { cn } from "../../lib/utils"

export function Sidebar() {
  const pathname = usePathname()
  const { user, isAdmin, logout } = useAuth()
  const { totalPackets, toggleDrawer } = useBasket()

  // Strict role-based navigation definition
  const adminNavItems = [
    { name: "Pantry Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Inventory Manager", href: "/admin", icon: Boxes },
    { name: "Activity Audit Log", href: "/activities", icon: History },
  ]

  const memberNavItems = [
    { name: "Snack Catalog", href: "/snacks", icon: Package },
    { name: "My Favourites", href: "/favourites", icon: Heart },
    { name: "My Consumption History", href: "/history", icon: Clock },
  ]

  const navItems = isAdmin ? adminNavItems : memberNavItems

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-pantry-surface border-r border-pantry-border min-h-screen sticky top-0 z-30 transition-colors">
      {/* Brand Header */}
      <div className="p-5 border-b border-pantry-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-coral/10 border border-coral/20 flex items-center justify-center text-coral shadow-xs">
          <UtensilsCrossed className="w-5 h-5 text-coral" />
        </div>
        <div>
          <h1 className="text-base font-black text-pantry-text tracking-tight flex items-center gap-1.5">
            Snack Overflow
          </h1>
          <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
            {isAdmin ? "Pantry Admin Console" : "Office Pantry Hub"}
          </p>
        </div>
      </div>

      {/* Nav Links */}
      <div className="flex-1 px-3 py-6 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          {isAdmin ? "Management" : "Snack Hub"}
        </div>

        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all select-none",
                isActive
                  ? "bg-navy-900 text-white dark:bg-coral dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:text-navy-950 dark:hover:text-white hover:bg-pantry-subtle",
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4",
                  isActive
                    ? "text-coral dark:text-white"
                    : "text-gray-400 dark:text-gray-400",
                )}
              />
              <span>{item.name}</span>
            </Link>
          )
        })}

        {/* Member Basket Trigger in Sidebar */}
        {!isAdmin && (
          <button
            type="button"
            onClick={toggleDrawer}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-navy-950 dark:hover:text-white hover:bg-pantry-subtle transition-all mt-3 border border-dashed border-pantry-border"
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-4 h-4 text-coral" />
              <span>Snack Basket</span>
            </div>
            {totalPackets > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-coral text-white shadow-xs">
                {totalPackets}
              </span>
            )}
          </button>
        )}
      </div>

      {/* User Profile Tray */}
      {user && (
        <div className="p-4 border-t border-pantry-border bg-pantry-subtle/30">
          <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-pantry-surface border border-pantry-border shadow-xs">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-navy-900 dark:bg-coral text-white flex items-center justify-center text-xs font-bold uppercase shrink-0">
                {user.name.charAt(0)}
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-xs font-bold text-pantry-text truncate">{user.name}</p>
                <div className="mt-0.5">
                  <RoleBadge role={user.role} />
                </div>
              </div>
            </div>

            <button
              onClick={() => logout()}
              title="Log out"
              className="p-1.5 rounded-xl text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
