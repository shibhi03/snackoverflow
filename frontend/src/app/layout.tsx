import type { Metadata } from "next"
import "./globals.css"
import { QueryProvider } from "../context/QueryProvider"
import { AuthProvider } from "../context/AuthContext"
import { ToastProvider } from "../context/ToastContext"
import { ThemeProvider } from "../context/ThemeContext"
import { BasketProvider } from "../context/BasketContext"

export const metadata: Metadata = {
  title: "Snack Overflow — Office Pantry & Inventory",
  description: "Concurrency-safe office pantry and snack inventory tracker",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Urbanist:wght@400;500;600;700;800&display=swap"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('snack_overflow_theme');
                const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="antialiased bg-pantry-bg text-pantry-text min-h-screen font-sans selection:bg-coral/20 selection:text-coral">
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <BasketProvider>
                <ToastProvider>{children}</ToastProvider>
              </BasketProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
