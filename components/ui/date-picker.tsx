"use client";

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
};

export function DatePicker({ value, onChange }: DatePickerProps) {
  return (
    <input
      type="datetime-local"
      className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
