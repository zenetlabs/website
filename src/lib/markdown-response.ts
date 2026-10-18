import {
  type CapturedPage,
  decodeEntities,
  pageToMarkdown,
  tidy,
} from '@/lib/markdown';

export function withHtmlAccept(request: Request): Request {
  const headers = new Headers(request.headers);
  headers.set('Accept', 'text/html');
  return new Request(request, { headers, method: 'GET' });
}

async function capture(html: Response, url: string): Promise<CapturedPage> {
  const page: CapturedPage = {
    title: '',
    description: '',
    canonical: '',
    url,
    jsonLd: [],
    tokens: [],
  };
  let text = '';

  const rewritten = new HTMLRewriter()
    .on('head > title', {
      text(chunk) {
        page.title += chunk.text;
      },
    })
    .on('head > meta[name="description"]', {
      element(el) {
        page.description = tidy(el.getAttribute('content') ?? '');
      },
    })
    .on('head > link[rel="canonical"]', {
      element(el) {
        page.canonical = tidy(el.getAttribute('href') ?? '');
      },
    })
    .on('script[type="application/ld+json"]', {
      element() {
        page.jsonLd.push('');
      },
      text(chunk) {
        const last = page.jsonLd.length - 1;
        page.jsonLd[last] = (page.jsonLd[last] ?? '') + chunk.text;
      },
    })
    .on('main, main *', {
      element(el) {
        try {
          el.onEndTag(() => {
            page.tokens.push({ kind: 'close' });
          });
        } catch {
          return;
        }
        page.tokens.push({
          kind: 'open',
          tag: el.tagName.toLowerCase(),
          href: el.getAttribute('href'),
          hidden:
            el.getAttribute('aria-hidden') === 'true' ||
            el.hasAttribute('hidden'),
        });
      },
      text(chunk) {
        text += chunk.text;
        if (!chunk.lastInTextNode) return;
        page.tokens.push({ kind: 'text', text: decodeEntities(text) });
        text = '';
      },
    })
    .transform(html);
  await rewritten.body?.pipeTo(new WritableStream());

  page.title = tidy(page.title);
  return page;
}

export async function toMarkdownResponse(
  html: Response,
  url: string,
): Promise<Response> {
  const page = await capture(html, url);
  const headers = new Headers(html.headers);
  headers.set('Content-Type', 'text/markdown; charset=utf-8');
  for (const name of ['content-length', 'etag', 'last-modified']) {
    headers.delete(name);
  }
  if (page.canonical) {
    headers.set('Link', `<${page.canonical}>; rel="canonical"`);
  }
  return new Response(pageToMarkdown(page), { status: html.status, headers });
}
