import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@components/icon/icon.component';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, TranslatePipe, IconComponent],
  template: `
    <section class="wrapper not-found">
      <p class="not-found__code">404</p>
      <h1 class="title title--lg not-found__title">{{ 'notFound.title' | translate }}</h1>
      <p class="text not-found__text">{{ 'notFound.text' | translate }}</p>
      <a routerLink="/" class="btn btn--primary not-found__button">
        <app-icon name="arrow-left" [size]="16" />
        {{ 'common.backHome' | translate }}
      </a>
    </section>
  `,
  styles: `
    .not-found {
      @apply flex min-h-[80vh] flex-col items-center justify-center pt-24 text-center;

      &__code {
        @apply font-display text-[10rem] font-light leading-none text-accent/30 sm:text-giant;
      }
      &__title {
        @apply -mt-6;
      }
      &__text {
        @apply mt-6;
      }
      &__button {
        @apply mt-10;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {}
