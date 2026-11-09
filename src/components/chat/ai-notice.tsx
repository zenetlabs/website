import { TEXT_LINK } from '@/components/ui';
import type { Locale } from '@/lib/i18n';
import { pagePath } from '@/lib/page-registry';

export function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

// The AI disclosure in one line, with the full text (retention included) a
// tap away; the chat and the voice panel share it. The full text stays the
// dialog's description, open or folded.
export function AiNotice({
  copy,
  locale,
  noticeId,
  open,
  onToggle,
  privacyInText = null,
}: {
  copy: {
    noticeShort: string;
    noticeToggle: string;
    notice: string;
    privacyLink: string;
  };
  locale: Locale;
  noticeId: string;
  open: boolean;
  onToggle: () => void;
  // The chat names the policy in full inside the text and shortly in the line.
  privacyInText?: string | null;
}) {
  const privacy = pagePath(locale, 'privacy');
  return (
    <div className="chat-notice" data-ai-notice={open ? 'open' : 'line'}>
      <p className="chat-notice-line">
        <span>{copy.noticeShort}</span>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={noticeId}
          onClick={onToggle}
          className="chat-notice-toggle"
        >
          {copy.noticeToggle}
          <span aria-hidden="true" className="chat-chevron" />
        </button>
        <a href={privacy} className={TEXT_LINK}>
          {privacyInText === null ? copy.privacyLink : privacyInText}
        </a>
      </p>
      <p id={noticeId} hidden={!open} className="mt-2 text-pretty">
        {copy.notice}
        {privacyInText === null ? null : (
          <>
            {' '}
            <a href={privacy} className={TEXT_LINK}>
              {copy.privacyLink}
            </a>
          </>
        )}
      </p>
    </div>
  );
}
