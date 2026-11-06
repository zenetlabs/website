import type { HomeContent } from '@/content/types';

export function ProofPanel({ copy }: { copy: HomeContent['proof'] }) {
  const { approval, lines } = copy;

  return (
    <div>
      <p className="sr-only">{copy.description}</p>
      <div aria-hidden="true" className="relative p-4 md:p-8">
        <div className="pointer-events-none absolute inset-0 rounded-input bg-tint" />
        <div className="dot-grid pointer-events-none absolute inset-0" />
        <div className="relative rounded-card border border-hairline bg-surface shadow-raised">
          <div className="max-md:hidden">
            <p className="flex items-center gap-2 border-b border-hairline px-5 py-3.5 text-ui-s font-semibold text-muted-fg">
              <span className="icon icon-agent text-agent" />
              {copy.title}
            </p>
            <ul className="grid gap-3 px-5 py-5 text-ui-m">
              {lines.map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="icon icon-check mt-0.5 text-agent" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Same markup as ApprovalCard; kept inline so home does not load a shared chunk. Parity is tested in approval-card.test.tsx. */}
          <div
            data-approval
            className="m-3 rounded-input bg-human-soft p-4 md:mx-5 md:mt-0 md:mb-5"
          >
            <p className="flex items-center gap-2 text-ui-m font-semibold">
              <span aria-hidden="true" className="icon icon-human text-human" />
              {approval.title}
            </p>
            <p className="mt-1.5 text-ui-s text-fg-soft">{approval.detail}</p>
            <div className="mt-4 flex gap-2 text-ui-s font-semibold">
              <span className="rounded-input border border-human bg-human-soft px-3 py-1.5 text-fg">
                {approval.approve}
              </span>
              <span className="rounded-input border border-fg px-3 py-1.5">
                {approval.hold}
              </span>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-ui-s text-muted-fg">{copy.caption}</p>
    </div>
  );
}
