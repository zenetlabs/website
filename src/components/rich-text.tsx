import { TEXT_LINK } from '@/components/ui';
import type { Rich } from '@/content/types';

export function RichText({ parts }: { parts: Rich }) {
  return parts.map((part) =>
    typeof part === 'string' ? (
      part
    ) : (
      <a
        key={part.href}
        href={part.href}
        className={`font-semibold ${TEXT_LINK}`}
      >
        {part.text}
      </a>
    ),
  );
}
