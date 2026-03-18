import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: "default" | "outline" | "ghost" | "link";
};

const variantMap: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default: "bg-indigo-600 text-white hover:bg-indigo-500",
  outline: "border border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800",
  ghost: "text-slate-300 hover:bg-slate-800",
  link: "text-indigo-300 underline-offset-4 hover:underline",
};

function Button({ className, variant = "default", ...props }: ButtonProps) {
  return (
    <button
      data-slot="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50",
        variantMap[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Button };
