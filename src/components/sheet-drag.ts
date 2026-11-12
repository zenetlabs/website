import { type PointerEvent, useRef } from 'react';

// Drag to dismiss a phone sheet: direct manipulation, so the sheet follows the
// finger 1:1 even under reduced motion; only the release animates.
const CLOSE_SHARE = 0.25;
// px/ms over the last VELOCITY_MS of the drag.
const FLICK = 0.5;
const VELOCITY_MS = 100;
// Upward (or a held sheet) resists: a fifth of the travel, never past 24px.
const LIFT_LIMIT = 24;
const LIFT_RATE = 5;
const RETURN_MS = 200;
const CLOSE_MAX_MS = 240;
const CLOSE_MIN_MS = 120;
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const SHEET_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
// The sheet ease starts at 0.72 / 0.32 of its average speed, so the close
// picks the finger's speed up where it left off.
const SHEET_EASE_START = 2.25;
// Pressing these never starts a drag.
const CONTROLS = 'a, button, input, select, textarea, summary, label';

export type Release = { travel: number; velocity: number; height: number };

export function releaseOutcome({
  travel,
  velocity,
  height,
}: Release): 'close' | 'return' {
  if (velocity <= -FLICK) return 'return';
  if (velocity > FLICK) return 'close';
  return travel > height * CLOSE_SHARE ? 'close' : 'return';
}

// Progressive resistance: a fifth of the finger's travel at first, easing
// towards LIFT_LIMIT, so the edge slows the sheet instead of stopping it.
export function resist(travel: number): number {
  const amount = Math.abs(travel);
  const offset = (LIFT_LIMIT * amount) / (amount + LIFT_RATE * LIFT_LIMIT);
  return Math.sign(travel) * offset;
}

// Where the sheet sits for a finger `delta` px from where the drag (re)based
// at `base`: 1:1 downward, resisted upward, and only resisted while held.
export function dragOffset(base: number, delta: number, held: boolean): number {
  if (held) return base + resist(delta);
  const travel = base + delta;
  return travel > 0 ? travel : resist(travel);
}

export function closeDuration(remaining: number, velocity: number): number {
  if (velocity <= 0) return CLOSE_MAX_MS;
  const matched = (SHEET_EASE_START * remaining) / velocity;
  return Math.round(Math.min(CLOSE_MAX_MS, Math.max(CLOSE_MIN_MS, matched)));
}

type Sample = { t: number; y: number };

export function releaseVelocity(samples: readonly Sample[]): number {
  const last = samples.at(-1);
  if (!last) return 0;
  const first = samples.find((sample) => sample.t >= last.t - VELOCITY_MS);
  if (!first || last.t === first.t) return 0;
  return (last.y - first.y) / (last.t - first.t);
}

type Drag = {
  pointer: number;
  startY: number;
  base: number;
  // Where the finger caught the sheet: release distances count from here.
  caught: number;
  height: number;
  offset: number;
  held: boolean;
  samples: Sample[];
  fade: Animation | null;
};

const PHONE = '(width < 48rem)';

function reducedMotion(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isScripted(animation: Animation): boolean {
  return !('animationName' in animation || 'transitionProperty' in animation);
}

// A sheet still rising or closing is caught where it is: the running motion
// is committed and cancelled, and the drag starts from the sheet's position.
// Everything scripted inside the panel is its own WAAPI motion (the rise, the
// content fade, a release), so all of it goes.
function settle(dialog: HTMLDialogElement): number {
  for (const animation of dialog.getAnimations({ subtree: true })) {
    if (!isScripted(animation)) continue;
    const { effect } = animation;
    if (
      effect instanceof KeyframeEffect &&
      effect.target === dialog &&
      effect.pseudoElement === null
    ) {
      animation.commitStyles();
    }
    animation.cancel();
  }
  return new DOMMatrixReadOnly(getComputedStyle(dialog).transform).m42;
}

// The backdrop is scrubbed with a paused animation: a pseudo-element has no
// inline style to set.
function backdropFade(dialog: HTMLDialogElement): Animation {
  const fade = dialog.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: 1000,
    fill: 'both',
    pseudoElement: '::backdrop',
  });
  fade.pause();
  return fade;
}

function shown(offset: number, height: number): number {
  return Math.min(1, Math.max(0, offset / height));
}

// `held`: while true the sheet only rubber-bands (a live call ends when it
// closes); asked on every move, on release and when a close slide lands.
// `modal`: a backdrop fades with it.
// `close`: what the close button does once the sheet has left the screen.
export function useSheetDrag({
  held,
  modal,
  close,
}: {
  held: () => boolean;
  modal: boolean;
  close: () => void;
}) {
  const drag = useRef<Drag | null>(null);

  function slide(
    dialog: HTMLDialogElement,
    from: string,
    opacity: number,
    closing: boolean,
    velocity: number,
    remaining: number,
  ): Animation {
    const options: KeyframeAnimationOptions = closing
      ? {
          duration: closeDuration(remaining, velocity),
          easing: SHEET_EASE,
          fill: 'forwards',
        }
      : { duration: RETURN_MS, easing: EASE_OUT };
    const moved = dialog.animate(
      [
        { transform: from },
        { transform: closing ? 'translateY(100%)' : 'none' },
      ],
      options,
    );
    if (modal) {
      dialog.animate([{ opacity }, { opacity: closing ? 0 : 1 }], {
        ...options,
        pseudoElement: '::backdrop',
      });
    }
    return moved;
  }

  // A call that started while the sheet slid away keeps the sheet.
  function landed(dialog: HTMLDialogElement, out: Animation) {
    if (!held()) {
      close();
      return;
    }
    slide(dialog, 'translateY(100%)', 0, false, 0, 0);
    out.cancel();
  }

  // `release`: the finger let go. Anything else (a cancel, a lost capture, a
  // stale drag) only puts the sheet back.
  function finish(dialog: HTMLDialogElement, current: Drag, release: boolean) {
    drag.current = null;
    current.fade?.cancel();
    const velocity = releaseVelocity(current.samples);
    const travel = current.offset;
    const closing =
      release &&
      !held() &&
      releaseOutcome({
        travel: travel - current.caught,
        velocity,
        height: current.height,
      }) === 'close';
    if (reducedMotion()) {
      dialog.style.transform = closing ? 'translateY(100%)' : '';
      if (closing) close();
      return;
    }
    dialog.style.transform = '';
    if (!closing && Math.abs(travel) < 0.5) return;
    const out = slide(
      dialog,
      `translateY(${travel}px)`,
      1 - shown(travel, current.height),
      closing,
      velocity,
      current.height - travel,
    );
    // Caught again mid-flight, the slide is cancelled and nothing closes.
    if (closing)
      out.finished.then(
        () => landed(dialog, out),
        () => undefined,
      );
  }

  function begin(event: PointerEvent<HTMLDialogElement>) {
    const dialog = event.currentTarget;
    dialog.setPointerCapture(event.pointerId);
    const base = settle(dialog);
    dialog.style.transform = `translateY(${base}px)`;
    const height = dialog.getBoundingClientRect().height;
    const fade = modal ? backdropFade(dialog) : null;
    drag.current = {
      pointer: event.pointerId,
      startY: event.clientY,
      base,
      caught: base,
      height,
      offset: base,
      held: held(),
      samples: [{ t: event.timeStamp, y: event.clientY }],
      fade,
    };
    if (fade) fade.currentTime = 1000 * shown(base, height);
  }

  function onPointerDown(event: PointerEvent<HTMLDialogElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    const dialog = event.currentTarget;
    // A drag whose end never arrived must not lock the sheet.
    const stale = drag.current;
    if (stale) finish(dialog, stale, false);
    const target = event.target;
    if (
      !(target instanceof Element) ||
      target.closest('[data-sheet-handle]') === null ||
      target.closest(CONTROLS) !== null ||
      !matchMedia(PHONE).matches
    ) {
      return;
    }
    try {
      begin(event);
    } catch (error) {
      drag.current?.fade?.cancel();
      drag.current = null;
      dialog.style.transform = '';
      throw error;
    }
  }

  function onPointerMove(event: PointerEvent<HTMLDialogElement>) {
    const current = drag.current;
    if (current === null || event.pointerId !== current.pointer) return;
    // A call starting or ending mid-drag rebases it, so the sheet never jumps.
    if (current.held !== held()) {
      current.held = held();
      current.base = current.offset;
      current.startY = event.clientY;
    }
    current.samples.push({ t: event.timeStamp, y: event.clientY });
    current.offset = dragOffset(
      current.base,
      event.clientY - current.startY,
      current.held,
    );
    event.currentTarget.style.transform = `translateY(${current.offset}px)`;
    if (current.fade) {
      current.fade.currentTime = 1000 * shown(current.offset, current.height);
    }
  }

  function onPointerEnd(event: PointerEvent<HTMLDialogElement>) {
    const current = drag.current;
    if (current === null || event.pointerId !== current.pointer) return;
    const release = event.type === 'pointerup';
    if (release) current.samples.push({ t: event.timeStamp, y: event.clientY });
    finish(event.currentTarget, current, release);
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: onPointerEnd,
    onPointerCancel: onPointerEnd,
    onLostPointerCapture: onPointerEnd,
  };
}
