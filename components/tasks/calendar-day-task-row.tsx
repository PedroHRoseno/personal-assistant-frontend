"use client";

import { memo } from "react";

import { Badge } from "@/components/ui/badge";
import { Pencil, type LucideIcon } from "lucide-react";
import type { TodayTask } from "@/lib/types";

const typeStyles: Record<TodayTask["task_type"], string> = {
  work: "border-emerald-700/60 bg-emerald-500/10 text-emerald-300",
  study: "border-indigo-700/60 bg-indigo-500/10 text-indigo-300",
  home: "border-amber-700/60 bg-amber-500/10 text-amber-300",
};

const typeLabel: Record<TodayTask["task_type"], string> = {
  work: "Trabalho",
  study: "Estudos",
  home: "Pessoal/Casa",
};

type CalendarDayTaskRowProps = {
  task: TodayTask;
  typeIcon: LucideIcon;
  onEdit: () => void;
};

export const CalendarDayTaskRow = memo(function CalendarDayTaskRow({
  task,
  typeIcon: Icon,
  onEdit,
}: CalendarDayTaskRowProps) {
  return (
    <div className="rounded-md border border-slate-800 p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Badge className={typeStyles[task.task_type]}>
            <Icon size={12} />
            {typeLabel[task.task_type]}
          </Badge>
          <span className="truncate text-xs text-slate-500">{task.status.replace("_", " ")}</span>
        </div>
        <button
          type="button"
          className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-1 rounded-md border border-slate-700 px-2 text-xs text-slate-300 transition hover:border-indigo-500 hover:text-indigo-300"
          onClick={onEdit}
        >
          <Pencil size={14} />
          <span className="sr-only sm:not-sr-only">Editar</span>
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-200">{task.title}</p>
    </div>
  );
});
