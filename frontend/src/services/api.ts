const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

export class ApiClientError extends Error {
  public code: string
  public status: number

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = "ApiClientError"
    this.status = status
    this.code = code
  }
}

// In-memory CSRF token cache
let cachedCsrfToken: string | null = null

export function setCsrfToken(token: string | null): void {
  cachedCsrfToken = token
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp("(^|;\\s*)(" + name + ")=([^;]*)"))
  return match ? decodeURIComponent(match[3]) : null
}

export function getCsrfToken(): string | null {
  if (cachedCsrfToken) return cachedCsrfToken
  const cookieToken = getCookie("snack_csrf")
  if (cookieToken) {
    cachedCsrfToken = cookieToken
    return cookieToken
  }
  return null
}

/**
 * Centralized fetch client for Snack Overflow REST API.
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }

  const method = (options.method || "GET").toUpperCase()
  const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(method)

  // If mutating and we don't have a CSRF token yet, attempt retrieval from cookie or API
  if (isMutating && !endpoint.includes("/auth/csrf-token")) {
    let token = getCsrfToken()
    if (!token && typeof window !== "undefined") {
      try {
        const csrfRes = await fetch(`${API_BASE_URL}/auth/csrf-token`, {
          credentials: "include",
          cache: "no-store",
        })
        if (csrfRes.ok) {
          const json = await csrfRes.json()
          if (json?.csrfToken) {
            token = json.csrfToken
            setCsrfToken(token)
          }
        }
      } catch {
        // Fallback silently if network fails; let request proceed
      }
    }

    if (token) {
      headers["X-CSRF-Token"] = token
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // Automatically sends HTTP-only session cookies
  })

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const errorCode = data?.error?.code || "API_ERROR"
    const errorMessage =
      data?.error?.message || `Request failed with status ${response.status}`
    throw new ApiClientError(response.status, errorCode, errorMessage)
  }

  return data as T
}
