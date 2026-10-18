export function isHtml(response: Response): boolean {
  return response.headers.get('content-type')?.includes('text/html') ?? false;
}
