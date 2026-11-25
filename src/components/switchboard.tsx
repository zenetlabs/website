import {
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useRef,
  useState,
} from 'react';
import { FlowTileMark } from '@/components/flow-tiles';
import type { StageCopy, StageJob, StageTile } from '@/content/types';

const TILES = [
  'shopify',
  'gmail',
  'woocommerce',
  'prestashop',
  'whatsapp',
  'sheets',
  'xero',
  'hubspot',
  'human',
] as const satisfies readonly StageTile[];

// Each job's lit paths: a tile joined to the agent core, or `from` straight
// to `to`. Angles, rests, hops and timings live in app.css (`.sb*`), held to
// the table in switchboard-table.ts by switchboard-css.test.ts.
const JOBS: ReadonlyArray<{
  id: StageJob;
  paths: ReadonlyArray<{ from: StageTile; to?: StageTile }>;
}> = [
  { id: 'orders', paths: [{ from: 'shopify', to: 'sheets' }] },
  {
    id: 'invoices',
    paths: [{ from: 'gmail' }, { from: 'human' }, { from: 'xero' }],
  },
  { id: 'customers', paths: [{ from: 'whatsapp' }, { from: 'human' }] },
];

// A packet and the ping where it lands
const HOPS = Array.from({ length: 10 }, (_, index) => index);

export type Intro = 'play' | 'done';

const MODIFIERS = new Set(['Shift', 'Control', 'Alt', 'Meta']);

// Once per page load: an in-app return to home mounts it already done.
let shown = false;

export function useSwitchboard() {
  const [intro, setIntro] = useState<Intro>(() => (shown ? 'done' : 'play'));
  const node = useRef<HTMLDivElement | null>(null);
  const swallow = useRef(false);

  // Commit time on the client only: the server renders every request playing
  function stageRef(element: HTMLDivElement | null) {
    node.current = element;
    if (element) shown = true;
  }

  // Any press, key or focus in the hero ends the scene, except on its own
  // button or a bare modifier key
  function end(target: EventTarget | null): boolean {
    if (target instanceof Element && target.closest('[data-sb-button]')) {
      return false;
    }
    setIntro('done');
    return true;
  }

  function stop(event: KeyboardEvent | FocusEvent) {
    if (!('key' in event && MODIFIERS.has(event.key))) end(event.target);
  }

  // A mouse or pen ends it on press, a finger on release, so a swipe that
  // scrolls (a pointercancel, no pointerup) never does. A tap on the bare
  // stage (over the hidden desk) swallows its click, which would land on the
  // desk once it shows.
  function press(event: PointerEvent) {
    const touch = event.pointerType === 'touch';
    if (event.type === 'pointerdown') {
      swallow.current = false;
      if (!touch) end(event.target);
    } else if (touch && end(event.target)) {
      swallow.current = event.target === node.current;
    }
  }

  function click(event: MouseEvent) {
    if (!swallow.current) return;
    swallow.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  // Skip while its label's animation runs; otherwise the final frame is
  // styled for two frames, as CSS animations restart only once gone.
  function toggle() {
    const running = node.current
      ?.querySelector('.sb-skip')
      ?.getAnimations()
      .some((animation) => animation.playState === 'running');
    setIntro('done');
    if (running) return;
    requestAnimationFrame(() => requestAnimationFrame(() => setIntro('play')));
  }

  return { intro, stop, press, click, stageRef, toggle };
}

export function Switchboard({
  copy,
  intro,
  stageRef,
  toggle,
  children,
}: {
  copy: StageCopy;
  intro: Intro;
  stageRef: (element: HTMLDivElement | null) => void;
  toggle: () => void;
  children: ReactNode;
}) {
  const playing = intro === 'play';
  return (
    <div
      ref={stageRef}
      data-scene
      data-switchboard
      data-intro={intro}
      className="sb"
    >
      <div aria-hidden="true" className="sb-orbit">
        {TILES.map((tile) => (
          <i key={tile} data-tile={tile} className="sb-wire" />
        ))}
        {playing
          ? JOBS.map(({ id, paths }) => (
              <div key={id} data-job={id} className="sb-job">
                {paths.map(({ from, to }) => (
                  <i
                    key={from}
                    data-tile={from}
                    data-to={to}
                    className="sb-lit"
                  />
                ))}
                <p className="sb-cap">
                  <strong>{copy.jobs[id].name}:</strong> {copy.jobs[id].text}
                </p>
              </div>
            ))
          : null}
        {playing ? (
          <span className="sb-hops">
            {HOPS.map((index) => (
              <span key={index} className="sb-hop">
                <i className="sb-pk" />
                <i className="sb-ping" />
              </span>
            ))}
          </span>
        ) : null}
        {TILES.map((tile) => (
          <span key={tile} data-tile={tile} className="sb-node">
            <FlowTileMark tile={tile} />
            <span className="sb-label">{copy.tools[tile]}</span>
          </span>
        ))}
        <span className="sb-core">
          <span className="sb-agent">
            <span className="sb-plate" />
          </span>
          <span className="sb-label">{copy.agent}</span>
        </span>
      </div>
      {children}
      <button
        type="button"
        data-sb-button
        onClick={toggle}
        className="sb-button"
      >
        <span className="sb-skip">
          {copy.skip}
          <span className="sr-only"> {copy.control}</span>
        </span>
        <span className="sb-replay">
          {copy.replay}
          <span className="sr-only"> {copy.control}</span>
        </span>
      </button>
    </div>
  );
}
