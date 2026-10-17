export function withLowScriptPriority(response: Response): Response {
  const type = response.headers.get('content-type') ?? '';
  if (!type.includes('text/html')) return response;
  return new HTMLRewriter()
    .on('link[rel="modulepreload"], script[type="module"][src]', {
      element(el) {
        el.setAttribute('fetchpriority', 'low');
      },
    })
    .transform(response);
}
