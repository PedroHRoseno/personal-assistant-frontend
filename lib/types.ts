export type TaskStatus = "backlog" | "em_fazendo" | "concluido";
export type TaskCategory = "trabalho" | "estudos" | "casa";

export type WorkContext = "programacao" | "almotos" | "gestao_admin";
export type WorkLabel = "dev" | "conteudo";

export type WorkTask = {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: boolean;
  due_date: string | null;
  context: WorkContext;
  label: WorkLabel;
  context_id: number | null;
  context_name: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkHubLink = {
  id: number;
  hub_id: number;
  title: string;
  url: string;
  created_at: string;
};

export type WorkHub = {
  id: number;
  name: string;
  description: string | null;
  notes: string | null;
  links: WorkHubLink[];
  created_at: string;
  updated_at: string;
};

export type StudyTask = {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: "Alta" | "Média" | "Baixa";
  due_date: string | null;
  course_id: number | null;
  course_title: string | null;
  created_at: string;
  updated_at: string;
};

export type CoursePinnedLink = {
  id: number;
  course_id: number;
  title: string | null;
  url: string;
  created_at: string;
};

export type CourseScheduleItem = {
  day: string;
  time: string;
};

export type Course = {
  id: number;
  title: string;
  description: string | null;
  schedule: CourseScheduleItem[];
  notes: string | null;
  pinned_links: CoursePinnedLink[];
  created_at: string;
  updated_at: string;
};

export type HomeTask = {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: boolean;
  due_date: string | null;
  zone: string | null;
  task_type: "diaria" | "ocasional" | "especifica";
  recurrence_interval: number | null;
  is_completed_today: boolean;
  last_completed: string | null;
  created_at: string;
  updated_at: string;
};

export type HomeChecklistWidgetItem = {
  id: number;
  title: string;
  task_type: "diaria" | "ocasional" | "especifica";
  due_date: string | null;
  is_completed_today: boolean;
};

export type TodayTask = {
  id: number;
  task_type: "work" | "study" | "home";
  category: TaskCategory;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: boolean;
  due_date: string | null;
  context: WorkContext | null;
  context_id: number | null;
  context_name: string | null;
  label: WorkLabel | null;
  course_title: string | null;
  zone: string | null;
  created_at: string;
  updated_at: string;
};

export type PomodoroSession = {
  id: number;
  focus_minutes: number;
  break_minutes: number;
  session_day: string;
  completed_at: string;
};

export type PomodoroDailySummary = {
  day: string;
  count: number;
  total_focus_minutes: number;
  sessions: PomodoroSession[];
};
