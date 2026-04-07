"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Pencil, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

type KanbanTaskCardProps = {
  task: TodayTask;
  typeIcon: LucideIcon;
  dragged: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onEdit: () => void;
};

export const KanbanTaskCard = memo(function KanbanTaskCard({
  task,
  typeIcon: Icon,
  dragged,
  onDragStart,
  onDragEnd,
  onEdit,
}: KanbanTaskCardProps) {
  return (
    <motion.article
      layout
      layoutId={`task-${task.task_type}-${task.id}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`rounded-lg border border-slate-800/90 bg-slate-900/50 p-3 backdrop-blur-md transition ${
        dragged ? "rotate-[2deg] shadow-2xl shadow-indigo-500/30" : ""
      } ${
        task.priority
          ? "ring-1 ring-violet-500/40 shadow-[0_0_16px_rgba(139,92,246,0.3)] animate-pulse"
          : ""
      }`}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center gap-2">
        <Badge className={typeStyles[task.task_type]}>
          <Icon size={12} />
          {typeLabel[task.task_type]}
        </Badge>
        {task.priority ? <Badge variant="priority">Prioridade</Badge> : null}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-100">{task.title}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">{task.due_date ?? "Sem prazo"}</p>
        <button
          type="button"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-md border border-slate-700 px-2 text-xs text-slate-300 transition hover:border-indigo-500 hover:text-indigo-300"
          onClick={onEdit}
        >
          <Pencil size={14} />
          <span className="sr-only sm:not-sr-only">Editar</span>
        </button>
      </div>
    </motion.article>
  );
});
