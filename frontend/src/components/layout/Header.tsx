"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "../../context/AuthContext"
import { useBasket } from "../../context/BasketContext"
import { useRealtimeEvents } from "../../hooks/useRealtimeEvents"
import { RoleBadge } from "../ui/Badge"
import { ThemeToggle } from "../ui/ThemeToggle"
import {
  Menu,
  X,
  LayoutDashboard,
  Package,
  Boxes,
  History,
  LogOut,
  ShoppingBag,
  Heart,
  Clock,
} from "lucide-react"
import { cn } from "../../lib/utils"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const { user, isAdmin, logout } = useAuth()
  const { totalPackets, toggleDrawer } = useBasket()
  const { isConnected } = useRealtimeEvents()

  const adminNavItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Inventory", href: "/admin", icon: Boxes },
    { name: "Audit Log", href: "/activities", icon: History },
  ]

  const memberNavItems = [
    { name: "Catalog", href: "/snacks", icon: Package },
    { name: "Favourites", href: "/favourites", icon: Heart },
    { name: "History", href: "/history", icon: Clock },
  ]

  const navItems = isAdmin ? adminNavItems : memberNavItems

  return (
    <>
      <div className="sticky top-0 z-30 w-full px-3 sm:px-6 pt-4 pb-2 pointer-events-none">
        <header className="pointer-events-auto max-w-5xl mx-auto ordan-glass-nav rounded-full px-3 sm:px-4 py-2 flex items-center justify-between gap-3 transition-all">
          {/* Brand */}
          <div className="flex items-center gap-2.5 pl-1 sm:pl-2">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-full text-pantry-text hover:text-coral hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link
              href={isAdmin ? "/dashboard" : "/snacks"}
              className="flex items-center gap-2.5 group"
            >
              <span className="w-8 h-8 rounded-full ordan-icon-glow flex items-center justify-center text-xs font-extrabold tracking-tight">
                SO
              </span>
              <span className="font-bold text-pantry-text tracking-tight text-base">
                Snack<span className="text-coral">Overflow</span>
              </span>
            </Link>
          </div>

          {/* Center Navigation Links (TechOrdan style underline on hover/active) */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative py-1.5 text-sm font-semibold transition-colors",
                    isActive ? "text-coral" : "text-pantry-text/80 hover:text-coral",
                  )}
                >
                  {item.name}
                  <span
                    className={cn(
                      "absolute left-0 right-0 bottom-0 h-[1.5px] bg-coral rounded-full transition-transform origin-left duration-200",
                      isActive ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                </Link>
              )
            })}
          </nav>

          {/* Right Action Pill Cluster */}
          <div className="flex items-center gap-2">
            {user && (
              <div
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-pantry-elevated/80 border border-pantry-border"
                title={isConnected ? "Real-time SSE connected" : "Connecting to SSE..."}
              >
                <span
                  className={cn(
                    "w-2 h-2 rounded-full",
                    isConnected ? "bg-coral animate-pulse" : "bg-amber-400",
                  )}
                />
                <span className="text-pantry-muted">{isConnected ? "Live" : "Sync"}</span>
              </div>
            )}

            {!isAdmin && user && (
              <button
                type="button"
                onClick={toggleDrawer}
                aria-label="Open snack basket"
                className="relative px-3 py-2 rounded-full ordan-btn-light text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <ShoppingBag className="w-4 h-4 text-coral" />
                <span className="hidden sm:inline">Basket</span>
                {totalPackets > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-coral text-white">
                    {totalPackets}
                  </span>
                )}
              </button>
            )}

            <ThemeToggle />

            {user && (
              <button
                type="button"
                onClick={() => logout()}
                title={`Sign out (${user.name})`}
                className="ordan-btn-dark rounded-full px-3.5 py-2 text-xs font-semibold inline-flex items-center gap-2 transition-all"
              >
                <span className="hidden sm:inline max-w-[96px] truncate">
                  {user.name.split(" ")[0]}
                </span>
                <LogOut className="w-3.5 h-3.5 text-coral" />
              </button>
            )}
          </div>
        </header>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-obsidian-950/55 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-3 left-3 w-72 rounded-4xl ordan-card p-6 flex flex-col justify-between animate-in slide-in-from-left duration-200">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 relative">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-full ordan-icon-glow flex items-center justify-center text-xs font-extrabold">
                    SO
                  </span>
                  <span className="font-bold text-pantry-text tracking-tight text-base">
                    Snack<span className="text-coral">Overflow</span>
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-full text-pantry-muted hover:text-coral hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="ordan-divider absolute bottom-0 left-0 right-0" />
              </div>

              <nav className="space-y-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.href
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-full text-sm font-semibold transition-all",
                        isActive
                          ? "ordan-btn-dark text-white"
                          : "text-pantry-text/80 hover:text-coral hover:bg-black/[0.04] dark:hover:bg-white/[0.06]",
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-4 h-4",
                          isActive ? "text-coral" : "text-pantry-muted",
                        )}
                      />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}

                {!isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      toggleDrawer()
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-full text-sm font-semibold ordan-btn-light mt-2"
                  >
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="w-4 h-4 text-coral" />
                      <span>Snack Basket</span>
                    </div>
                    {totalPackets > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-coral text-white">
                        {totalPackets}
                      </span>
                    )}
                  </button>
                )}
              </nav>
            </div>

            {user && (
              <div className="pt-4 relative space-y-3">
                <div className="ordan-divider absolute top-0 left-0 right-0" />
                <div className="flex items-center gap-3 pt-2">
                  <div className="w-9 h-9 rounded-full bg-obsidian-950 text-white flex items-center justify-center font-bold text-xs uppercase">
                    {user.name.charAt(0)}
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <p className="text-xs font-semibold text-pantry-text truncate">
                      {user.name}
                    </p>
                    <RoleBadge role={user.role} className="mt-0.5" />
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    logout()
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold ordan-btn-brand"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
