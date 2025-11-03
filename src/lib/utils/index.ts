import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getElapsedMilliseconds(start: string | Date | null | undefined): number | null {
  if (!start) {
    return null;
  }

  const startDate = start instanceof Date ? start : new Date(start);
  const timestamp = startDate.getTime();

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return Date.now() - timestamp;
}

export function hasElapsed(start: string | Date | null | undefined, durationMs: number): boolean {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return false;
  }

  const elapsed = getElapsedMilliseconds(start);
  return elapsed !== null && elapsed >= durationMs;
}
