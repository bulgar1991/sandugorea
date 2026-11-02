import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { IconComponent } from '@components/icon/icon.component';
import { LightboxComponent } from '@components/lightbox/lightbox.component';
import { RevealDirective } from '@directives/reveal.directive';
import { LightboxItem } from '@models/photo.models';
import { PORTFOLIO } from '@/data/portfolio.data';

const PAGE_SIZE = 8;

/** "Our Latest Works": composed grid with a Load more button and a lightbox. */
@Component({
  selector: 'app-works',
  imports: [TranslatePipe, IconComponent, LightboxComponent, RevealDirective],
  templateUrl: './works.component.html',
  styleUrl: './works.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorksComponent {
  private readonly translate = inject(TranslateService);

  protected readonly total = PORTFOLIO.length;
  protected readonly shown = signal(PAGE_SIZE);
  protected readonly works = computed(() => PORTFOLIO.slice(0, this.shown()));
  protected readonly hasMore = computed(() => this.shown() < this.total);

  protected readonly openIndex = signal<number | null>(null);
  protected readonly lightboxItems = computed<LightboxItem[]>(() => {
    // Re-read the language so captions follow a language switch.
    this.translate.currentLang();
    return this.works().map((w) => ({
      src: w.src,
      title: this.translate.instant(`categories.${w.category}.label`),
    }));
  });

  protected loadMore() {
    this.shown.update((n) => Math.min(this.total, n + PAGE_SIZE));
  }
}
