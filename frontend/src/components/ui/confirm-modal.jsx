/**
 * Animated confirmation dialog (custom, not from shadcn): dims the screen,
 * shows a title/message, and exposes confirm/cancel callbacks.
 *
 * Optional typed-text gate: pass `requireText` to keep the confirm button
 * disabled until the user types that exact text (case-insensitive,
 * trimmed). `loading` disables both buttons and shows a spinner on
 * confirm. `destructive` styles the confirm button red.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  requireText,
  inputLabel,
  inputPlaceholder,
  inputTestId = "confirm-modal-input",
  confirmTestId = "confirm-modal-confirm",
  loading = false,
  destructive = false,
}) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (open) setText("");
  }, [open]);

  const matches =
    !requireText || text.trim().toLowerCase() === String(requireText).trim().toLowerCase();
  const confirmDisabled = !matches || loading;

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
              disabled={loading}
              aria-label="Close"
              className="absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-all disabled:opacity-40"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>

            <div className="text-center">
              <h3
                className="text-lg font-semibold text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {title}
              </h3>
              {message && (
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{message}</p>
              )}
            </div>

            {requireText && (
              <div className="mt-5 text-left">
                <Label htmlFor="confirm-modal-gate" className="label-overline mb-2 block">
                  {inputLabel || `Type "${requireText}" to confirm`}
                </Label>
                <Input
                  id="confirm-modal-gate"
                  data-testid={inputTestId}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={inputPlaceholder || ""}
                  autoComplete="off"
                  disabled={loading}
                  className="h-11 rounded-lg bg-white/[0.03] border-white/10 focus-visible:border-cyan-400/50 focus-visible:ring-1 focus-visible:ring-cyan-400/40 text-sm text-white placeholder:text-zinc-600"
                />
              </div>
            )}

            <div className="mt-7 flex items-center gap-3">
              <Button
                onClick={onCancel}
                disabled={loading}
                variant="outline"
                className="flex-1 rounded-full h-11 px-5 bg-transparent border-white/15 hover:bg-white/5 text-white text-sm font-medium disabled:opacity-40"
              >
                {cancelLabel || "Cancel"}
              </Button>
              <Button
                onClick={onConfirm}
                disabled={confirmDisabled}
                data-testid={confirmTestId}
                className={`flex-1 rounded-full h-11 px-5 text-sm font-semibold disabled:bg-white/10 disabled:text-zinc-600 ${
                  destructive
                    ? "bg-red-500 hover:bg-red-400 text-white"
                    : "bg-cyan-500 hover:bg-cyan-400 text-black"
                }`}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {confirmLabel || "Confirm"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
