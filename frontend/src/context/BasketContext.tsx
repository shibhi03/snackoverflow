"use client"

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react"
import { Snack, SnackCategory } from "../types/index"

export interface BasketItem {
  snackId: string
  name: string
  category: SnackCategory
  amount: number
  availableQuantity: number
}

interface BasketContextType {
  items: BasketItem[]
  totalPackets: number
  totalItems: number
  uniqueCount: number
  isDrawerOpen: boolean
  setIsDrawerOpen: (open: boolean) => void
  toggleDrawer: () => void
  openBasket: () => void
  addItem: (snack: Snack, amount?: number) => void
  updateQuantity: (snackId: string, amount: number) => void
  removeItem: (snackId: string) => void
  clearBasket: () => void
  getItemAmount: (snackId: string) => number
}

const BasketContext = createContext<BasketContextType | undefined>(undefined)

const BASKET_STORAGE_KEY = "snack_overflow_basket"

export function BasketProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<BasketItem[]>([])
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(BASKET_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          setItems(parsed)
        }
      }
    } catch {
      // Ignore parse errors
    } finally {
      setIsInitialized(true)
    }
  }, [])

  // Save to localStorage on change
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(BASKET_STORAGE_KEY, JSON.stringify(items))
    }
  }, [items, isInitialized])

  const toggleDrawer = useCallback(() => {
    setIsDrawerOpen((prev) => !prev)
  }, [])

  const addItem = useCallback((snack: Snack, amount = 1) => {
    if (snack.quantity <= 0) return

    setItems((prev) => {
      const existing = prev.find((i) => i.snackId === snack.id)
      if (existing) {
        // Increment quantity up to live available quantity
        const newAmount = Math.min(existing.amount + amount, snack.quantity)
        return prev.map((i) =>
          i.snackId === snack.id
            ? { ...i, amount: newAmount, availableQuantity: snack.quantity }
            : i,
        )
      } else {
        return [
          ...prev,
          {
            snackId: snack.id,
            name: snack.name,
            category: snack.category,
            amount: Math.min(amount, snack.quantity),
            availableQuantity: snack.quantity,
          },
        ]
      }
    })
  }, [])

  const updateQuantity = useCallback((snackId: string, amount: number) => {
    setItems((prev) => {
      if (amount <= 0) {
        return prev.filter((i) => i.snackId !== snackId)
      }
      return prev.map((item) => {
        if (item.snackId === snackId) {
          const clamped = Math.min(amount, item.availableQuantity)
          return { ...item, amount: clamped }
        }
        return item
      })
    })
  }, [])

  const removeItem = useCallback((snackId: string) => {
    setItems((prev) => prev.filter((i) => i.snackId !== snackId))
  }, [])

  const clearBasket = useCallback(() => {
    setItems([])
  }, [])

  const getItemAmount = useCallback(
    (snackId: string): number => {
      const found = items.find((i) => i.snackId === snackId)
      return found ? found.amount : 0
    },
    [items],
  )

  const totalPackets = useMemo(() => items.reduce((acc, i) => acc + i.amount, 0), [items])
  const uniqueCount = items.length

  const openBasket = useCallback(() => {
    setIsDrawerOpen(true)
  }, [])

  return (
    <BasketContext.Provider
      value={{
        items,
        totalPackets,
        totalItems: totalPackets,
        uniqueCount,
        isDrawerOpen,
        setIsDrawerOpen,
        toggleDrawer,
        openBasket,
        addItem,
        updateQuantity,
        removeItem,
        clearBasket,
        getItemAmount,
      }}
    >
      {children}
    </BasketContext.Provider>
  )
}

export function useBasket() {
  const context = useContext(BasketContext)
  if (!context) {
    throw new Error("useBasket must be used within a BasketProvider")
  }
  return context
}
