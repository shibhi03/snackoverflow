"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { User } from "../types/index"
import { authService } from "../services/auth.service"
import { useRouter } from "next/navigation"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, passwordPlain: string) => Promise<void>
  logout: () => Promise<void>
  isAdmin: boolean
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authService.getMe()
      setUser(currentUser)
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = async (email: string, passwordPlain: string) => {
    const loggedInUser = await authService.login(email, passwordPlain)
    setUser(loggedInUser)
    if (loggedInUser.role === "ADMIN") {
      router.push("/dashboard")
    } else {
      router.push("/snacks")
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
    } catch (err) {
      console.warn("Logout request threw error, clearing local session anyway:", err)
    } finally {
      setUser(null)
      router.push("/login")
    }
  }

  const isAdmin = user?.role === "ADMIN"

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAdmin,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
