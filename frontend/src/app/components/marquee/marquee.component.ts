import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Endless horizontal ticker. The list is rendered twice and shifted by -50% (GPU only). */
@Component({
  selector: 'app-marquee',
  template: `
    <div class="overflow-hidden border-y border-line py-8" aria-hidden="true">
      <div class="track flex w-max animate-marquee">
        @for (copy of [0, 1]; track copy) {
          @for (item of items(); track $index) {
            <span
              class="flex items-center gap-10 pr-10 font-display text-5xl font-light whitespace-nowrap italic text-ink/80 sm:text-7xl"
            >
              {{ item }}
              <span class="text-2xl text-accent not-italic">✦</span>
            </span>
          }
        }
      </div>
    </div>
  `,
  styles: `
    .track:hover {
      animation-play-state: paused;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarqueeComponent {
  readonly items = input.required<string[]>();
}
