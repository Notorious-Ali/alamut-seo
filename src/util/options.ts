export function isEnabled(
  options?: { enabled?: boolean },
  fallback: boolean = true,
): boolean {
  return options?.enabled ?? fallback
}
