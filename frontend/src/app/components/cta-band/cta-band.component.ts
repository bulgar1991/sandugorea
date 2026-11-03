import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@components/icon/icon.component';
import { RevealDirective } from '@directives/reveal.directive';
import { ButtonComponent } from '@ui/button/button.component';
import { EyebrowComponent, TitleComponent } from '@ui/typography/typography.component';
import { BANNER_IMAGES } from '@/data/portfolio.data';

/** Full-width parallax band inviting to book a date. */
@Component({
  selector: 'app-cta-band',
  imports: [
    RouterLink,
    TranslatePipe,
    IconComponent,
    RevealDirective,
    ButtonComponent,
    EyebrowComponent,
    TitleComponent,
  ],
  template: `
    <section data-testid="cta-band-cta" class="cta">
      <img [src]="image" alt="" class="cta__image" loading="lazy" decoding="async" />
      <div class="cta__shade"></div>
      <div class="cta__content">
        <p app-eyebrow appReveal>{{ 'cta.eyebrow' | translate }}</p>
        <h2 app-title size="xl" class="cta__title" appReveal [revealDelay]="100">
          {{ 'cta.titleStart' | translate }} <em>{{ 'cta.titleAccent' | translate }}</em>
        </h2>
        <a
          data-testid="cta-band-link-booking"
          app-button
          routerLink="/booking"
          class="cta__button"
          appReveal
          [revealDelay]="200"
        >
          <app-icon name="calendar" [size]="16" />
          {{ 'cta.button' | translate }}
        </a>
      </div>
    </section>
  `,
  styles: `
    :host {
      @apply block;
    }
    .cta {
      @apply relative flex h-[75vh] min-h-[30rem] items-center justify-center overflow-hidden;

      &__image {
        @apply absolute -inset-y-[15%] inset-x-0 block h-[130%] w-full object-cover;
      }
      &__shade {
        @apply absolute inset-0 bg-black/60;
      }
      &__content {
        @apply relative mx-auto flex w-full max-w-site flex-col items-center px-5 text-center sm:px-8;
      }
      &__title {
        @apply mt-6 max-w-4xl;
      }
      &__button {
        @apply mt-12;
      }
    }
    @supports (animation-timeline: view()) {
      .cta__image {
        animation: cta-parallax linear both;
        animation-timeline: view();
      }
    }
    @keyframes cta-parallax {
      from {
        transform: translate3d(0, -10%, 0);
      }
      to {
        transform: translate3d(0, 10%, 0);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CtaBandComponent {
  protected readonly image = BANNER_IMAGES.cta;
}
