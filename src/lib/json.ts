export function safeParseJson<T>(value: string, fallback?: T): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback ?? null;
  }
}
