"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { TaskEditModal } from "@/components/tasks/task-edit-modal";
import { AnimatedCheckItem } from "@/components/ui/animated-check-item";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";
import type { HomeTask } from "@/lib/types";

type HomeTaskType = HomeTask["task_type"];

export default function CasaPage() {
  const [tasks, setTasks] = useState<HomeTask[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [taskType, setTaskType] = useState<HomeTaskType>("diaria");
  const [title, setTitle] = useState("");
  const [zone, setZone] = useState("");
  const [intervalDays, setIntervalDays] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [editingTask, setEditingTask] = useState<HomeTask | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const todayTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (task.status === "concluido") return false;
        if (task.task_type === "diaria") return true;
        if (!task.due_date) return false;
        return task.due_date.slice(0, 10) <= today;
      }),
    [tasks, today],
  );
  const upcomingTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (task.status === "concluido") return false;
        if (task.task_type === "diaria") return false;
        if (!task.due_date) return true;
        return task.due_date.slice(0, 10) > today;
      }),
    [tasks, today],
  );
  const completedTasks = useMemo(
    () => tasks.filter((task) => task.status === "concluido" || (task.task_type === "diaria" && task.is_completed_today)),
    [tasks],
  );

  async function loadTasks() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<HomeTask[]>("/home-tasks");
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar tarefas de casa.");
    } finally {
      setLoading(false);
    }
  }

  async function createTask() {
    if (!title.trim()) {
      return;
    }
    try {
      const created = await apiFetch<HomeTask>("/home-tasks", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          zone: zone.trim() || null,
          task_type: taskType,
          recurrence_interval: taskType === "ocasional" && intervalDays ? Number(intervalDays) : null,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          priority: false,
          is_completed_today: false,
        }),
      });
      setTasks((prev) => [created, ...prev]);
      setTitle("");
      setZone("");
      setIntervalDays("");
      setDueDate("");
      setTaskType("diaria");
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar tarefa.");
    }
  }

  async function toggleCheck(task: HomeTask) {
    try {
      const updated = await apiFetch<HomeTask>(`/home-tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...(task.task_type === "diaria"
            ? { is_completed_today: !task.is_completed_today, status: !task.is_completed_today ? "concluido" : "backlog" }
            : { status: task.status === "concluido" ? "backlog" : "concluido" }),
        }),
      });
      setTasks((prev) => prev.map((item) => (item.id === task.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar tarefa.");
    }
  }

  async function removeTask(taskId: number) {
    try {
      await apiFetch<void>(`/home-tasks/${taskId}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((item) => item.id !== taskId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir tarefa.");
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  function renderChecklist(items: HomeTask[]) {
    return (
      <div className="space-y-2">
        {items.map((task) => (
          <AnimatedCheckItem
            key={task.id}
            checked={task.task_type === "diaria" ? task.is_completed_today : task.status === "concluido"}
            onToggle={() => toggleCheck(task)}
            title={task.title}
            meta={
              task.task_type === "ocasional" && task.recurrence_interval
                ? `a cada ${task.recurrence_interval} dias${task.due_date ? ` • ${new Date(task.due_date).toLocaleDateString("pt-BR")}` : ""}`
                : task.due_date
                  ? new Date(task.due_date).toLocaleDateString("pt-BR")
                  : undefined
            }
            actions={
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  className="h-7 px-2 text-xs text-slate-300"
                  onClick={() => {
                    setEditingTask(task);
                    setTaskModalOpen(true);
                  }}
                >
                  <Pencil size={14} />
                </Button>
                <Button variant="ghost" className="h-7 px-2 text-xs text-rose-400" onClick={() => removeTask(task.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            }
          />
        ))}
        {items.length === 0 ? <p className="text-sm text-slate-500">Nenhuma tarefa nesta seção.</p> : null}
      </div>
    );
  }

  return (
    <AppShell>
      <header className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 md:text-3xl">Checklist Pessoal/Casa</h1>
            <p className="mt-2 text-sm text-slate-400">Checklists agrupados para rotina diária, manutenção e tarefas únicas.</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>Adicionar Tarefa</Button>
        </div>
      </header>

      {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-400">Carregando tarefas...</p> : null}

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            {renderChecklist(todayTasks)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximas</CardTitle>
          </CardHeader>
          <CardContent>
            {renderChecklist(upcomingTasks)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Concluídas</CardTitle>
          </CardHeader>
          <CardContent>
            {renderChecklist(completedTasks)}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Tarefa</DialogTitle>
            <DialogDescription>Escolha o tipo e preencha os detalhes.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              value={taskType}
              onChange={(event) => setTaskType(event.target.value as HomeTaskType)}
            >
              <option value="diaria">Diária</option>
              <option value="ocasional">Ocasional</option>
              <option value="especifica">Única</option>
            </select>
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="Título da tarefa"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="Zona/Cômodo (opcional)"
              value={zone}
              onChange={(event) => setZone(event.target.value)}
            />
            {taskType === "ocasional" ? (
              <input
                type="number"
                min={1}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                placeholder="Intervalo em dias (ex.: 15)"
                value={intervalDays}
                onChange={(event) => setIntervalDays(event.target.value)}
              />
            ) : null}
            {taskType !== "diaria" ? <DatePicker value={dueDate} onChange={setDueDate} /> : null}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={createTask}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TaskEditModal
        open={taskModalOpen}
        onOpenChange={(open) => {
          setTaskModalOpen(open);
          if (!open) setEditingTask(null);
        }}
        editableTask={
          editingTask
            ? {
                task_type: "home",
                task: {
                  id: editingTask.id,
                  title: editingTask.title,
                  description: editingTask.description,
                  priority: editingTask.priority,
                  due_date: editingTask.due_date,
                },
              }
            : null
        }
        onSaved={loadTasks}
      />
    </AppShell>
  );
}
