import { ChangeDetectionStrategy, Component, afterNextRender, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { BRAND } from '@/data/portfolio.data';

/** Shown once per page load, never again on in-app navigation. */
let alreadyShown = false;
let finished = false;
const DURATION_MS = 1900;

/** How long page intros should wait so they play right as the preloader lifts. */
export const introDelayMs = () => (finished ? 0 : DURATION_MS - 300);

@Component({
  selector: 'app-preloader',
  imports: [TranslatePipe],
  template: `
    @if (visible()) {
      <div class="preloader" animate.leave="preloader--leaving" aria-hidden="true">
        <div class="preloader__brand">
          @for (letter of letters; track $index) {
            <span class="preloader__letter" [style.animation-delay.ms]="120 + $index * 55">{{
              letter
            }}</span>
          }
        </div>
        <div class="preloader__line"></div>
        <p class="preloader__tag">{{ 'brand.tagline' | translate }}</p>
      </div>
    }
  `,
  styleUrl: './preloader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreloaderComponent {
  protected readonly letters = BRAND.name.split('');
  protected readonly visible = signal(!alreadyShown);

  constructor() {
    afterNextRender(() => {
      if (alreadyShown) return;
      alreadyShown = true;
      setTimeout(() => {
        this.visible.set(false);
        finished = true;
      }, DURATION_MS);
    });
  }
}
