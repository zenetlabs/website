import type { ApprovalCopy } from '@/content/types';

export function ApprovalCard({ copy }: { copy: ApprovalCopy }) {
  return (
    <div className="rounded-input bg-human-soft p-4">
      <p className="flex items-center gap-2 text-ui-m font-semibold">
        <span aria-hidden="true" className="icon icon-human text-human" />
        {copy.title}
      </p>
      <p className="mt-1.5 text-ui-s text-fg-soft">{copy.detail}</p>
      <div className="mt-4 flex gap-2 text-ui-s font-semibold">
        <span className="rounded-input border border-human bg-human-soft px-3 py-1.5 text-fg">
          {copy.approve}
        </span>
        <span className="rounded-input border border-fg px-3 py-1.5">
          {copy.hold}
        </span>
      </div>
    </div>
  );
}
