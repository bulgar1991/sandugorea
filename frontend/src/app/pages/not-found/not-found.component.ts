import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@components/icon/icon.component';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, IconComponent],
  template: `
    <section
      class="container-x flex min-h-[80vh] flex-col items-center justify-center pt-24 text-center"
    >
      <p class="font-display text-[10rem] leading-none font-light text-accent/30 sm:text-[16rem]">
        404
      </p>
      <h1 class="heading-lg -mt-6">This frame is empty</h1>
      <p class="mt-6 text-ink-muted">The page you're looking for doesn't exist or has moved.</p>
      <a routerLink="/" class="btn btn-primary mt-10">
        <app-icon name="arrow-left" [size]="16" />
        Back home
      </a>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {}
