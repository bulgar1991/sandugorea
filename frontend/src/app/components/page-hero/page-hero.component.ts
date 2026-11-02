import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Title block for inner pages; words rise in one by one. */
@Component({
  selector: 'app-page-hero',
  template: `
    <section class="wrapper page-hero">
      <p class="eyebrow page-hero__fade" style="animation-delay: 100ms">{{ eyebrow() }}</p>
      <h1 class="title title--xl page-hero__title">
        @for (word of words(); track $index) {
          <span class="page-hero__mask"
            ><span class="page-hero__word" [style.animation-delay.ms]="200 + $index * 90">{{
              word
            }}</span></span
          >{{ ' ' }}
        }
      </h1>
      @if (subtitle()) {
        <p
          class="text text--lead page-hero__subtitle page-hero__fade"
          [style.animation-delay.ms]="300 + words().length * 90"
        >
          {{ subtitle() }}
        </p>
      }
    </section>
  `,
  styles: `
    .page-hero {
      @apply pb-16 pt-40 lg:pb-24 lg:pt-48;

      &__title {
        @apply mt-6;
      }
      &__mask {
        @apply inline-block overflow-hidden pb-[0.08em] align-top;
      }
      &__word {
        @apply inline-block animate-rise;
      }
      &__subtitle {
        @apply mt-8 max-w-xl;
      }
      &__fade {
        @apply animate-fade-in;
        animation-duration: 1s;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeroComponent {
  readonly eyebrow = input('');
  readonly title = input.required<string>();
  readonly subtitle = input('');

  protected readonly words = computed(() => this.title().split(' '));
}
