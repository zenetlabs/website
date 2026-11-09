import { useRef } from 'react';

// The one orchestrated motion on the site: from the home desk, the panel grows
// out of the desk's own box (a transform-only FLIP), or rises as a sheet on a
// phone. Interruptible: closing mid-flight reverses from where it is.
const GROW_EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';
const SHEET_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
const GROW_MS = 260;
const SHEET_MS = 300;
const CLOSE_MS = 200;

type Motion = { frames: Keyframe[]; easing: string; duration: number };

function prefersReducedMotion(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function onScreen(box: DOMRect): boolean {
  return box.bottom > 0 && box.top < innerHeight && box.width > 0;
}

function motionFrom(
  dialog: HTMLDialogElement,
  from: Element | null,
): Motion | null {
  if (from === null || !from.isConnected || prefersReducedMotion()) {
    return null;
  }
  const origin = from.getBoundingClientRect();
  if (!onScreen(origin)) return null;
  if (!matchMedia('(min-width: 768px)').matches) {
    return {
      frames: [{ transform: 'translateY(100%)' }, { transform: 'none' }],
      easing: SHEET_EASE,
      duration: SHEET_MS,
    };
  }
  const box = dialog.getBoundingClientRect();
  if (box.width === 0 || box.height === 0) return null;
  const x = origin.left - box.left;
  const y = origin.top - box.top;
  const scaleX = origin.width / box.width;
  const scaleY = origin.height / box.height;
  return {
    frames: [
      {
        transformOrigin: '0 0',
        transform: `translate(${x}px, ${y}px) scale(${scaleX}, ${scaleY})`,
      },
      { transformOrigin: '0 0', transform: 'none' },
    ],
    easing: GROW_EASE,
    duration: GROW_MS,
  };
}

// The content stays hidden while the box is scaled, then settles in place.
const CONTENT_FRAMES: Keyframe[] = [
  { opacity: 0 },
  { opacity: 0, offset: 0.55 },
  { opacity: 1 },
];

// The panel's open and close motion: `grow` once the dialog is shown,
// `dismiss` to close (reversing a motion still in flight). Keyboard opens and
// reduced motion swap at once.
export function usePanelMotion(from: Element | null) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const motion = useRef<Motion | null>(null);
  const running = useRef<Animation[]>([]);
  const closing = useRef(false);

  function play(dialog: HTMLDialogElement, reverse: boolean): Animation[] {
    const current = motion.current;
    if (current === null) return [];
    const options: KeyframeAnimationOptions = {
      duration: reverse ? CLOSE_MS : current.duration,
      easing: current.easing,
      direction: reverse ? 'reverse' : 'normal',
    };
    const played = [
      dialog.animate(current.frames, options),
      dialog.animate([{ opacity: 0 }, { opacity: 1 }], {
        ...options,
        pseudoElement: '::backdrop',
      }),
    ];
    const inner = content.current;
    if (inner) played.push(inner.animate(CONTENT_FRAMES, options));
    return played;
  }

  function grow(dialog: HTMLDialogElement) {
    motion.current = motionFrom(dialog, from);
    running.current = play(dialog, false);
  }

  // A close while the panel is still growing turns the same motion around;
  // after that it shrinks back into the desk where it is now, or closes at
  // once when the desk has scrolled away.
  function dismiss() {
    const dialog = dialogRef.current;
    if (!dialog || closing.current) return;
    const inFlight = running.current.filter(
      (animation) => animation.playState === 'running',
    );
    if (inFlight.length === 0 && motion.current !== null) {
      motion.current = motionFrom(dialog, from);
    }
    if (motion.current === null) {
      dialog.close();
      return;
    }
    closing.current = true;
    const back = inFlight.length > 0 ? inFlight : play(dialog, true);
    for (const animation of inFlight) animation.reverse();
    void Promise.all(back.map((animation) => animation.finished))
      .catch(() => undefined)
      .then(() => dialog.close());
  }

  return {
    dialogRef,
    content,
    grow,
    dismiss,
    moves: () => motion.current !== null,
  };
}
