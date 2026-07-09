import { apiFetch } from "@/lib/api";
import type { TodayTask } from "@/lib/types";

export function getTaskPatchEndpoint(task: Pick<TodayTask, "id" | "task_type">) {
  if (task.task_type === "work") return `/work-tasks/${task.id}`;
  if (task.task_type === "study") return `/study-tasks/${task.id}`;
  return `/home-tasks/${task.id}`;
}

export async function completeTodayTask(task: Pick<TodayTask, "id" | "task_type">) {
  const endpoint = getTaskPatchEndpoint(task);
  const body = task.task_type === "home" ? { status: "concluido", is_completed_today: true } : { status: "concluido" };

  await apiFetch(endpoint, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function fetchPendingTodayTasks() {
  const tasks = await apiFetch<TodayTask[]>("/tasks/today");
  return tasks.filter((task) => task.status !== "concluido");
}

export const taskTypeLabel: Record<TodayTask["task_type"], string> = {
  work: "Trabalho",
  study: "Estudos",
  home: "Casa",
};
