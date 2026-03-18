import * as React from "react";

import { cn } from "@/lib/utils";

type BadgeProps = React.ComponentProps<"span"> & {
  variant?: "default" | "dev" | "conteudo" | "priority" | "high" | "medium" | "low";
};

const variantStyles: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "border-slate-700 bg-slate-800 text-slate-200",
  dev: "border-emerald-700/70 bg-emerald-500/15 text-emerald-300",
  conteudo: "border-violet-700/70 bg-violet-500/15 text-violet-300",
  priority: "border-rose-700/70 bg-rose-500/20 text-rose-300",
  high: "border-rose-700/70 bg-rose-500/20 text-rose-300",
  medium: "border-amber-700/70 bg-amber-500/20 text-amber-300",
  low: "border-sky-700/70 bg-sky-500/20 text-sky-300",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium uppercase",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
