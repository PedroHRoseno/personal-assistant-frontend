"use client";

import { Check, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { completeTodayTask, fetchPendingTodayTasks, taskTypeLabel } from "@/lib/widget-tasks";
import type { TodayTask } from "@/lib/types";
import { cn } from "@/lib/utils";

type ChecklistItem = TodayTask & { optimisticDone?: boolean };

export function WidgetTaskChecklist() {
  const [tasks, setTasks] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    else setRefreshing(true);

    try {
      const pending = await fetchPendingTodayTasks();
      setTasks(pending);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar tarefas.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const toggleTask = useCallback(async (task: TodayTask) => {
    setTasks((current) =>
      current.map((entry) =>
        entry.id === task.id && entry.task_type === task.task_type
          ? { ...entry, optimisticDone: true }
          : entry,
      ),
    );

    try {
      await completeTodayTask(task);
      setTasks((current) =>
        current.filter((entry) => !(entry.id === task.id && entry.task_type === task.task_type)),
      );
      setError(null);
    } catch (err) {
      setTasks((current) =>
        current.map((entry) =>
          entry.id === task.id && entry.task_type === task.task_type
            ? { ...entry, optimisticDone: false }
            : entry,
        ),
      );
      setError(err instanceof Error ? err.message : "Falha ao concluir tarefa.");
    }
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Tarefas de hoje</p>
          <p className="text-xs text-slate-400">{tasks.length} pendente(s)</p>
        </div>
        <button
          type="button"
          onClick={() => void loadTasks({ silent: true })}
          disabled={refreshing}
          className="inline-flex h-8 items-center gap-1 rounded-full border border-slate-800 px-2.5 text-[11px] text-slate-400 transition hover:border-slate-700 hover:text-slate-200 disabled:opacity-50"
          aria-label="Atualizar lista"
        >
          <RefreshCw size={12} className={cn(refreshing && "animate-spin")} />
          Atualizar
        </button>
      </div>

      {error ? <p className="mb-2 text-xs text-rose-400">{error}</p> : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {loading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma tarefa pendente para hoje.</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => {
              const done = Boolean(task.optimisticDone);
              return (
                <li
                  key={`${task.task_type}-${task.id}`}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2.5 transition",
                    done && "opacity-60",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => void toggleTask(task)}
                    disabled={done}
                    className={cn(
                      "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition",
                      done
                        ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                        : "border-slate-700 bg-black text-slate-500 active:scale-95",
                    )}
                    aria-label={`Concluir ${task.title}`}
                  >
                    <Check size={16} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-sm text-slate-100",
                        done && "line-through decoration-slate-500",
                      )}
                    >
                      {task.title}
                    </p>
                    <p className="text-[11px] text-slate-500">{taskTypeLabel[task.task_type]}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
