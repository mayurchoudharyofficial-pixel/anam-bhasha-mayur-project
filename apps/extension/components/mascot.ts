import type { Sound } from './sound';

/**
 * The detective: a small character with moods, live eyes and manners.
 *
 * Moods map to drawn poses (public/poses). The resting pose has its eyes painted out
 * (peek-face.svg) and redrawn here, so they can follow the cursor and blink.
 *
 * Manners (edge cases):
 * - Loops (eyes, blinking, breathing) run only while the tab is visible and the detective is shown;
 *   the eye loop stops itself once the cursor is still.
 * - Reduced motion: no travel, no tracking, no loops; poses still change so state stays readable.
 * - Never fights the page: ducks while the person scrolls, hides for fullscreen video and print.
 * - Stays legible on dark websites (a thin light rim around the drawing).
 * - Moods that report a result (happy, puzzled) settle back to resting on their own.
 * - Every animation is interruptible: a new mood cancels the last one mid-flight.
 */

export type Mood = 'idle' | 'search' | 'work' | 'happy' | 'think' | 'sleep';
type Pose = 'peek' | 'magnify' | 'laptop' | 'idea' | 'think' | 'sleep' | 'getaway' | 'box';

const MOOD_POSE: Record<Mood, Pose> = { idle: 'peek', search: 'magnify', work: 'laptop', happy: 'idea', think: 'think', sleep: 'sleep' };
/** Natural size of each cut-out (scripts/cut-poses.py), so every pose keeps its proportions. */
const SIZE: Record<Pose, [number, number]> = {
  peek: [271, 138], magnify: [277, 227], laptop: [289, 221], idea: [222, 188], think: [274, 199],
  sleep: [267, 190], getaway: [287, 205], box: [268, 175],
};

const EASE_OUT = 'cubic-bezier(.23, 1, .32, 1)';
/** Damped spring with a little overshoot; only for the character, never for interface chrome. */
const SPRING = 'linear(0, 0.026, 0.092, 0.186, 0.295, 0.411, 0.525, 0.634, 0.733, 0.819, 0.893, 0.952, 0.999, 1.034, 1.059, 1.074, 1.082, 1.083, 1.081, 1.075, 1.067, 1.058, 1.048, 1.038, 1.029, 1.021, 1.014, 1.008, 1.003, 1, 0.997, 0.995, 0.994, 0.993, 0.993, 0.993, 0.994, 0.995, 0.995, 0.996, 1)';
const SLEEP_AFTER = 60_000;
const POKES_FOR_DIZZY = 5;

interface Options {
  launcher: HTMLElement;
  button: HTMLElement;
  stage: HTMLElement;
  url: (path: string) => string;
  sound: Sound;
  /** True while the person is in the middle of something (picking, reading a lesson). */
  busy: () => boolean;
  signal: AbortSignal;
}

export function createMascot({ launcher, button, stage, url, sound, busy, signal }: Options) {
  stage.innerHTML = `<span class="figure" data-pose="peek"><span class="eye l"><i></i></span><span class="eye r"><i></i></span></span>`;
  launcher.insertAdjacentHTML('afterbegin', '<span class="bubble" role="status" aria-live="polite" hidden></span>');
  const fig = stage.querySelector<HTMLElement>('.figure')!;
  const eyes = [...stage.querySelectorAll<HTMLElement>('.eye')];
  const pupils = eyes.map((e) => e.querySelector('i')!);
  const bubble = launcher.querySelector<HTMLElement>('.bubble')!;
  const canAnimate = typeof fig.animate === 'function';
  const reduced = () => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const anim = (el: Element, k: Keyframe[], o: KeyframeAnimationOptions) => (canAnimate ? el.animate(k, o) : null);

  let pose: Pose = 'peek';
  let mood: Mood = 'idle';
  let shown = false;
  let settle = 0;
  let bubbleTimer = 0;
  let lastActive = performance.now();
  let pokes: number[] = [];

  // ---- poses --------------------------------------------------------------------------------------

  function paint(p: Pose) {
    const [w, h] = SIZE[p];
    // Fit inside the launcher width, cap the height so tall poses do not tower over the page.
    const width = Math.min(120, (84 * w) / h);
    fig.style.width = `${width}px`;
    fig.style.height = `${(width * h) / w}px`;
    fig.style.backgroundImage = `url("${url(`/poses/${p === 'peek' ? 'peek-face' : p}.svg`)}")`;
    fig.dataset.pose = p;
  }

  /** Swap drawings with a squash-and-settle, masked by a 2px blur so two poses never read as two objects. */
  function setPose(p: Pose, force = false) {
    if (p === pose && !force) return;
    pose = p;
    if (!canAnimate || reduced() || !shown) { paint(p); return; }
    fig.getAnimations().forEach((a) => a.cancel());
    const out = fig.animate([{ transform: 'none', filter: 'blur(0)' }, { transform: 'translateY(6%) scale(.94, .9)', filter: 'blur(2px)' }], { duration: 90, easing: EASE_OUT });
    out.onfinish = () => {
      if (pose !== p) return; // a newer pose already took over
      paint(p);
      fig.animate([{ transform: 'translateY(6%) scale(.94, .9)', filter: 'blur(2px)' }, { transform: 'none', filter: 'blur(0)' }], { duration: 520, easing: SPRING });
    };
  }

  function setMood(next: Mood, holdMs = 0) {
    clearTimeout(settle);
    if (mood === 'sleep' && next !== 'sleep') say('');
    mood = next;
    fig.classList.toggle('typing', next === 'work');
    setPose(MOOD_POSE[next]);
    if (holdMs) settle = window.setTimeout(() => { if (mood === next) setMood('idle'); }, holdMs);
    if (next === 'idle') { scheduleBlink(); look(); }
  }

  // ---- eyes ---------------------------------------------------------------------------------------

  let pointer: { x: number; y: number } | null = null;
  let cur = { x: 0, y: 0 };
  let raf = 0;
  let lastMove = 0;

  function look() {
    if (raf || !shown || reduced() || pose !== 'peek' || document.hidden) return;
    raf = requestAnimationFrame(frame);
  }

  function frame() {
    raf = 0;
    if (!shown || pose !== 'peek') return;
    const eye = eyes[0]!.getBoundingClientRect();
    const r = fig.getBoundingClientRect();
    const max = { x: eye.width * 0.24, y: eye.height * 0.18 };
    let tx = 0;
    let ty = 0;
    if (pointer) {
      const dx = pointer.x - (r.left + r.width / 2);
      const dy = pointer.y - (r.top + r.height * 0.78);
      const d = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, d / 240);
      tx = (dx / d) * reach * max.x;
      ty = (dy / d) * reach * max.y;
    }
    cur = { x: cur.x + (tx - cur.x) * 0.2, y: cur.y + (ty - cur.y) * 0.2 };
    for (const p of pupils) p.style.transform = `translate(${cur.x.toFixed(2)}px, ${cur.y.toFixed(2)}px)`;
    const settled = Math.abs(tx - cur.x) < 0.05 && Math.abs(ty - cur.y) < 0.05;
    if (!settled || performance.now() - lastMove < 400) raf = requestAnimationFrame(frame);
  }

  let blinkTimer = 0;
  function scheduleBlink() {
    clearTimeout(blinkTimer);
    if (!shown || reduced() || document.hidden) return;
    blinkTimer = window.setTimeout(() => {
      if (pose === 'peek') {
        blink();
        if (Math.random() < 0.18) setTimeout(blink, 220);
      }
      scheduleBlink();
    }, 2400 + Math.random() * 3800);
  }
  function blink() {
    for (const e of eyes) anim(e, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(.08)', offset: 0.45 }, { transform: 'scaleY(1)' }], { duration: 170, easing: 'ease-in-out' });
  }

  // ---- speech -------------------------------------------------------------------------------------

  function say(text: string, ms = 1800) {
    clearTimeout(bubbleTimer);
    bubble.textContent = text;
    bubble.hidden = !text;
    if (text) bubbleTimer = window.setTimeout(() => { bubble.hidden = true; }, ms);
  }

  // ---- reactions ----------------------------------------------------------------------------------

  function squash() {
    anim(fig, [{ transform: 'scale(1.06, .9)' }, { transform: 'none' }], { duration: 420, easing: SPRING });
  }

  function dizzy() {
    pokes = [];
    sound.play('boing');
    say('Hey! That tickles.');
    anim(fig, [0, -14, 12, -9, 6, -3, 0].map((deg) => ({ transform: `rotate(${deg}deg)` })), { duration: 900, easing: 'ease-in-out' });
    // Pupils roll around once.
    if (canAnimate && !reduced()) {
      const ring = Array.from({ length: 9 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return { transform: `translate(${(Math.cos(a) * 3).toFixed(2)}px, ${(Math.sin(a) * 2).toFixed(2)}px)` };
      });
      pupils.forEach((p) => p.animate(ring, { duration: 700, iterations: 1 }));
    }
  }

  function wake() {
    if (mood !== 'sleep') return;
    setMood('idle');
    anim(fig, [{ transform: 'none' }, { transform: 'translateY(-10%)' }, { transform: 'none' }], { duration: 380, easing: EASE_OUT });
    say('Oh! I’m up.', 1400);
  }

  // ---- listeners ----------------------------------------------------------------------------------

  const activity = () => { lastActive = performance.now(); wake(); };

  document.addEventListener('pointermove', (e) => {
    pointer = { x: e.clientX, y: e.clientY };
    lastMove = performance.now();
    activity();
    look();
  }, { passive: true, signal });
  document.addEventListener('pointerleave', () => { pointer = null; look(); }, { signal });
  document.addEventListener('keydown', activity, { signal });

  // Duck below the ledge while the page scrolls; come back up once it stops.
  let duckTimer = 0;
  window.addEventListener('scroll', () => {
    activity();
    if (!shown || reduced() || launcher.classList.contains('open') || mood !== 'idle') return;
    fig.classList.add('duck');
    clearTimeout(duckTimer);
    duckTimer = window.setTimeout(() => fig.classList.remove('duck'), 380);
  }, { passive: true, capture: true, signal });

  document.addEventListener('fullscreenchange', () => launcher.classList.toggle('fs-hide', !!document.fullscreenElement), { signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; clearTimeout(blinkTimer); } else { scheduleBlink(); look(); } }, { signal });

  button.addEventListener('pointerenter', () => {
    fig.classList.add('curious');
    wake();
  }, { signal });
  button.addEventListener('pointerleave', () => fig.classList.remove('curious'), { signal });
  button.addEventListener('pointerdown', () => {
    sound.gesture();
    squash();
    const now = performance.now();
    pokes = [...pokes.filter((t) => now - t < 1600), now];
    if (pokes.length >= POKES_FOR_DIZZY) dizzy();
    else sound.play(launcher.classList.contains('open') ? 'tick' : 'pop');
  }, { signal });

  // Fall asleep when nobody has touched anything for a while, and never mid-task.
  const sleeper = window.setInterval(() => {
    if (!shown || mood !== 'idle' || busy() || launcher.classList.contains('open')) return;
    if (performance.now() - lastActive > SLEEP_AFTER) { setMood('sleep'); say('', 0); }
  }, 5000);
  signal.addEventListener('abort', () => { clearInterval(sleeper); clearTimeout(blinkTimer); clearTimeout(settle); clearTimeout(bubbleTimer); cancelAnimationFrame(raf); });

  paint('peek');

  // ---- public -------------------------------------------------------------------------------------

  return {
    /** Pop up from behind the ledge when Pixel Peeper is switched on. */
    arrive() {
      shown = true;
      lastActive = performance.now();
      setMood('idle');
      paint('peek');
      if (!reduced()) anim(fig, [{ transform: 'translateY(105%)' }, { transform: 'none' }], { duration: 760, delay: 60, easing: SPRING, fill: 'backwards' });
      sound.play('pop');
    },
    hide() { shown = false; cancelAnimationFrame(raf); raf = 0; clearTimeout(blinkTimer); },
    mood: setMood,
    /** The result arrived: a hop and a ding, or a puzzled head-scratch with a low bonk. */
    result(ok: boolean) {
      setMood(ok ? 'happy' : 'think', ok ? 2400 : 3200);
      sound.play(ok ? 'ding' : 'bonk', true);
      if (ok) anim(fig, [{ transform: 'none' }, { transform: 'translateY(-14%)' }, { transform: 'none' }], { duration: 520, delay: 620, easing: SPRING });
      else anim(fig, [0, -6, 5, -3, 0].map((deg) => ({ transform: `rotate(${deg}deg)` })), { duration: 600, delay: 620, easing: 'ease-in-out' });
    },
    /** An idea was saved: he dashes off with it, then comes back. */
    celebrate() {
      clearTimeout(settle);
      fig.getAnimations().forEach((a) => a.cancel());
      pose = 'getaway';
      paint('getaway');
      sound.play('coin', true);
      anim(fig, [{ transform: 'translateX(18%) rotate(4deg)' }, { transform: 'translateX(-4%) rotate(-2deg)' }, { transform: 'none' }], { duration: 560, easing: EASE_OUT });
      settle = window.setTimeout(() => setMood('idle'), 2400);
    },
    /** The Close button: he hops into his box and is gone. Calls `done` when the hop ends. */
    leave(done: () => void) {
      clearTimeout(settle);
      say('');
      if (reduced() || !canAnimate) { done(); return; }
      fig.getAnimations().forEach((a) => a.cancel());
      pose = 'box';
      paint('box');
      sound.play('whoosh');
      const a = fig.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-8%)', opacity: 1, offset: 0.35 }, { transform: 'translateY(30%) scale(.92)', opacity: 0 }], { duration: 460, delay: 240, easing: EASE_OUT, fill: 'forwards' });
      a.onfinish = () => { a.cancel(); done(); };
    },
    /** The menu opened: eyes go to the buttons. */
    attend() { pointer = (() => { const r = launcher.getBoundingClientRect(); return { x: r.left - 120, y: r.top + r.height / 2 }; })(); look(); },
  };
}

export type Mascot = ReturnType<typeof createMascot>;
