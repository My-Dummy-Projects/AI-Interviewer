import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConfirmModal({ open, title, message, confirmLabel, cancelLabel, onConfirm, onCancel }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a0a0a] p-8 shadow-2xl"
          >
            <button
              onClick={onCancel}
              className="absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-all"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>

            <div className="text-center">
              <h3 className="text-lg font-semibold text-white" style={{ fontFamily: "var(--font-heading)" }}>
                {title}
              </h3>
              {message && (
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                  {message}
                </p>
              )}
            </div>

            <div className="mt-7 flex items-center gap-3">
              <Button
                onClick={onCancel}
                variant="outline"
                className="flex-1 rounded-full h-11 px-5 bg-transparent border-white/15 hover:bg-white/5 text-white text-sm font-medium"
              >
                {cancelLabel || "Cancel"}
              </Button>
              <Button
                onClick={onConfirm}
                className="flex-1 rounded-full h-11 px-5 text-sm font-semibold bg-cyan-500 hover:bg-cyan-400 text-black"
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
