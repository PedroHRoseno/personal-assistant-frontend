"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Link2, Pencil, Plus, Trash2 } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { TaskEditModal } from "@/components/tasks/task-edit-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";
import type { WorkHub, WorkHubLink, WorkTask } from "@/lib/types";

type LocalPriority = "Alta" | "Média" | "Baixa";

function mapHubToContext(name?: string): WorkTask["context"] {
  if (!name) return "programacao";
  const normalized = name.toLowerCase();
  if (normalized.includes("almotos") || normalized.includes("producao")) return "almotos";
  if (normalized.includes("gestao") || normalized.includes("admin")) return "gestao_admin";
  return "programacao";
}

function mapHubToLabel(name?: string): WorkTask["label"] {
  if (!name) return "dev";
  const normalized = name.toLowerCase();
  return normalized.includes("almotos") || normalized.includes("conteudo") ? "conteudo" : "dev";
}

function formatDueLabel(dueDate: string | null) {
  if (!dueDate) return "Sem prazo";
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours >= 0 && diffHours <= 24) return `Expira em ${Math.max(diffHours, 1)} hora(s)`;
  if (diffDays === 1) return "Para amanhã";
  if (diffDays > 1) return `Em ${diffDays} dia(s)`;
  if (diffHours < 0) return "Atrasada";
  return due.toLocaleString("pt-BR");
}

export default function WorkHubPage() {
  const params = useParams<{ id: string }>();
  const [hubId, setHubId] = useState<number | null>(null);
  const [hub, setHub] = useState<WorkHub | null>(null);
  const [tasks, setTasks] = useState<WorkTask[]>([]);

  const [notes, setNotes] = useState("");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<WorkTask | null>(null);

  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState<LocalPriority>("Média");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const parsed = Number(params.id);
    if (!Number.isNaN(parsed)) setHubId(parsed);
  }, [params]);

  async function loadHubData(id: number) {
    setError(null);
    try {
      const [hubData, taskData] = await Promise.all([
        apiFetch<WorkHub>(`/work-hubs/${id}`),
        apiFetch<WorkTask[]>(`/work-tasks?context_id=${id}`),
      ]);
      setHub(hubData);
      setTasks(taskData);
      setNotes(hubData.notes ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar hub de trabalho.");
    }
  }

  useEffect(() => {
    if (hubId) loadHubData(hubId);
  }, [hubId]);

  useEffect(() => {
    if (!hubId) return;
    const timeout = setTimeout(async () => {
      try {
        await apiFetch<WorkHub>(`/work-hubs/${hubId}`, {
          method: "PATCH",
          body: JSON.stringify({ notes }),
        });
      } catch {}
    }, 700);
    return () => clearTimeout(timeout);
  }, [notes, hubId]);

  async function addLink() {
    if (!hubId || !linkTitle.trim() || !linkUrl.trim()) return;
    try {
      const created = await apiFetch<WorkHubLink>(`/work-hubs/${hubId}/links`, {
        method: "POST",
        body: JSON.stringify({ title: linkTitle.trim(), url: linkUrl.trim() }),
      });
      setHub((prev) => (prev ? { ...prev, links: [created, ...prev.links] } : prev));
      setLinkTitle("");
      setLinkUrl("");
      setLinkDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao adicionar link.");
    }
  }

  async function removeLink(linkId: number) {
    if (!hubId) return;
    try {
      await apiFetch<void>(`/work-hubs/${hubId}/links/${linkId}`, { method: "DELETE" });
      setHub((prev) => (prev ? { ...prev, links: prev.links.filter((link) => link.id !== linkId) } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao remover link.");
    }
  }

  async function addTask() {
    if (!hubId || !taskTitle.trim()) return;
    try {
      const created = await apiFetch<WorkTask>("/work-tasks", {
        method: "POST",
        body: JSON.stringify({
          title: taskTitle.trim(),
          description: taskDescription.trim() || null,
          context: mapHubToContext(hub?.name),
          context_id: hubId,
          label: mapHubToLabel(hub?.name),
          priority: taskPriority === "Alta",
          due_date: taskDueDate ? new Date(taskDueDate).toISOString() : null,
        }),
      });
      setTasks((prev) => [created, ...prev]);
      setTaskTitle("");
      setTaskDescription("");
      setTaskPriority("Média");
      setTaskDueDate("");
      setTaskDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar tarefa.");
    }
  }

  async function removeTask(taskId: number) {
    try {
      await apiFetch<void>(`/work-tasks/${taskId}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir tarefa.");
    }
  }

  const sortedTasks = useMemo(
    () =>
      [...tasks].sort((left, right) => {
        const leftDue = left.due_date ? new Date(left.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const rightDue = right.due_date ? new Date(right.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        if (leftDue !== rightDue) return leftDue - rightDue;
        if (left.priority === right.priority) return 0;
        return left.priority ? -1 : 1;
      }),
    [tasks],
  );

  return (
    <AppShell>
      <header className="mb-6">
        <Link href="/trabalho" className="text-sm text-indigo-300 hover:underline">
          Voltar para Hubs de Trabalho
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-100 md:text-3xl">{hub?.name ?? "Hub de Trabalho"}</h1>
        <p className="mt-2 text-sm text-slate-400">{hub?.description ?? "Sem descrição."}</p>
      </header>

      {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Anotações / DevLog</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="h-72 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="Registre decisões técnicas, checkpoints e observações..."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
            <p className="mt-2 text-xs text-slate-500">Auto-save ativo.</p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Links Úteis</CardTitle>
              <Button className="h-8 px-2" variant="outline" onClick={() => setLinkDialogOpen(true)}>
                <Plus size={14} />
                Novo Link
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {(hub?.links ?? []).map((link) => (
                <div key={link.id} className="flex items-center justify-between gap-2 rounded-md border border-slate-800 p-2">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-indigo-300 hover:underline"
                  >
                    <Link2 size={14} />
                    {link.title}
                  </a>
                  <Button variant="ghost" className="h-7 px-2 text-xs text-rose-400" onClick={() => removeLink(link.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
              {(hub?.links ?? []).length === 0 ? <p className="text-sm text-slate-500">Sem links cadastrados.</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Tarefas do Contexto</CardTitle>
              <Button className="h-8 px-2" variant="outline" onClick={() => setTaskDialogOpen(true)}>
                <Plus size={14} />
                Nova Tarefa
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {sortedTasks.map((task) => (
                <div key={task.id} className="rounded-md border border-slate-800 p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm text-slate-100">{task.title}</p>
                      <p className="text-xs text-slate-500">{formatDueLabel(task.due_date)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        className="h-7 px-2 text-xs text-slate-300"
                        onClick={() => {
                          setEditingTask(task);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button variant="ghost" className="h-7 px-2 text-xs text-rose-400" onClick={() => removeTask(task.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {sortedTasks.length === 0 ? <p className="text-sm text-slate-500">Sem tarefas neste contexto.</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Link</DialogTitle>
            <DialogDescription>Adicione um link útil para este contexto.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="Nome"
              value={linkTitle}
              onChange={(event) => setLinkTitle(event.target.value)}
            />
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="URL"
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setLinkDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={addLink}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
            <DialogDescription>Crie uma tarefa para este hub de trabalho.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="Título"
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
            />
            <textarea
              className="h-20 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="Descrição"
              value={taskDescription}
              onChange={(event) => setTaskDescription(event.target.value)}
            />
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              value={taskPriority}
              onChange={(event) => setTaskPriority(event.target.value as LocalPriority)}
            >
              <option value="Alta">Alta</option>
              <option value="Média">Média</option>
              <option value="Baixa">Baixa</option>
            </select>
            <DatePicker value={taskDueDate} onChange={setTaskDueDate} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setTaskDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={addTask}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TaskEditModal
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditingTask(null);
        }}
        editableTask={
          editingTask
            ? {
                task_type: "work",
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
        onSaved={() => {
          if (hubId) {
            loadHubData(hubId);
          }
        }}
      />
    </AppShell>
  );
}
