export const POMODORO_FOCUS_MINUTES_KEY = "pomodoro-focus-minutes";
export const POMODORO_BREAK_MINUTES_KEY = "pomodoro-break-minutes";
export const WIDGET_POMODORO_STATE_KEY = "widget-pomodoro-state";

export type WidgetPomodoroPhase = "focus" | "break";
export type WidgetPomodoroStatus = "idle" | "running" | "paused";

export type WidgetPomodoroState = {
  phase: WidgetPomodoroPhase;
  status: WidgetPomodoroStatus;
  endAt: number | null;
  pausedRemaining: number | null;
  focusMinutes: number;
  breakMinutes: number;
};

export function clampPomodoroMinutes(value: number) {
  return Math.min(120, Math.max(1, value));
}

export function readStoredPomodoroMinutes(key: string, fallback: number) {
  if (typeof window === "undefined") return fallback;
  const stored = Number(localStorage.getItem(key));
  return Number.isFinite(stored) && stored > 0 ? clampPomodoroMinutes(stored) : fallback;
}

export function readWidgetPomodoroState(): WidgetPomodoroState | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(WIDGET_POMODORO_STATE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WidgetPomodoroState;
  } catch {
    return null;
  }
}

export function writeWidgetPomodoroState(state: WidgetPomodoroState) {
  localStorage.setItem(WIDGET_POMODORO_STATE_KEY, JSON.stringify(state));
}

export function clearWidgetPomodoroState() {
  localStorage.removeItem(WIDGET_POMODORO_STATE_KEY);
}

export function formatPomodoroClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function getRemainingSeconds(endAt: number) {
  return Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
}
