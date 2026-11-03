import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@components/icon/icon.component';
import { ButtonComponent } from '@ui/button/button.component';
import { TextComponent, TitleComponent } from '@ui/typography/typography.component';
import { ContainerComponent } from '@ui/container/container.component';

@Component({
  selector: 'app-not-found',
  imports: [
    ButtonComponent,
    TitleComponent,
    TextComponent,
    ContainerComponent,
    RouterLink,
    TranslatePipe,
    IconComponent,
  ],
  template: `
    <section data-testid="not-found" app-container class="not-found">
      <p class="not-found__code">404</p>
      <h1 app-title size="lg" class="not-found__title">{{ 'notFound.title' | translate }}</h1>
      <p app-text class="not-found__text">{{ 'notFound.text' | translate }}</p>
      <a data-testid="not-found-link-home" app-button routerLink="/" class="not-found__button">
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
