import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { IconComponent } from '@components/icon/icon.component';
import { introDelayMs } from '@components/preloader/preloader.component';
import { BRAND, HERO_PORTRAIT } from '@/data/portfolio.data';

const ROLE_KEYS = ['hero.roles.r1', 'hero.roles.r2', 'hero.roles.r3'];
const TYPE_MS = 70;
const DELETE_MS = 35;
const HOLD_MS = 2000;

/**
 * Banner: greeting with a typing line on the left, the photographer's portrait stepping
 * out of a frame on the right.
 */
@Component({
  selector: 'app-hero',
  imports: [RouterLink, TranslatePipe, IconComponent],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style.--intro]': 'introDelay + "ms"' },
})
export class HeroComponent {
  private readonly translate = inject(TranslateService);

  protected readonly owner = BRAND.owner;
  protected readonly portrait = HERO_PORTRAIT;
  protected readonly introDelay = introDelayMs();
  protected readonly roleKeys = ROLE_KEYS;

  /** The part of the current role typed so far. */
  protected readonly typed = signal('');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
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

      timer = window.setTimeout(tick, this.introDelay + 900);
      destroyRef.onDestroy(() => clearTimeout(timer));
    });
  }
}
