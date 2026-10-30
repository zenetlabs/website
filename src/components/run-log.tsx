import { CARD } from '@/components/ui';
import type { HomeContent } from '@/content/types';

export function RunLog({ copy }: { copy: HomeContent['runlog'] }) {
  const { lines } = copy;

  return (
    <div>
      <p className="sr-only">{copy.description}</p>
      <div
        aria-hidden="true"
        className={`${CARD} font-mono text-[13px] leading-relaxed`}
      >
        <div className="flex items-center gap-2.5 border-b border-hairline px-5 py-3.5 text-muted-fg">
          <span className="text-agent">●</span>
          {copy.title}
        </div>
        <ul className="grid gap-3 px-5 py-5">
          {lines.map((line, index) => (
            <li key={line} className="runlog-line flex gap-3">
              <span className="w-3 shrink-0 text-center text-agent">
                {index === lines.length - 1 ? '▸' : '✓'}
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
