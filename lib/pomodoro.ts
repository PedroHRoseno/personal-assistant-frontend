import { apiFetch } from "@/lib/api";
import type { PomodoroDailySummary, PomodoroSession } from "@/lib/types";

export function getLocalDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function fetchPomodoroDailySummary(day = getLocalDayKey()) {
  return apiFetch<PomodoroDailySummary>(`/pomodoro/sessions/today?day=${day}`);
}

export async function recordPomodoroSession(input: {
  focus_minutes: number;
  break_minutes: number;
  day?: string;
}) {
  return apiFetch<PomodoroSession>("/pomodoro/sessions", {
    method: "POST",
    body: JSON.stringify({
      focus_minutes: input.focus_minutes,
      break_minutes: input.break_minutes,
      day: input.day ?? getLocalDayKey(),
    }),
  });
}
