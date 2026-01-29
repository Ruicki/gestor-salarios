'use client';
import * as React from "react"
import { cn } from "@/lib/utils"

const Dialog = ({ open, onOpenChange, children }: any) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
            {/* Content Container (Actual dialog handled by Content) */}
            {children}
        </div>
    );
}

const DialogContent = ({ className, children, ...props }: any) => (
    <div className={cn(
        "relative z-50 grid w-full max-w-lg gap-4 bg-white dark:bg-zinc-950 p-6 shadow-lg sm:rounded-lg border border-zinc-200 dark:border-zinc-800",
        className
    )} {...props}>
        {children}
    </div>
)

const DialogHeader = ({ className, ...props }: any) => (
    <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
)

const DialogFooter = ({ className, ...props }: any) => (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
)

const DialogTitle = ({ className, ...props }: any) => (
    <div className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
)

export { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle }
