import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConfirmModal({ open, title, message, confirmLabel, cancelLabel, onConfirm, onCancel, variant }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 shadow-2xl"
          >
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 h-7 w-7 rounded-full border border-white/10 hover:bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>

            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-red-400/10 border border-red-400/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-white" style={{ fontFamily: "var(--font-heading)" }}>
                  {title}
                </h3>
                {message && (
                  <p className="mt-1.5 text-sm text-zinc-400 leading-relaxed">
                    {message}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                onClick={onCancel}
                variant="outline"
                className="rounded-full h-10 px-5 bg-transparent border-white/15 hover:bg-white/5 text-white text-sm"
              >
                {cancelLabel || "Cancel"}
              </Button>
              <Button
                onClick={onConfirm}
                className={`rounded-full h-10 px-5 text-sm font-semibold ${
                  variant === "danger"
                    ? "bg-red-500 hover:bg-red-400 text-white"
                    : "bg-white hover:bg-zinc-200 text-black"
                }`}
              >
                {confirmLabel || "Confirm"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
