import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Endless horizontal ticker. The list is rendered twice and shifted by -50% (GPU only). */
@Component({
  selector: 'app-marquee',
  template: `
    <div class="marquee" aria-hidden="true">
      <div class="marquee__track">
        @for (copy of [0, 1]; track copy) {
          @for (item of items(); track $index) {
            <span class="marquee__item">
              {{ item }}
              <span class="marquee__star">✦</span>
            </span>
          }
        }
      </div>
    </div>
  `,
  styles: `
    .marquee {
      @apply overflow-hidden border-y border-line py-8;

      &__track {
        @apply flex w-max animate-marquee hover:[animation-play-state:paused];
      }
      &__item {
        @apply flex items-center gap-10 whitespace-nowrap pr-10 font-display text-5xl font-light italic text-ink/80 sm:text-7xl;
      }
      &__star {
        @apply text-2xl not-italic text-accent;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarqueeComponent {
  readonly items = input.required<string[]>();
}
