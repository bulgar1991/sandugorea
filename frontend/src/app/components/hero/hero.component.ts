import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { IconComponent } from '@components/icon/icon.component';
import { PageLoaderState } from '@services/page-loader.service';
import { ButtonComponent } from '@ui/button/button.component';
import { LinkComponent } from '@ui/link/link.component';
import { EyebrowComponent, TextComponent } from '@ui/typography/typography.component';
import { BANNER_IMAGES, BRAND } from '@/data/portfolio.data';

const ROLE_KEYS = ['hero.roles.r1', 'hero.roles.r2', 'hero.roles.r3'];
const TYPE_MS = 70;
const DELETE_MS = 35;
const HOLD_MS = 2000;

/** Floating specks of gold light: fixed positions so every visit looks the same. */
const SPECKS = Array.from({ length: 14 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  top: (i * 53 + 23) % 100,
  size: 4 + ((i * 7) % 10),
  duration: 9 + ((i * 5) % 9),
  delay: -((i * 3) % 12),
}));

/**
 * Full-width home banner with layered parallax:
 *  - the photo drifts with the scroll (CSS scroll timeline - no JS) and with the mouse,
 *  - gold light specks float on a nearer layer (moves more with the mouse = depth),
 *  - a soft light sweep passes over it, and the text lifts away as you scroll.
 * Only transform / opacity are animated, so it stays on the GPU.
 */
@Component({
  selector: 'app-hero',
  imports: [
    RouterLink,
    TranslatePipe,
    IconComponent,
    ButtonComponent,
    LinkComponent,
    EyebrowComponent,
    TextComponent,
  ],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.hero--ready]': 'ready()', '(mousemove)': 'onMove($event)' },
})
export class HeroComponent {
  private readonly translate = inject(TranslateService);
  private readonly loader = inject(PageLoaderState);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected readonly owner = BRAND.owner;
  protected readonly image = BANNER_IMAGES.home;
  protected readonly specks = SPECKS;
  protected readonly roleKeys = ROLE_KEYS;
  /** Intro animations stay paused until the page loader has gone. */
  protected readonly ready = computed(() => !this.loader.visible());
  protected readonly typed = signal('');

  private readonly canTrack =
    typeof matchMedia !== 'undefined' &&
    matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches;
  private frame = 0;

  constructor() {
    const destroyRef = inject(DestroyRef);
    let started = false;
    effect(() => {
      if (!this.ready() || started) return;
      started = true;
      untracked(() => this.startTyping(destroyRef));
    });
    destroyRef.onDestroy(() => cancelAnimationFrame(this.frame));
  }

  /** Mouse position as -0.5…0.5 in CSS variables, once per frame (no change detection). */
  protected onMove(e: MouseEvent) {
    if (!this.canTrack) return;
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      const r = this.host.getBoundingClientRect();
      this.host.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
      this.host.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    });
  }

  private startTyping(destroyRef: DestroyRef) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.typed.set(this.translate.instant(ROLE_KEYS[0]));
      return;
    }
    let timer = 0;
    let role = 0;
    let length = 0;
    let deleting = false;

    const tick = () => {
      // Read the text every tick, so a language switch is picked up immediately.
      const text: string = this.translate.instant(ROLE_KEYS[role]);
      if (length > text.length) length = text.length;

      if (!deleting && length < text.length) {
        this.typed.set(text.slice(0, ++length));
        timer = window.setTimeout(tick, TYPE_MS);
      } else if (!deleting) {
        deleting = true;
        timer = window.setTimeout(tick, HOLD_MS);
      } else if (length > 0) {
        this.typed.set(text.slice(0, --length));
        timer = window.setTimeout(tick, DELETE_MS);
      } else {
        deleting = false;
        role = (role + 1) % ROLE_KEYS.length;
        timer = window.setTimeout(tick, 400);
      }
    };

    timer = window.setTimeout(tick, 1000);
    destroyRef.onDestroy(() => clearTimeout(timer));
  }
}
