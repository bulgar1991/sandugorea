import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@components/icon/icon.component';
import { RevealDirective } from '@directives/reveal.directive';
import { AuthService } from '@services/auth.service';
import { GalleryStore } from '@services/gallery-store.service';

@Component({
  selector: 'app-client-galleries',
  imports: [RouterLink, DatePipe, IconComponent, RevealDirective],
  template: `
    <section class="container-x py-16 lg:py-24">
      <p class="eyebrow" appReveal>Welcome back</p>
      <h1 class="heading-lg mt-4" appReveal [revealDelay]="100">{{ session()?.displayName }}</h1>
      <p class="mt-4 text-ink-muted" appReveal [revealDelay]="150">
        Your private galleries. Only you can see these photographs.
      </p>

      @if (galleries().length) {
        <div class="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          @for (g of galleries(); track g.id; let i = $index) {
            <a
              [routerLink]="['/client/galleries', g.id]"
              class="group block"
              appReveal
              [revealDelay]="i * 120"
            >
              <div class="relative aspect-[4/5] overflow-hidden bg-surface">
                <img
                  [src]="g.photos[0]?.thumbUrl"
                  [alt]="g.title"
                  class="img-cover transition-transform duration-[1400ms] ease-(--ease-out-expo) group-hover:scale-105"
                  loading="lazy"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent"></div>
                <span
                  class="absolute right-5 bottom-5 flex h-12 w-12 items-center justify-center rounded-full border border-white/30 transition-all duration-500 group-hover:rotate-45 group-hover:border-accent group-hover:bg-accent group-hover:text-black"
                >
                  <app-icon name="arrow-up-right" [size]="18" />
                </span>
              </div>
              <h2
                class="mt-5 font-display text-3xl font-light transition-colors group-hover:text-accent"
              >
                {{ g.title }}
              </h2>
              <p class="mt-1 text-xs tracking-[0.25em] text-ink-muted uppercase">
                {{ g.date | date: 'd MMMM y' }} · {{ g.photos.length }} photos
              </p>
            </a>
          }
        </div>
      } @else {
        <div class="card mt-14 flex flex-col items-center gap-4 px-6 py-20 text-center" appReveal>
          <app-icon name="camera" [size]="36" class="text-accent" />
          <h2 class="font-display text-3xl font-light">Your photographs are being prepared</h2>
          <p class="max-w-md text-ink-muted">
            You'll receive an email as soon as your gallery is ready.
          </p>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientGalleriesComponent {
  private readonly store = inject(GalleryStore);
  protected readonly session = inject(AuthService).session;
  protected readonly galleries = computed(() =>
    this.store.sentGalleriesFor(this.session()?.clientId ?? ''),
  );
}
