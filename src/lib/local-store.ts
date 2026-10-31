const memory = new Map<string, string>();

export function parseJsonObject(raw: string): object | null {
  try {
    const value: unknown = JSON.parse(raw);
    return typeof value === 'object' && value !== null ? value : null;
  } catch {
    return null;
  }
}

export function getItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

export function setItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
    memory.delete(key);
  } catch {
    memory.set(key, value);
  }
}

export function removeItem(key: string): void {
  memory.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage is unavailable; the memory copy is already gone.
  }
}
