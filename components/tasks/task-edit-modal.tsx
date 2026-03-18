"use client";

import { useEffect, useMemo, useState } from "react";

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
import type { HomeTask, StudyTask, WorkTask } from "@/lib/types";

type EditableTask =
  | {
      task_type: "work";
      task: Pick<WorkTask, "id" | "title" | "description" | "priority" | "due_date">;
    }
  | {
      task_type: "study";
      task: Pick<StudyTask, "id" | "title" | "description" | "priority" | "due_date">;
    }
  | {
      task_type: "home";
      task: Pick<HomeTask, "id" | "title" | "description" | "priority" | "due_date">;
    };

type TaskEditModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editableTask: EditableTask | null;
  onSaved?: () => void;
};

export function TaskEditModal({ open, onOpenChange, editableTask, onSaved }: TaskEditModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priorityBool, setPriorityBool] = useState<"Alta" | "Baixa">("Baixa");
  const [priorityStudy, setPriorityStudy] = useState<StudyTask["priority"]>("Média");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mode = editableTask?.task_type;

  useEffect(() => {
    if (!editableTask || !open) return;
    setTitle(editableTask.task.title ?? "");
    setDescription(editableTask.task.description ?? "");
    setDueDate(editableTask.task.due_date ? editableTask.task.due_date.slice(0, 16) : "");

    if (editableTask.task_type === "study") {
      setPriorityStudy(editableTask.task.priority);
    } else {
      setPriorityBool(editableTask.task.priority ? "Alta" : "Baixa");
    }
    setError(null);
  }, [editableTask, open]);

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
          }),
        });
      } else if (editableTask.task_type === "study") {
        await apiFetch(`/study-tasks/${editableTask.task.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            ...payload,
            priority: priorityStudy,
          }),
        });
      } else {
        await apiFetch(`/home-tasks/${editableTask.task.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            ...payload,
            priority: priorityBool === "Alta",
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
          <DialogDescription>Atualize título, descrição, prioridade e prazo.</DialogDescription>
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
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              value={priorityStudy}
              onChange={(event) => setPriorityStudy(event.target.value as StudyTask["priority"])}
            >
              <option value="Alta">Alta</option>
              <option value="Média">Média</option>
              <option value="Baixa">Baixa</option>
            </select>
          ) : (
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              value={priorityBool}
              onChange={(event) => setPriorityBool(event.target.value as "Alta" | "Baixa")}
            >
              <option value="Alta">Alta</option>
              <option value="Baixa">Baixa</option>
            </select>
          )}

          <DatePicker value={dueDate} onChange={setDueDate} />

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={saveTask} disabled={!canSave}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
