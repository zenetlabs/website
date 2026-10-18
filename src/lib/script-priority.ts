import { isHtml } from '@/lib/http';

export function withLowScriptPriority(response: Response): Response {
  if (!isHtml(response)) return response;
  return new HTMLRewriter()
    .on('link[rel="modulepreload"], script[type="module"][src]', {
      element(el) {
        el.setAttribute('fetchpriority', 'low');
      },
    })
    .transform(response);
}
