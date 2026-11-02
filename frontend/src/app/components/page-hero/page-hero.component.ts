import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Title block for inner pages; words rise in one by one. */
@Component({
  selector: 'app-page-hero',
  template: `
    <section class="container-x pt-40 pb-16 lg:pt-48 lg:pb-24">
      <p class="eyebrow hero-fade" style="animation-delay: 100ms">{{ eyebrow() }}</p>
      <h1 class="heading-xl mt-6">
        @for (word of words(); track $index) {
          <span class="word-mask"
            ><span class="word" [style.animation-delay.ms]="200 + $index * 90">{{
              word
            }}</span></span
          >{{ ' ' }}
        }
      </h1>
      @if (subtitle()) {
        <p
          class="hero-fade mt-8 max-w-xl text-lg leading-relaxed text-ink-muted"
          [style.animation-delay.ms]="300 + words().length * 90"
        >
          {{ subtitle() }}
        </p>
      }
    </section>
  `,
  styles: `
    .word-mask {
      display: inline-block;
      overflow: hidden;
      vertical-align: top;
      padding-bottom: 0.08em;
    }
    .word {
      display: inline-block;
      transform: translate3d(0, 105%, 0);
      animation: word-up 1.1s var(--ease-out-expo) forwards;
    }
    .hero-fade {
      opacity: 0;
      animation: hero-fade 1s ease forwards;
    }
    @keyframes word-up {
      to {
        transform: translate3d(0, 0, 0);
      }
    }
    @keyframes hero-fade {
      to {
        opacity: 1;
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
