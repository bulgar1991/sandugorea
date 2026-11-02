import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LightboxComponent } from '@components/lightbox/lightbox.component';
import { PageHeroComponent } from '@components/page-hero/page-hero.component';
import { RevealDirective } from '@directives/reveal.directive';
import { LightboxItem, PhotoCategory } from '@models/photo.models';
import { CATEGORIES, PORTFOLIO } from '@/data/portfolio.data';

type Filter = PhotoCategory | 'all';

@Component({
  selector: 'app-portfolio',
  imports: [PageHeroComponent, RevealDirective, LightboxComponent],
  templateUrl: './portfolio.component.html',
  styleUrl: './portfolio.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioComponent {
  private readonly router = inject(Router);

  /** Bound from the ?category= query param. */
  readonly category = input<string>();

  protected readonly filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    ...CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
  ];

  protected readonly active = computed<Filter>(() => {
    const c = this.category();
    return this.filters.some((f) => f.id === c) ? (c as Filter) : 'all';
  });

  protected readonly photos = computed(() => {
    const active = this.active();
    return active === 'all' ? PORTFOLIO : PORTFOLIO.filter((p) => p.category === active);
  });

  protected readonly lightboxItems = computed<LightboxItem[]>(() =>
    this.photos().map((p) => ({ src: p.src, title: p.title })),
  );
  protected readonly openIndex = signal<number | null>(null);

  protected select(id: Filter) {
    this.router.navigate([], {
      queryParams: { category: id === 'all' ? null : id },
      replaceUrl: true,
    });
  }
}
