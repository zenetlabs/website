import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JOBS, jobPaths } from '@/components/switchboard-table';
import { home as enHome } from '@/content/en/home';
import { home as esHome } from '@/content/es/home';
import type { StageCopy } from '@/content/types';

async function freshModule() {
  vi.resetModules();
  return import('@/components/switchboard');
}

async function view(copy: StageCopy = enHome.hero.stage) {
  const { Switchboard, useSwitchboard } = await freshModule();
  function Harness() {
    const { intro, stop, press, click, stageRef, toggle } = useSwitchboard();
    return (
      <section
        onPointerDownCapture={press}
        onPointerUpCapture={press}
        onClickCapture={click}
        onKeyDownCapture={stop}
        onFocusCapture={stop}
      >
        <a href="/book">Book a call</a>
        <Switchboard
          copy={copy}
          intro={intro}
          stageRef={stageRef}
          toggle={toggle}
        >
          <section data-desk>desk</section>
        </Switchboard>
      </section>
    );
  }
  return { Harness, ...render(<Harness />) };
}

function stage(container: HTMLElement) {
  const found = container.querySelector('[data-switchboard]');
  if (!found) throw new Error('no stage');
  return found;
}

const original = Object.getOwnPropertyDescriptor(
  Element.prototype,
  'getAnimations',
);

function running(playing: boolean) {
  Object.defineProperty(Element.prototype, 'getAnimations', {
    configurable: true,
    writable: true,
    value: () => (playing ? [{ playState: 'running' }] : []),
  });
}

describe('Switchboard', () => {
  beforeEach(() => running(false));

  afterEach(() => {
    if (original) {
      Object.defineProperty(Element.prototype, 'getAnimations', original);
    } else {
      Reflect.deleteProperty(Element.prototype, 'getAnimations');
    }
    vi.unstubAllGlobals();
  });

  it('plays once per page load: a later mount starts done', async () => {
    const { Harness, container, unmount } = await view();
    expect(stage(container)).toHaveAttribute('data-intro', 'play');
    unmount();
    const again = render(<Harness />);
    expect(stage(again.container)).toHaveAttribute('data-intro', 'done');
  });

  it.each([
    ['en', enHome.hero.stage, 'Skip the animation', 'Replay the animation'],
    ['es', esHome.hero.stage, 'Saltar la animación', 'Repetir la animación'],
  ] as const)(
    'names the button by its visible label (%s)',
    async (_, copy, skip, replay) => {
      const { container } = await view(copy);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
      expect(button).not.toHaveAttribute('aria-pressed');
      expect(container.querySelector('.sb-skip')).toHaveTextContent(skip);
      expect(container.querySelector('.sb-replay')).toHaveTextContent(replay);
    },
  );

  it('skips a running scene', async () => {
    const { container } = await view();
    running(true);
    fireEvent.click(screen.getByRole('button'));
    expect(stage(container)).toHaveAttribute('data-intro', 'done');
  });

  it('replays a finished scene two frames after styling the final one', async () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    const { container } = await view();
    running(false);
    fireEvent.click(screen.getByRole('button'));
    expect(stage(container)).toHaveAttribute('data-intro', 'done');
    act(() => frames.shift()?.(0));
    expect(stage(container)).toHaveAttribute('data-intro', 'done');
    act(() => frames.shift()?.(0));
    expect(stage(container)).toHaveAttribute('data-intro', 'play');
  });

  it('ends on a press, a key or focus in the hero, but not on its own button or a bare modifier', async () => {
    const { container } = await view();
    const button = screen.getByRole('button');
    fireEvent.pointerDown(button);
    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.focusIn(button);
    fireEvent.keyDown(screen.getByRole('link'), { key: 'Shift' });
    expect(stage(container)).toHaveAttribute('data-intro', 'play');
    fireEvent.pointerDown(stage(container));
    expect(stage(container)).toHaveAttribute('data-intro', 'done');
  });

  it.each([
    ['a key', (link: HTMLElement) => fireEvent.keyDown(link, { key: 'Tab' })],
    ['focus', (link: HTMLElement) => fireEvent.focusIn(link)],
  ])('ends on %s', async (_, press) => {
    const { container } = await view();
    press(screen.getByRole('link'));
    expect(stage(container)).toHaveAttribute('data-intro', 'done');
  });

  it('draws three captions, nine tiles and nine wires, all hidden from assistive tech', async () => {
    const { container } = await view();
    const orbit = container.querySelector('.sb-orbit');
    expect(orbit).toHaveAttribute('aria-hidden', 'true');
    const captions = [...container.querySelectorAll('.sb-cap')];
    expect(captions.map((caption) => caption.textContent)).toEqual(
      Object.values(enHome.hero.stage.jobs).map(
        ({ name, text }) => `${name}: ${text}`,
      ),
    );
    for (const caption of captions) {
      expect(caption.firstElementChild?.tagName).toBe('STRONG');
    }
    expect(container.querySelectorAll('.sb-node')).toHaveLength(9);
    expect(container.querySelectorAll('.sb-wire')).toHaveLength(9);
    expect(container.querySelectorAll('.sb-hop')).toHaveLength(10);
    expect(
      container.querySelector('[data-switchboard] > [data-desk]'),
    ).not.toBeNull();
  });

  it("draws each job's lit paths from the table and drops the scene's parts once done", async () => {
    const { container } = await view();
    for (const job of JOBS) {
      const lines = [
        ...container.querySelectorAll(`.sb-job[data-job="${job.id}"] .sb-lit`),
      ].map((line) => [
        line.getAttribute('data-tile'),
        line.getAttribute('data-to') ?? 'core',
      ]);
      expect(lines).toEqual(jobPaths(job));
    }
    fireEvent.pointerDown(stage(container));
    expect(container.querySelectorAll('.sb-job, .sb-hop')).toHaveLength(0);
    expect(container.querySelectorAll('.sb-node')).toHaveLength(9);
  });

  it('replays when only a press transition runs, not the scene', async () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    const { container } = await view();
    Object.defineProperty(Element.prototype, 'getAnimations', {
      configurable: true,
      writable: true,
      value(this: Element) {
        return this.classList.contains('sb-skip')
          ? []
          : [{ playState: 'running' }];
      },
    });
    fireEvent.click(screen.getByRole('button'));
    act(() => frames.shift()?.(0));
    act(() => frames.shift()?.(0));
    expect(stage(container)).toHaveAttribute('data-intro', 'play');
  });

  it('ends on a finger only when it lifts, and a tap on the bare stage lands nowhere', async () => {
    const { container } = await view();
    const onStage = vi.fn();
    stage(container).addEventListener('click', onStage);
    fireEvent.pointerDown(stage(container), { pointerType: 'touch' });
    expect(stage(container)).toHaveAttribute('data-intro', 'play');
    fireEvent.pointerUp(stage(container), { pointerType: 'touch' });
    expect(stage(container)).toHaveAttribute('data-intro', 'done');
    fireEvent.click(stage(container));
    expect(onStage).not.toHaveBeenCalled();
    fireEvent.pointerDown(stage(container), { pointerType: 'touch' });
    fireEvent.click(stage(container));
    expect(onStage).toHaveBeenCalledTimes(1);
  });
});
