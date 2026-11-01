export function failureCodeOf(error: unknown): 'timeout' | 'network' {
  return error instanceof Error &&
    (error.name === 'TimeoutError' || error.name === 'AbortError')
    ? 'timeout'
    : 'network';
}
