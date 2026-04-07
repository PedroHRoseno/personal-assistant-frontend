"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";
import type { Course, HomeTask, StudyTask, WorkContext, WorkHub, WorkLabel, WorkTask } from "@/lib/types";

type EditableTask =
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
    };

type TaskEditModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editableTask: EditableTask | null;
  onSaved?: () => void;
};

const WORK_CONTEXTS: WorkContext[] = ["programacao", "almotos", "gestao_admin"];
const WORK_LABELS: WorkLabel[] = ["dev", "conteudo"];

export function TaskEditModal({ open, onOpenChange, editableTask, onSaved }: TaskEditModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priorityBool, setPriorityBool] = useState<"Alta" | "Baixa">("Baixa");
  const [priorityStudy, setPriorityStudy] = useState<StudyTask["priority"]>("Média");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [workContext, setWorkContext] = useState<WorkContext>("programacao");
  const [workLabel, setWorkLabel] = useState<WorkLabel>("dev");
  const [contextId, setContextId] = useState<string>("");
  const [courseId, setCourseId] = useState<string>("");
  const [zone, setZone] = useState("");
  const [homeTaskType, setHomeTaskType] = useState<HomeTask["task_type"]>("diaria");
  const [recurrenceInterval, setRecurrenceInterval] = useState("");

  const [workHubs, setWorkHubs] = useState<WorkHub[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const mode = editableTask?.task_type;

  useEffect(() => {
    if (!editableTask || !open) return;
    setTitle(editableTask.task.title ?? "");
    setDescription(editableTask.task.description ?? "");
    setDueDate(editableTask.task.due_date ? editableTask.task.due_date.slice(0, 16) : "");

    if (editableTask.task_type === "study") {
      setPriorityStudy(editableTask.task.priority);
      setCourseId(editableTask.task.course_id != null ? String(editableTask.task.course_id) : "");
    } else {
      setPriorityBool(editableTask.task.priority ? "Alta" : "Baixa");
    }

    if (editableTask.task_type === "work") {
      setWorkContext(editableTask.task.context);
      setWorkLabel(editableTask.task.label);
      setContextId(editableTask.task.context_id != null ? String(editableTask.task.context_id) : "");
    }

    if (editableTask.task_type === "home") {
      setZone(editableTask.task.zone ?? "");
      setHomeTaskType(editableTask.task.task_type);
      setRecurrenceInterval(
        editableTask.task.recurrence_interval != null ? String(editableTask.task.recurrence_interval) : "",
      );
    }

    setError(null);
  }, [editableTask, open]);

  useEffect(() => {
    if (!open || !editableTask) return;
    const mode = editableTask.task_type;
    let cancelled = false;
    async function loadRefs() {
      try {
        if (mode === "work") {
          const hubs = await apiFetch<WorkHub[]>("/work-hubs");
          if (!cancelled) setWorkHubs(hubs);
        }
        if (mode === "study") {
          const list = await apiFetch<Course[]>("/courses");
          if (!cancelled) setCourses(list);
        }
      } catch {
        /* hubs/courses são opcionais para edição básica */
      }
    }
    void loadRefs();
    return () => {
      cancelled = true;
    };
  }, [open, editableTask]);

  const canSave = useMemo(() => Boolean(title.trim()) && !saving && Boolean(editableTask), [title, saving, editableTask]);

  async function saveTask() {
    if (!editableTask || !title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
      };

      if (editableTask.task_type === "work") {
        await apiFetch(`/work-tasks/${editableTask.task.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            ...payload,
            priority: priorityBool === "Alta",
            context: workContext,
            label: workLabel,
            context_id: contextId ? Number(contextId) : null,
          }),
        });
      } else if (editableTask.task_type === "study") {
        await apiFetch(`/study-tasks/${editableTask.task.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            ...payload,
            priority: priorityStudy,
            course_id: courseId ? Number(courseId) : null,
          }),
        });
      } else {
        await apiFetch(`/home-tasks/${editableTask.task.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            ...payload,
            priority: priorityBool === "Alta",
            zone: zone.trim() || null,
            task_type: homeTaskType,
            recurrence_interval:
              homeTaskType === "ocasional" && recurrenceInterval.trim() ? Number(recurrenceInterval) : null,
          }),
        });
      }

      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar alterações da tarefa.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Tarefa</DialogTitle>
          <DialogDescription>Atualize título, descrição, prioridade e campos do contexto.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}

          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            placeholder="Título"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />

          <textarea
            className="h-24 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            placeholder="Descrição"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />

          {mode === "study" ? (
            <select
              className="min-h-[44px] w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              value={priorityStudy}
              onChange={(event) => setPriorityStudy(event.target.value as StudyTask["priority"])}
            >
              <option value="Alta">Alta</option>
              <option value="Média">Média</option>
              <option value="Baixa">Baixa</option>
            </select>
          ) : (
            <select
              className="min-h-[44px] w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              value={priorityBool}
              onChange={(event) => setPriorityBool(event.target.value as "Alta" | "Baixa")}
            >
              <option value="Alta">Alta</option>
              <option value="Baixa">Baixa</option>
            </select>
          )}

          {mode === "work" ? (
            <div className="space-y-2 rounded-md border border-slate-800 p-2">
              <p className="text-xs font-medium text-slate-400">Trabalho — contexto</p>
              <select
                className="min-h-[44px] w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                value={contextId}
                onChange={(event) => setContextId(event.target.value)}
              >
                <option value="">Hub (opcional)</option>
                {workHubs.map((hub) => (
                  <option key={hub.id} value={hub.id}>
                    {hub.name}
                  </option>
                ))}
              </select>
              <select
                className="min-h-[44px] w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                value={workContext}
                onChange={(event) => setWorkContext(event.target.value as WorkContext)}
              >
                {WORK_CONTEXTS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                className="min-h-[44px] w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                value={workLabel}
                onChange={(event) => setWorkLabel(event.target.value as WorkLabel)}
              >
                {WORK_LABELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {mode === "study" ? (
            <div className="space-y-2 rounded-md border border-slate-800 p-2">
              <p className="text-xs font-medium text-slate-400">Estudos — curso</p>
              <select
                className="min-h-[44px] w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                value={courseId}
                onChange={(event) => setCourseId(event.target.value)}
              >
                <option value="">Nenhum curso</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {mode === "home" ? (
            <div className="space-y-2 rounded-md border border-slate-800 p-2">
              <p className="text-xs font-medium text-slate-400">Casa</p>
              <input
                className="min-h-[44px] w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                placeholder="Zona / cômodo"
                value={zone}
                onChange={(event) => setZone(event.target.value)}
              />
              <select
                className="min-h-[44px] w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                value={homeTaskType}
                onChange={(event) => setHomeTaskType(event.target.value as HomeTask["task_type"])}
              >
                <option value="diaria">Diária</option>
                <option value="ocasional">Ocasional</option>
                <option value="especifica">Única</option>
              </select>
              {homeTaskType === "ocasional" ? (
                <input
                  type="number"
                  min={1}
                  className="min-h-[44px] w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  placeholder="Intervalo em dias"
                  value={recurrenceInterval}
                  onChange={(event) => setRecurrenceInterval(event.target.value)}
                />
              ) : null}
            </div>
          ) : null}

          <DatePicker value={dueDate} onChange={setDueDate} />

          <div className="flex justify-end gap-2">
            <Button variant="ghost" className="min-h-[44px]" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <motion.div whileTap={{ scale: saving ? 1 : 0.97 }}>
              <Button className="min-h-[44px] min-w-[100px]" onClick={saveTask} disabled={!canSave}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </motion.div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
