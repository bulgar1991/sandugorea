import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@components/icon/icon.component';
import { ButtonComponent } from '@ui/button/button.component';
import { EyebrowComponent, TitleComponent } from '@ui/typography/typography.component';
import { ContainerComponent } from '@ui/container/container.component';

/** How many photos the cover cycles through. */
const MAX_SLIDES = 6;

/**
 * Full-screen welcome cover of a client's private gallery: a slow cross-fade through their own
 * photos with a gentle zoom, story-style progress bars and the title rising in.
 *
 * Kept smooth on purpose: only opacity/transform are animated (GPU), every photo is decoded
 * before it is shown, the CSS progress bar is the only timer (its `animationend` moves to the
 * next photo, so pausing is exact), and it pauses while off-screen or in a hidden tab.
 * With "reduce motion" it shows the first photo, still.
 */
@Component({
  selector: 'app-gallery-cover',
  imports: [
    ButtonComponent,
    ContainerComponent,
    EyebrowComponent,
    TitleComponent,
    IconComponent,
    TranslatePipe,
  ],
  templateUrl: './gallery-cover.component.html',
  styleUrl: './gallery-cover.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'gallery-cover',
    '[class.gallery-cover--ready]': 'ready()',
    '[class.gallery-cover--paused]': '!playing()',
  },
})
export class GalleryCoverComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Photo URLs (preview size); the first few become the slides. */
  readonly images = input.required<string[]>();
  readonly title = input.required<string>();
  readonly customerName = input('');
  readonly meta = input('');
  readonly downloadUrl = input('');
  /** "See the photos" was pressed. */
  readonly explore = output<void>();

  /** Where each photo's slow zoom is centred, so consecutive photos drift differently. */
  protected readonly origins = ['50% 45%', '25% 30%', '75% 70%', '30% 75%', '70% 25%', '50% 60%'];

  protected readonly slides = computed(() => this.images().slice(0, MAX_SLIDES));
  protected readonly active = signal(0);
  /** The slide fading out underneath the new one (keeps its zoom running while it fades). */
  protected readonly leaving = signal<number | null>(null);
  /** Indexes whose image is downloaded and decoded - only these are put on screen. */
  protected readonly decoded = signal<ReadonlySet<number>>(new Set());
  protected readonly ready = computed(() => this.decoded().has(0));
  protected readonly titleWords = computed(() => this.title().split(/\s+/).filter(Boolean));

  private readonly visible = signal(true);
  private readonly tabVisible = signal(true);
  protected readonly reducedMotion = signal(false);
  protected readonly autoplay = computed(() => this.slides().length > 1 && !this.reducedMotion());
  protected readonly playing = computed(
    () => this.ready() && this.visible() && this.tabVisible() && this.autoplay(),
  );

  /** Set when a bar finished before the next photo was decoded (slow connection). */
  private waitingFor: number | null = null;
  private readonly loading = new Map<number, Promise<void>>();

  constructor() {
    // New gallery (e.g. a different client) -> start over.
    effect(() => {
      this.slides();
      untracked(() => {
        this.active.set(0);
        this.leaving.set(null);
        this.decoded.set(new Set());
        this.loading.clear();
        this.waitingFor = null;
        this.preload(0);
        this.preload(1);
      });
    });

    afterNextRender(() => {
      const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion.set(motion.matches);
      const onMotion = (e: MediaQueryListEvent) => this.reducedMotion.set(e.matches);
      motion.addEventListener('change', onMotion);

      const onVisibility = () => this.tabVisible.set(document.visibilityState === 'visible');
      document.addEventListener('visibilitychange', onVisibility);

      const observer = new IntersectionObserver(
        ([entry]) => this.visible.set(entry.isIntersecting),
        {
          threshold: 0.05,
        },
      );
      observer.observe(this.host.nativeElement);

      this.destroyRef.onDestroy(() => {
        motion.removeEventListener('change', onMotion);
        document.removeEventListener('visibilitychange', onVisibility);
        observer.disconnect();
      });
    });
  }

  /** The active progress bar finished: show the next photo. */
  protected next() {
    const count = this.slides().length;
    if (count < 2) return;
    const target = (this.active() + 1) % count;
    if (!this.decoded().has(target)) {
      // Not ready yet - switch as soon as it is, instead of flashing an empty frame.
      this.waitingFor = target;
      this.preload(target);
      return;
    }
    this.show(target);
  }

  /** A progress bar was clicked. */
  protected goTo(index: number) {
    if (index === this.active()) return;
    this.preload(index).then(() => this.show(index));
  }

  /** The new photo finished fading in: the one underneath can go. */
  protected faded(index: number) {
    if (index === this.active()) this.leaving.set(null);
  }

  private show(index: number) {
    this.waitingFor = null;
    this.leaving.set(this.active());
    this.active.set(index);
    // Fetch the one after it while this one is on screen.
    this.preload((index + 1) % this.slides().length);
  }

  private preload(index: number): Promise<void> {
    const src = this.slides()[index];
    if (!src) return Promise.resolve();
    let promise = this.loading.get(index);
    if (!promise) {
      const img = new Image();
      img.src = src;
      // decode() resolves once the image can be painted without a hitch; failures still count
      // as "done" so a broken photo can't stall the cover.
      promise = img
        .decode()
        .catch(() => undefined)
        .then(() => {
          this.decoded.update((set) => new Set(set).add(index));
          if (this.waitingFor === index) this.show(index);
        });
      this.loading.set(index, promise);
    }
    return promise;
  }
}
