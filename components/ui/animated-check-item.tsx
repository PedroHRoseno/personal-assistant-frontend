"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AnimatedCheckItemProps = {
  checked: boolean;
  onToggle: () => void;
  title: string;
  meta?: string;
  actions?: ReactNode;
  className?: string;
};

export function AnimatedCheckItem({
  checked,
  onToggle,
  title,
  meta,
  actions,
  className,
}: AnimatedCheckItemProps) {
  return (
    <motion.div
      layout
      className={cn(
        "flex items-start justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/50 p-3 backdrop-blur-md",
        className,
      )}
      animate={{ opacity: checked ? 0.6 : 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      <div className="flex items-start gap-3">
        <motion.button
          type="button"
          onClick={onToggle}
          className={cn(
            "mt-0.5 inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full border transition",
            checked
              ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
              : "border-slate-600 bg-slate-950 text-slate-500",
          )}
          whileTap={{ scale: 0.92 }}
          transition={{ type: "spring", stiffness: 480, damping: 18 }}
        >
          <Check size={18} />
        </motion.button>

        <div>
          <div className="relative w-fit">
            <p className="text-sm text-slate-100">{title}</p>
            <motion.span
              className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2 bg-slate-300"
              initial={false}
              animate={{ width: checked ? "100%" : "0%" }}
              transition={{ duration: 0.25 }}
            />
          </div>
          {meta ? <p className="mt-1 text-xs text-slate-500">{meta}</p> : null}
        </div>
      </div>

      {actions ? <div>{actions}</div> : null}
    </motion.div>
  );
}
