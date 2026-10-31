import { isHtml } from '@/lib/http';

const FALLBACK_MS = 3000;

function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;');
}

function preloadTag(href: string): string {
  return `<link rel="modulepreload" href="${escapeAttribute(href)}" fetchpriority="low">`;
}

// Loads hydration JS after first contentful paint so it never competes with it.
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
        if (entrySeen) {
          el.setAttribute('fetchpriority', 'low');
          return;
        }
        const href = el.getAttribute('href');
        if (href) preloads.push(href);
        el.remove();
      },
    })
    .on('script[type="module"][src]', {
      element(el) {
        const src = el.getAttribute('src');
        if (entrySeen || !src) return;
        entrySeen = true;
        el.replace(
          `<script>${deferredEntryLoader(src, [...preloads])}</script>`,
          { html: true },
        );
      },
    })
    .onDocument({
      end(end) {
        if (entrySeen || preloads.length === 0) return;
        end.append(preloads.map(preloadTag).join(''), { html: true });
      },
    })
    .transform(response);
}
