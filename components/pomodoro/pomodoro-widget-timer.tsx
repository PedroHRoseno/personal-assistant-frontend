"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  clampPomodoroMinutes,
  clearWidgetPomodoroState,
  formatPomodoroClock,
  getRemainingSeconds,
  POMODORO_BREAK_MINUTES_KEY,
  POMODORO_FOCUS_MINUTES_KEY,
  readStoredPomodoroMinutes,
  readWidgetPomodoroState,
  type WidgetPomodoroPhase,
  type WidgetPomodoroState,
  type WidgetPomodoroStatus,
  writeWidgetPomodoroState,
} from "@/lib/widget-pomodoro";
import { fetchPomodoroDailySummary, getLocalDayKey, recordPomodoroSession } from "@/lib/pomodoro";
import { notifyViaServiceWorker } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const UI_TICK_MS = 1000;

function phaseDurationSeconds(phase: WidgetPomodoroPhase, focusMinutes: number, breakMinutes: number) {
  return (phase === "focus" ? focusMinutes : breakMinutes) * 60;
}

export function PomodoroWidgetTimer() {
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [phase, setPhase] = useState<WidgetPomodoroPhase>("focus");
  const [status, setStatus] = useState<WidgetPomodoroStatus>("idle");
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [sessionsToday, setSessionsToday] = useState(0);

  const endAtRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completingRef = useRef(false);

  const totalSeconds = phaseDurationSeconds(phase, focusMinutes, breakMinutes);
  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0;

  const persistState = useCallback(
    (overrides: Partial<WidgetPomodoroState> = {}) => {
      writeWidgetPomodoroState({
        phase,
        status,
        endAt: endAtRef.current,
        pausedRemaining: status === "paused" ? secondsLeft : null,
        focusMinutes,
        breakMinutes,
        ...overrides,
      });
    },
    [breakMinutes, focusMinutes, phase, secondsLeft, status],
  );

  const clearUiTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const refreshDailySummary = useCallback(async () => {
    const summary = await fetchPomodoroDailySummary(getLocalDayKey());
    setSessionsToday(summary.count);
    return summary;
  }, []);

  const handlePhaseComplete = useCallback(async () => {
    if (completingRef.current) return;
    completingRef.current = true;
    clearUiTick();
    endAtRef.current = null;

    try {
      if (phase === "focus") {
        await recordPomodoroSession({
          focus_minutes: focusMinutes,
          break_minutes: breakMinutes,
          day: getLocalDayKey(),
        });
        await refreshDailySummary();

        await notifyViaServiceWorker("Tempo de foco concluído!", {
          body: "Hora do descanso.",
          tag: "widget-pomodoro-focus-done",
        });

        const breakTotal = breakMinutes * 60;
        setPhase("break");
        setStatus("running");
        setSecondsLeft(breakTotal);
        endAtRef.current = Date.now() + breakTotal * 1000;
        writeWidgetPomodoroState({
          phase: "break",
          status: "running",
          endAt: endAtRef.current,
          pausedRemaining: null,
          focusMinutes,
          breakMinutes,
        });
        return;
      }

      await notifyViaServiceWorker("Descanso concluído!", {
        body: "Pronto para focar de novo.",
        tag: "widget-pomodoro-break-done",
      });

      setPhase("focus");
      setStatus("idle");
      setSecondsLeft(focusMinutes * 60);
      clearWidgetPomodoroState();
    } finally {
      completingRef.current = false;
    }
  }, [breakMinutes, clearUiTick, focusMinutes, phase, refreshDailySummary]);

  const syncFromEndAt = useCallback(() => {
    if (!endAtRef.current) return;

    const remaining = getRemainingSeconds(endAtRef.current);
    setSecondsLeft(remaining);

    if (remaining <= 0) {
      void handlePhaseComplete();
      return false;
    }

    return true;
  }, [handlePhaseComplete]);

  const startUiTick = useCallback(() => {
    clearUiTick();
    if (document.hidden || status !== "running" || !endAtRef.current) return;

    if (!syncFromEndAt()) return;

    tickRef.current = setInterval(() => {
      if (document.hidden) return;
      if (!syncFromEndAt()) {
        clearUiTick();
      }
    }, UI_TICK_MS);
  }, [clearUiTick, status, syncFromEndAt]);

  useEffect(() => {
    const storedFocus = readStoredPomodoroMinutes(POMODORO_FOCUS_MINUTES_KEY, 25);
    const storedBreak = readStoredPomodoroMinutes(POMODORO_BREAK_MINUTES_KEY, 5);
    const saved = readWidgetPomodoroState();

    setFocusMinutes(saved?.focusMinutes ?? storedFocus);
    setBreakMinutes(saved?.breakMinutes ?? storedBreak);

    if (saved) {
      setPhase(saved.phase);
      setStatus(saved.status);
      endAtRef.current = saved.endAt;

      if (saved.status === "running" && saved.endAt) {
        const remaining = getRemainingSeconds(saved.endAt);
        if (remaining <= 0) {
          setPhase(saved.phase);
          setSecondsLeft(0);
        } else {
          setSecondsLeft(remaining);
        }
      } else if (saved.status === "paused" && saved.pausedRemaining !== null) {
        setSecondsLeft(saved.pausedRemaining);
      } else {
        setSecondsLeft(phaseDurationSeconds(saved.phase, saved.focusMinutes, saved.breakMinutes));
      }
    } else {
      setSecondsLeft(storedFocus * 60);
    }

    void refreshDailySummary();
  }, [refreshDailySummary]);

  useEffect(() => {
    if (status === "running" && endAtRef.current && getRemainingSeconds(endAtRef.current) <= 0) {
      void handlePhaseComplete();
    }
  }, [handlePhaseComplete, status]);

  useEffect(() => {
    if (status !== "running") {
      clearUiTick();
      return;
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        clearUiTick();
        return;
      }

      if (!endAtRef.current) return;

      if (!syncFromEndAt()) return;
      startUiTick();
    };

    startUiTick();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearUiTick();
    };
  }, [clearUiTick, startUiTick, status, syncFromEndAt]);

  useEffect(() => {
    if (status === "idle") {
      setSecondsLeft(phaseDurationSeconds(phase, focusMinutes, breakMinutes));
    }
  }, [breakMinutes, focusMinutes, phase, status]);

  const handleStart = () => {
    const remaining =
      status === "paused" ? secondsLeft : phaseDurationSeconds(phase, focusMinutes, breakMinutes);

    setSecondsLeft(remaining);
    endAtRef.current = Date.now() + remaining * 1000;
    setStatus("running");
    persistState({ status: "running", endAt: endAtRef.current, pausedRemaining: null });
  };

  const handlePause = () => {
    if (!endAtRef.current) return;

    const remaining = getRemainingSeconds(endAtRef.current);
    setSecondsLeft(remaining);
    endAtRef.current = null;
    setStatus("paused");
    persistState({ status: "paused", endAt: null, pausedRemaining: remaining });
  };

  const handleReset = () => {
    clearUiTick();
    endAtRef.current = null;
    setPhase("focus");
    setStatus("idle");
    setSecondsLeft(focusMinutes * 60);
    clearWidgetPomodoroState();
  };

  const handleFocusMinutesChange = (value: number) => {
    const next = clampPomodoroMinutes(value);
    setFocusMinutes(next);
    localStorage.setItem(POMODORO_FOCUS_MINUTES_KEY, String(next));
    if (phase === "focus" && status === "idle") {
      setSecondsLeft(next * 60);
    }
    persistState({ focusMinutes: next });
  };

  const handleBreakMinutesChange = (value: number) => {
    const next = clampPomodoroMinutes(value);
    setBreakMinutes(next);
    localStorage.setItem(POMODORO_BREAK_MINUTES_KEY, String(next));
    if (phase === "break" && status === "idle") {
      setSecondsLeft(next * 60);
    }
    persistState({ breakMinutes: next });
  };

  const isRunning = status === "running";
  const inputsDisabled = isRunning || status === "paused";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Pomodoro</p>
          <p className={cn("text-xs font-medium", phase === "focus" ? "text-indigo-400" : "text-emerald-400")}>
            {phase === "focus" ? "Foco" : "Descanso"} · {sessionsToday} hoje
          </p>
        </div>
        <div className="relative flex h-20 w-20 items-center justify-center">
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="40" fill="none" stroke="rgb(30 41 59)" strokeWidth="6" />
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke={phase === "focus" ? "rgb(99 102 241)" : "rgb(52 211 153)"}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 40}
              strokeDashoffset={2 * Math.PI * 40 * (1 - progress)}
            />
          </svg>
          <p className="font-mono text-2xl font-semibold text-slate-50">{formatPomodoroClock(secondsLeft)}</p>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-2">
        <label className="text-[10px] text-slate-500">
          Foco
          <input
            type="number"
            min={1}
            max={120}
            value={focusMinutes}
            disabled={inputsDisabled}
            onChange={(event) => handleFocusMinutesChange(Number(event.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-800 bg-black px-2 py-1.5 text-sm text-slate-100 outline-none disabled:opacity-50"
          />
        </label>
        <label className="text-[10px] text-slate-500">
          Pausa
          <input
            type="number"
            min={1}
            max={120}
            value={breakMinutes}
            disabled={inputsDisabled}
            onChange={(event) => handleBreakMinutesChange(Number(event.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-800 bg-black px-2 py-1.5 text-sm text-slate-100 outline-none disabled:opacity-50"
          />
        </label>
        {isRunning ? (
          <button
            type="button"
            onClick={handlePause}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-slate-200"
            aria-label="Pausar"
          >
            <Pause size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStart}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white"
            aria-label={status === "paused" ? "Retomar" : "Iniciar"}
          >
            <Play size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-slate-300"
          aria-label="Resetar"
        >
          <RotateCcw size={15} />
        </button>
      </div>
    </div>
  );
}
