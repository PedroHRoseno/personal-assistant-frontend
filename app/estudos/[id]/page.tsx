"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { AppShell } from "@/components/layout/app-shell";
import { TaskEditModal } from "@/components/tasks/task-edit-modal";
import { AnimatedCheckItem } from "@/components/ui/animated-check-item";
import { Badge } from "@/components/ui/badge";
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
import { celebrateTaskCompletion } from "@/lib/celebration";
import type { Course, CoursePinnedLink, CourseScheduleItem, StudyTask } from "@/lib/types";

export default function CourseDetailsPage() {
  const params = useParams<{ id: string }>();
  const [courseId, setCourseId] = useState<number | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [newTaskDialogOpen, setNewTaskDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);

  const [editCourseTitle, setEditCourseTitle] = useState("");
  const [editCourseDescription, setEditCourseDescription] = useState("");
  const [editCourseNotes, setEditCourseNotes] = useState("");
  const [editCourseSchedule, setEditCourseSchedule] = useState<CourseScheduleItem[]>([]);
  const [editCourseLinks, setEditCourseLinks] = useState<Array<{ id?: number; title: string; url: string }>>([]);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<StudyTask["priority"]>("Média");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const parsed = Number(params.id);
    if (!Number.isNaN(parsed)) {
      setCourseId(parsed);
    }
  }, [params]);

  async function loadData(id: number) {
    setError(null);
    try {
      const [courseData, taskData] = await Promise.all([
        apiFetch<Course>(`/courses/${id}`),
        apiFetch<StudyTask[]>(`/study-tasks?course_id=${id}`),
      ]);
      setCourse(courseData);
      setTasks(taskData);
      setEditCourseTitle(courseData.title ?? "");
      setEditCourseDescription(courseData.description ?? "");
      setEditCourseNotes(courseData.notes ?? "");
      setEditCourseSchedule(courseData.schedule ?? []);
      setEditCourseLinks(
        courseData.pinned_links.map((link) => ({
          id: link.id,
          title: link.title ?? "",
          url: link.url,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar detalhes do curso.");
    }
  }

  useEffect(() => {
    if (courseId) {
      loadData(courseId);
    }
  }, [courseId]);

  async function saveCourse() {
    if (!courseId) return;
    try {
      await apiFetch<Course>(`/courses/${courseId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editCourseTitle.trim(),
          description: editCourseDescription.trim() || null,
          notes: editCourseNotes,
          schedule: editCourseSchedule.filter((entry) => entry.day && entry.time),
        }),
      });

      const existingIds = new Set((course?.pinned_links ?? []).map((link) => link.id));
      const keepIds = new Set(editCourseLinks.filter((link) => link.id).map((link) => link.id as number));

      for (const id of existingIds) {
        if (!keepIds.has(id)) {
          await apiFetch<void>(`/courses/${courseId}/pinned-links/${id}`, { method: "DELETE" });
        }
      }

      const existingById = new Map((course?.pinned_links ?? []).map((link) => [link.id, link]));
      for (const link of editCourseLinks) {
        if (!link.title.trim() || !link.url.trim()) continue;
        if (!link.id) {
          await apiFetch<CoursePinnedLink>(`/courses/${courseId}/pinned-links`, {
            method: "POST",
            body: JSON.stringify({ title: link.title.trim(), url: link.url.trim() }),
          });
          continue;
        }
        const previous = existingById.get(link.id);
        if (!previous || previous.title !== link.title || previous.url !== link.url) {
          await apiFetch<void>(`/courses/${courseId}/pinned-links/${link.id}`, { method: "DELETE" });
          await apiFetch<CoursePinnedLink>(`/courses/${courseId}/pinned-links`, {
            method: "POST",
            body: JSON.stringify({ title: link.title.trim(), url: link.url.trim() }),
          });
        }
      }

      setCourseDialogOpen(false);
      await loadData(courseId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar curso.");
    }
  }

  async function addTask() {
    if (!courseId || !newTaskTitle.trim()) return;
    try {
      const created = await apiFetch<StudyTask>("/study-tasks", {
        method: "POST",
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          course_id: courseId,
          priority: newTaskPriority,
          due_date: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : null,
        }),
      });
      setTasks((prev) => [created, ...prev]);
      setNewTaskTitle("");
      setNewTaskPriority("Média");
      setNewTaskDueDate("");
      setNewTaskDialogOpen(false);
      await loadData(courseId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar tarefa.");
    }
  }

  async function toggleTask(task: StudyTask) {
    try {
      const nextStatus = task.status === "concluido" ? "backlog" : "concluido";
      await apiFetch<StudyTask>(`/study-tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: nextStatus,
        }),
      });
      if (nextStatus === "concluido") {
        celebrateTaskCompletion("study");
      }
      if (courseId) {
        await loadData(courseId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar tarefa.");
    }
  }

  function openTaskEditor(task: StudyTask) {
    setEditingTask(task);
    setTaskDialogOpen(true);
  }

  const sortedLinks = useMemo(() => course?.pinned_links ?? [], [course]);
  const scheduleRows = useMemo(() => {
    const schedule = course?.schedule ?? [];
    const grouped = schedule.reduce<Record<string, string[]>>((acc, item) => {
      if (!item.time) return acc;
      if (!acc[item.time]) acc[item.time] = [];
      acc[item.time].push(item.day);
      return acc;
    }, {});

    return Object.entries(grouped).map(([time, days]) => `📅 ${days.join(", ")} às ${time}`);
  }, [course]);
  const sortedTasks = useMemo(() => {
    const priorityScore: Record<StudyTask["priority"], number> = {
      Alta: 0,
      "Média": 1,
      Baixa: 2,
    };

    return [...tasks].sort((left, right) => {
      const leftDate = left.due_date ? new Date(left.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      const rightDate = right.due_date ? new Date(right.due_date).getTime() : Number.MAX_SAFE_INTEGER;

      if (leftDate !== rightDate) {
        return leftDate - rightDate;
      }
      return priorityScore[left.priority] - priorityScore[right.priority];
    });
  }, [tasks]);

  return (
    <AppShell>
      <header className="mb-6">
        <Link href="/estudos" className="text-sm text-indigo-300 hover:underline">
          Voltar para Galeria de Cursos
        </Link>
        <div className="mt-2 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-100 md:text-3xl">{course?.title ?? "Curso"}</h1>
          <Button variant="outline" onClick={() => setCourseDialogOpen(true)}>
            <Pencil size={15} />
            Editar Curso
          </Button>
        </div>
        <p className="mt-2 text-sm text-slate-400">{course?.description ?? "Sem descrição."}</p>
      </header>

      {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Cronograma</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {scheduleRows.length > 0 ? (
            scheduleRows.map((row) => (
              <span
                key={row}
                className="inline-flex rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200"
              >
                {row}
              </span>
            ))
          ) : (
            <p className="text-sm text-slate-500">Sem cronograma definido.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Anotações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-invert max-w-none text-sm">
              <ReactMarkdown>{course?.notes || "_Sem anotações no momento._"}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Links Fixados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-2">
              {sortedLinks.map((link) => (
                <div key={link.id} className="rounded-md border border-slate-800 p-2">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-full border border-indigo-700/70 bg-indigo-500/20 px-2 py-1 text-xs text-indigo-300 hover:underline"
                  >
                    {link.title || link.url}
                  </a>
                </div>
              ))}
              {sortedLinks.length === 0 ? <p className="text-sm text-slate-500">Sem links fixados.</p> : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Tarefas do Curso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {sortedTasks.map((task) => (
              <AnimatedCheckItem
                key={task.id}
                checked={task.status === "concluido"}
                onToggle={() => toggleTask(task)}
                title={task.title}
                meta={
                  task.due_date
                    ? new Date(task.due_date).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Sem prazo"
                }
                className={task.priority === "Alta" ? "ring-1 ring-violet-500/40 shadow-[0_0_18px_rgba(139,92,246,0.35)]" : ""}
                actions={
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        task.priority === "Alta"
                          ? "high"
                          : task.priority === "Média"
                            ? "medium"
                            : "low"
                      }
                    >
                      {task.priority}
                    </Badge>
                    <Button variant="outline" onClick={() => openTaskEditor(task)}>
                      <Pencil size={14} />
                      Editar
                    </Button>
                  </div>
                }
              />
            ))}
            {tasks.length === 0 ? <p className="text-sm text-slate-500">Sem tarefas vinculadas.</p> : null}
          </div>
        </CardContent>
      </Card>

      <Button className="fixed bottom-8 right-8 z-40 rounded-full px-5 py-3" onClick={() => setNewTaskDialogOpen(true)}>
        + Adicionar Tarefa
      </Button>

      <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Curso</DialogTitle>
            <DialogDescription>Ajuste titulo, notas e links fixados.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="Titulo do curso"
              value={editCourseTitle}
              onChange={(event) => setEditCourseTitle(event.target.value)}
            />
            <textarea
              className="h-24 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="Descrição"
              value={editCourseDescription}
              onChange={(event) => setEditCourseDescription(event.target.value)}
            />
            <textarea
              className="h-36 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="Notas (Markdown)"
              value={editCourseNotes}
              onChange={(event) => setEditCourseNotes(event.target.value)}
            />

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-300">Cronograma</p>
              {editCourseSchedule.map((entry, index) => (
                <div key={`${entry.day}-${entry.time}-${index}`} className="grid gap-2 md:grid-cols-12">
                  <select
                    className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 md:col-span-5"
                    value={entry.day}
                    onChange={(event) =>
                      setEditCourseSchedule((prev) =>
                        prev.map((row, i) => (i === index ? { ...row, day: event.target.value } : row)),
                      )
                    }
                  >
                    <option value="">Dia da semana</option>
                    <option value="Segunda">Segunda</option>
                    <option value="Terca">Terça</option>
                    <option value="Quarta">Quarta</option>
                    <option value="Quinta">Quinta</option>
                    <option value="Sexta">Sexta</option>
                    <option value="Sabado">Sábado</option>
                    <option value="Domingo">Domingo</option>
                  </select>
                  <input
                    type="time"
                    className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 md:col-span-5"
                    value={entry.time}
                    onChange={(event) =>
                      setEditCourseSchedule((prev) =>
                        prev.map((row, i) => (i === index ? { ...row, time: event.target.value } : row)),
                      )
                    }
                  />
                  <Button
                    variant="ghost"
                    className="md:col-span-2"
                    onClick={() => setEditCourseSchedule((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() =>
                  setEditCourseSchedule((prev) => [...prev, { day: "", time: "" }])
                }
              >
                + Adicionar Horario
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-300">Links</p>
              {editCourseLinks.map((link, index) => (
                <div key={`${link.id ?? "new"}-${index}`} className="grid gap-2 md:grid-cols-12">
                  <input
                    className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 md:col-span-4"
                    placeholder="Titulo"
                    value={link.title}
                    onChange={(event) =>
                      setEditCourseLinks((prev) =>
                        prev.map((entry, i) => (i === index ? { ...entry, title: event.target.value } : entry)),
                      )
                    }
                  />
                  <input
                    className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 md:col-span-7"
                    placeholder="https://..."
                    value={link.url}
                    onChange={(event) =>
                      setEditCourseLinks((prev) =>
                        prev.map((entry, i) => (i === index ? { ...entry, url: event.target.value } : entry)),
                      )
                    }
                  />
                  <Button
                    variant="ghost"
                    className="md:col-span-1"
                    onClick={() => setEditCourseLinks((prev) => prev.filter((_, i) => i !== index))}
                  >
                    X
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() =>
                  setEditCourseLinks((prev) => [...prev, { title: "", url: "" }])
                }
              >
                + Link
              </Button>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCourseDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={saveCourse}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={newTaskDialogOpen} onOpenChange={setNewTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Tarefa</DialogTitle>
            <DialogDescription>Crie uma nova tarefa para este curso.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="Titulo"
              value={newTaskTitle}
              onChange={(event) => setNewTaskTitle(event.target.value)}
            />
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              value={newTaskPriority}
              onChange={(event) => setNewTaskPriority(event.target.value as StudyTask["priority"])}
            >
              <option value="Alta">Alta</option>
              <option value="Média">Média</option>
              <option value="Baixa">Baixa</option>
            </select>
            <DatePicker value={newTaskDueDate} onChange={setNewTaskDueDate} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setNewTaskDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={addTask}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TaskEditModal
        open={taskDialogOpen}
        onOpenChange={(open) => {
          setTaskDialogOpen(open);
          if (!open) setEditingTask(null);
        }}
        editableTask={
          editingTask
            ? {
                task_type: "study",
                task: {
                  id: editingTask.id,
                  title: editingTask.title,
                  description: editingTask.description,
                  priority: editingTask.priority,
                  due_date: editingTask.due_date,
                  course_id: editingTask.course_id,
                },
              }
            : null
        }
        onSaved={() => {
          if (courseId) {
            loadData(courseId);
          }
        }}
      />
    </AppShell>
  );
}
