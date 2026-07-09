"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Briefcase, GraduationCap, Home as HomeIcon, Pencil } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { AppShell } from "@/components/layout/app-shell";
import { PomodoroTimer } from "@/components/pomodoro/pomodoro-timer";
import { CalendarDayTaskRow } from "@/components/tasks/calendar-day-task-row";
import { KanbanTaskCard } from "@/components/tasks/kanban-task-card";
import { TaskEditModal } from "@/components/tasks/task-edit-modal";
import { AnimatedCheckItem } from "@/components/ui/animated-check-item";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { celebrateTaskCompletion } from "@/lib/celebration";
import type { HomeChecklistWidgetItem, HomeTask, StudyTask, TodayTask, WorkTask } from "@/lib/types";

const columns = [
  { key: "backlog", label: "Backlog" },
  { key: "em_fazendo", label: "Em progresso" },
  { key: "concluido", label: "Concluído" },
] as const;

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

const typeIcon = {
  work: Briefcase,
  study: GraduationCap,
  home: HomeIcon,
};

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function HomePage() {
  const [items, setItems] = useState<TodayTask[]>([]);
  const [homeChecklist, setHomeChecklist] = useState<HomeChecklistWidgetItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [draggedTask, setDraggedTask] = useState<Pick<TodayTask, "id" | "task_type"> | null>(null);
  const [editingTask, setEditingTask] = useState<
    | {
        task_type: "work";
        task: Pick<WorkTask, "id" | "title" | "description" | "priority" | "due_date" | "context" | "label" | "context_id">;
      }
    | {
        task_type: "study";
        task: Pick<StudyTask, "id" | "title" | "description" | "priority" | "due_date" | "course_id">;
      }
    | {
        task_type: "home";
        task: Pick<HomeTask, "id" | "title" | "description" | "priority" | "due_date" | "zone" | "task_type" | "recurrence_interval">;
      }
    | null
  >(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kanbanItems = useMemo(
    () => items.filter((task) => task.task_type === "work" || task.task_type === "study"),
    [items],
  );

  const grouped = useMemo(() => {
    return {
      backlog: kanbanItems.filter((task) => task.status === "backlog"),
      em_fazendo: kanbanItems.filter((task) => task.status === "em_fazendo"),
      concluido: kanbanItems.filter((task) => task.status === "concluido"),
    };
  }, [kanbanItems]);

  const dueDateMap = useMemo(() => {
    const map = new Map<string, TodayTask[]>();
    for (const task of items) {
      if (!task.due_date) continue;
      const list = map.get(task.due_date) ?? [];
      list.push(task);
      map.set(task.due_date, list);
    }
    return map;
  }, [items]);

  const dueDays = useMemo(
    () =>
      Array.from(dueDateMap.keys()).map((value) => {
        const [year, month, day] = value.split("-").map(Number);
        return new Date(year, month - 1, day);
      }),
    [dueDateMap],
  );

  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    const key = getLocalDateKey(selectedDate);
    return dueDateMap.get(key) ?? [];
  }, [selectedDate, dueDateMap]);

  const quickHomeChecklist = useMemo(() => homeChecklist, [homeChecklist]);

  useEffect(() => {
    async function loadAllTasks() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<TodayTask[]>("/tasks/all");
        setItems(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar tarefas.");
      } finally {
        setLoading(false);
      }
    }
    loadAllTasks();
  }, []);

  useEffect(() => {
    async function loadHomeChecklist() {
      try {
        const data = await apiFetch<HomeChecklistWidgetItem[]>("/home-tasks/checklist-today");
        setHomeChecklist(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar checklist Pessoal/Casa.");
      }
    }
    loadHomeChecklist();
  }, []);

  const toggleHomeChecklistTask = useCallback(async (task: HomeChecklistWidgetItem) => {
    try {
      await apiFetch(`/home-tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify(
          task.task_type === "diaria"
            ? { is_completed_today: true, status: "concluido" }
            : { status: "concluido" },
        ),
      });
      const updated = await apiFetch<HomeChecklistWidgetItem[]>("/home-tasks/checklist-today");
      setHomeChecklist(updated);
      const allTasks = await apiFetch<TodayTask[]>("/tasks/all");
      setItems(allTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar checklist do lar.");
    }
  }, []);

  const updateTaskStatus = useCallback(async (task: TodayTask, newStatus: TodayTask["status"]) => {
    if (task.status === newStatus) return;

    setItems((prev) =>
      prev.map((entry) => (entry.id === task.id && entry.task_type === task.task_type ? { ...entry, status: newStatus } : entry)),
    );

    const endpoint =
      task.task_type === "work"
        ? `/work-tasks/${task.id}`
        : task.task_type === "study"
          ? `/study-tasks/${task.id}`
          : `/home-tasks/${task.id}`;

    try {
      await apiFetch(endpoint, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      if (newStatus === "concluido" && task.status !== "concluido") {
        if (task.task_type === "work") celebrateTaskCompletion("work");
        if (task.task_type === "study") celebrateTaskCompletion("study");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar status.");
      setItems((prev) =>
        prev.map((entry) => (entry.id === task.id && entry.task_type === task.task_type ? { ...entry, status: task.status } : entry)),
      );
    }
  }, []);

  async function refreshHomeData() {
    const [allTasks, checklist] = await Promise.all([
      apiFetch<TodayTask[]>("/tasks/all"),
      apiFetch<HomeChecklistWidgetItem[]>("/home-tasks/checklist-today"),
    ]);
    setItems(allTasks);
    setHomeChecklist(checklist);
  }

  const openTaskEditor = useCallback(async (task: TodayTask) => {
    try {
      if (task.task_type === "work") {
        const full = await apiFetch<WorkTask>(`/work-tasks/${task.id}`);
        setEditingTask({
          task_type: "work",
          task: {
            id: full.id,
            title: full.title,
            description: full.description,
            priority: full.priority,
            due_date: full.due_date,
            context: full.context,
            label: full.label,
            context_id: full.context_id,
          },
        });
      } else if (task.task_type === "study") {
        const full = await apiFetch<StudyTask>(`/study-tasks/${task.id}`);
        setEditingTask({
          task_type: "study",
          task: {
            id: full.id,
            title: full.title,
            description: full.description,
            priority: full.priority,
            due_date: full.due_date,
            course_id: full.course_id,
          },
        });
      } else {
        const full = await apiFetch<HomeTask>(`/home-tasks/${task.id}`);
        setEditingTask({
          task_type: "home",
          task: {
            id: full.id,
            title: full.title,
            description: full.description,
            priority: full.priority,
            due_date: full.due_date,
            zone: full.zone,
            task_type: full.task_type,
            recurrence_interval: full.recurrence_interval,
          },
        });
      }
      setTaskModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao abrir editor de tarefa.");
    }
  }, []);

  const openHomeChecklistEditor = useCallback(async (taskId: number) => {
    try {
      const full = await apiFetch<HomeTask>(`/home-tasks/${taskId}`);
      setEditingTask({
        task_type: "home",
        task: {
          id: full.id,
          title: full.title,
          description: full.description,
          priority: full.priority,
          due_date: full.due_date,
          zone: full.zone,
          task_type: full.task_type,
          recurrence_interval: full.recurrence_interval,
        },
      });
      setTaskModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao abrir editor de tarefa.");
    }
  }, []);

  return (
    <AppShell>
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-slate-100 md:text-3xl">Central de Execução</h2>
        <p className="mt-2 text-sm text-slate-400 md:text-base">
          Kanban unificado, pomodoro de foco e calendário de vencimentos.
        </p>
      </header>

      {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}
      {loading ? <p className="mb-4 text-sm text-slate-400">Carregando tarefas...</p> : null}

      <section className="mb-8">
        <div className="grid gap-4 xl:grid-cols-4">
          <div className="xl:col-span-3">
            <div className="grid gap-4 lg:grid-cols-3">
              {columns.map((column) => (
                <Card
                  key={column.key}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (!draggedTask) return;
                    const task = kanbanItems.find(
                      (entry) => entry.id === draggedTask.id && entry.task_type === draggedTask.task_type,
                    );
                    if (task) {
                      updateTaskStatus(task, column.key);
                    }
                    setDraggedTask(null);
                  }}
                >
                  <CardHeader>
                    <CardTitle>{column.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {grouped[column.key].map((task) => {
                      const Icon = typeIcon[task.task_type];
                      const dragged =
                        draggedTask?.id === task.id && draggedTask?.task_type === task.task_type;
                      return (
                        <KanbanTaskCard
                          key={`${task.task_type}-${task.id}`}
                          task={task}
                          typeIcon={Icon}
                          dragged={dragged}
                          onDragStart={() => setDraggedTask({ id: task.id, task_type: task.task_type })}
                          onDragEnd={() => setDraggedTask(null)}
                          onEdit={() => void openTaskEditor(task)}
                        />
                      );
                    })}
                    {grouped[column.key].length === 0 ? (
                      <p className="rounded-md border border-dashed border-slate-700 p-3 text-sm text-slate-500">
                        Sem tarefas nesta coluna.
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-4 xl:sticky xl:top-4">
            <PomodoroTimer />

            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Checklist Rápido Pessoal/Casa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {quickHomeChecklist.map((task) => (
                  <AnimatedCheckItem
                    key={task.id}
                    checked={false}
                    onToggle={() => toggleHomeChecklistTask(task)}
                    title={task.title}
                    actions={
                      <div className="flex items-center gap-1">
                        <Badge className="border-amber-700/60 bg-amber-500/10 text-amber-300">{task.task_type}</Badge>
                        <button
                          type="button"
                          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-slate-700 text-xs text-slate-300 transition hover:border-indigo-500 hover:text-indigo-300"
                          onClick={() => void openHomeChecklistEditor(task.id)}
                        >
                          <Pencil size={14} />
                          <span className="sr-only">Editar</span>
                        </button>
                      </div>
                    }
                  />
                ))}
                {quickHomeChecklist.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhuma pendência do lar para hoje.</p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Calendário de Vencimentos</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{ due: dueDays }}
                modifiersClassNames={{ due: "bg-indigo-500/30 text-indigo-100 rounded-full" }}
              />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-200">
                {selectedDate
                  ? `Tarefas em ${selectedDate.toLocaleDateString("pt-BR")}`
                  : "Selecione um dia"}
              </h3>
              <div className="space-y-2">
                {selectedDateTasks.map((task) => {
                  const Icon = typeIcon[task.task_type];
                  return (
                    <CalendarDayTaskRow
                      key={`${task.task_type}-${task.id}`}
                      task={task}
                      typeIcon={Icon}
                      onEdit={() => void openTaskEditor(task)}
                    />
                  );
                })}
                {selectedDateTasks.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhuma tarefa com vencimento neste dia.</p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <TaskEditModal
        open={taskModalOpen}
        onOpenChange={(open) => {
          setTaskModalOpen(open);
          if (!open) setEditingTask(null);
        }}
        editableTask={editingTask}
        onSaved={refreshHomeData}
      />
    </AppShell>
  );
}
