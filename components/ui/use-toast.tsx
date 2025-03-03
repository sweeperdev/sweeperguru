import { createContext, useContext, useState, } from "react"

export type ToastProps = {
  title?: string
  description?: string
  duration?: number
  variant?: "default" | "success" | "error"
  link?: string
}

type ToastState = ToastProps & {
  id: string
  visible: boolean
}

type ToastContextType = {
  toasts: ToastState[]
  toast: (props: ToastProps) => string
  dismiss: (id: string) => void
}

// Create context with default values
const ToastContext = createContext<ToastContextType>({
  toasts: [],
  toast: () => "",
  dismiss: () => {},
})

// Provider component
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastState[]>([])

  const addToast = (toast: ToastProps) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: ToastState = {
      ...toast,
      id,
      visible: true,
      duration: toast.duration || 3000,
    }
    
    setToasts(prev => [...prev, newToast])
    
    // Auto-dismiss
    setTimeout(() => {
      dismissToast(id)
    }, newToast.duration)
    
    return id
  }

  const dismissToast = (id: string) => {
    setToasts(prev => 
      prev.map(toast => 
        toast.id === id ? { ...toast, visible: false } : toast
      )
    )
    
    // Remove from array after animation
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, 300)
  }

  return (
    <ToastContext.Provider value={{ toasts, toast: addToast, dismiss: dismissToast }}>
      {children}
    </ToastContext.Provider>
  )
}

// Hook to use the toast context
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

// For direct imports - this is a client-side only function
let toastFn: (props: ToastProps) => string = () => ""

// Initialize on client side only
if (typeof window !== "undefined") {
  // This will be initialized when the first component using toast renders
  toastFn = (props: ToastProps) => {
    // Find the toast context in the DOM
    const event = new CustomEvent("toast", { detail: props })
    window.dispatchEvent(event)
    return ""
  }
}

export const toast = (props: ToastProps) => toastFn(props) 