'use client'

import React, { useState, useEffect } from "react"
import { ToastProvider, type ToastProps } from "./use-toast"
import { cn } from "@/lib/utils"
import { Icons } from "./icons"

// Export the ToastProvider for use in layout
export { ToastProvider }

// Standalone Toaster component that doesn't rely on context
export function Toaster() {
  const [toasts, setToasts] = useState<Array<ToastProps & { id: string; visible: boolean }>>([])
  
  // Listen for toast events
  useEffect(() => {
    const handleToast = (e: CustomEvent<ToastProps>) => {
      const id = Math.random().toString(36).substring(2, 9)
      const newToast = {
        ...e.detail,
        id,
        visible: true
      }
      
      setToasts(prev => [...prev, newToast])
      
      // Auto dismiss
      setTimeout(() => {
        setToasts(prev => 
          prev.map(toast => 
            toast.id === id ? { ...toast, visible: false } : toast
          )
        )
        
        // Remove from array after animation
        setTimeout(() => {
          setToasts(prev => prev.filter(toast => toast.id !== id))
        }, 300)
      }, e.detail.duration || 3000)
    }
    
    window.addEventListener('toast', handleToast as EventListener)
    return () => {
      window.removeEventListener('toast', handleToast as EventListener)
    }
  }, [])
  
  const dismiss = (id: string) => {
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

  const getVariantStyles = (variant?: string) => {
    switch (variant) {
      case 'success':
        return "border-green-200 dark:border-green-800";
      case 'error':
        return "border-red-200 dark:border-red-800";
      default:
        return "border-border";
    }
  }

  const getIconStyles = (variant?: string) => {
    switch (variant) {
      case 'success':
        return "bg-green-100 dark:bg-green-900/30";
      case 'error':
        return "bg-red-100 dark:bg-red-900/30";
      default:
        return "bg-primary/10";
    }
  }

  const getIcon = (variant?: string) => {
    switch (variant) {
      case 'success':
        return <Icons.check className="h-3 w-3 text-green-600 dark:text-green-400" />;
      case 'error':
        return <Icons.warning className="h-3 w-3 text-red-600 dark:text-red-400" />;
      default:
        return <Icons.check className="h-3 w-3 text-primary" />;
    }
  }
  
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(toast => {
        // Check if there's a link in the description
        let description = toast.description || '';
        const linkMatch = description.match(/https?:\/\/[^\s]+/);
        const link = toast.link || (linkMatch ? linkMatch[0] : null);
        
        // Remove the link from description if it exists and no explicit link is provided
        if (linkMatch && !toast.link) {
          description = description.replace(linkMatch[0], '');
        }

        return (
          <div
            key={toast.id}
            className={cn(
              "bg-background border rounded-lg shadow-lg p-4 max-w-sm w-full transform transition-all duration-300",
              getVariantStyles(toast.variant),
              "flex items-start gap-3",
              toast.visible 
                ? "translate-x-0 opacity-100" 
                : "translate-x-full opacity-0"
            )}
          >
            <div className={cn(
              "h-6 w-6 flex-shrink-0 rounded-full flex items-center justify-center",
              getIconStyles(toast.variant)
            )}>
              {getIcon(toast.variant)}
            </div>
            <div className="flex-1 space-y-1">
              {toast.title && (
                <h4 className="font-medium text-sm">{toast.title}</h4>
              )}
              {description && (
                <p className="text-xs text-muted-foreground whitespace-pre-line">{description}</p>
              )}
              {link && (
                <div className="mt-2">
                  <a 
                    href={link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center text-xs rounded-md px-2.5 py-1.5 font-medium",
                      toast.variant === 'success' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                      toast.variant === 'error' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                      "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                  >
                    <Icons.externalLink className="mr-1.5 h-3 w-3" />
                    View Transaction
                  </a>
                </div>
              )}
            </div>
            <button 
              onClick={() => dismiss(toast.id)}
              className="h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center"
            >
              <Icons.close className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        );
      })}
    </div>
  )
} 