import { useMessages } from '@/lib/i18n';

export function RunLog() {
  const { runlog } = useMessages();
  const lines = Object.values(runlog.lines);

  return (
    <div>
      <p className="sr-only">{runlog.description}</p>
      <div
        aria-hidden="true"
        className="rounded-card border border-hairline bg-surface font-mono text-[13px] leading-relaxed"
      >
        <div className="flex items-center gap-2.5 border-b border-hairline px-5 py-3.5 text-muted-fg">
          <span className="text-agent">●</span>
          {runlog.title}
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
