import { isHtml } from '@/lib/http';

const FALLBACK_MS = 3000;

// Hydration JS starts loading only once the first contentful paint is on
// screen, so it never competes with the hero paint for bandwidth or CPU.
// Hidden tabs and browsers without paint timing load it straight away; the
// timeout covers a paint that never gets reported. Preloads after the entry
// script stay in place, since the loader is already written by then.
export function deferredEntryLoader(
  entry: string,
  preloads: readonly string[],
): string {
  const urls = JSON.stringify({ entry, preloads }).replaceAll('<', '\\u003c');
  return `{const u=${urls};let done=false;const go=()=>{if(done)return;done=true;for(const href of u.preloads){const l=document.createElement('link');l.rel='modulepreload';l.href=href;document.head.appendChild(l)}import(u.entry)};if(document.hidden||!self.PerformanceObserver?.supportedEntryTypes?.includes('paint')){go()}else{new PerformanceObserver((list,o)=>{if(list.getEntriesByName('first-contentful-paint').length){o.disconnect();setTimeout(go)}}).observe({type:'paint',buffered:true});setTimeout(go,${FALLBACK_MS})}}`;
}

export function withDeferredEntry(response: Response): Response {
  if (!isHtml(response)) return response;
  const preloads: string[] = [];
  let entrySeen = false;
  return new HTMLRewriter()
    .on('link[rel="modulepreload"]', {
      element(el) {
        if (entrySeen) return;
        const href = el.getAttribute('href');
        if (href) preloads.push(href);
        el.remove();
      },
    })
    .on('script[type="module"][src]', {
      element(el) {
        const src = el.getAttribute('src');
        if (!src) return;
        entrySeen = true;
        el.replace(`<script>${deferredEntryLoader(src, preloads)}</script>`, {
          html: true,
        });
      },
    })
    .transform(response);
}
