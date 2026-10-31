function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function isInternalPath(pathname: string): boolean {
  const path = pathname.split('/').map(decodeSegment).join('/').toLowerCase();
  return path === '/internal' || path.startsWith('/internal/');
}
