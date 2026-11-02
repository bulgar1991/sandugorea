import { ChangeDetectionStrategy, Component, ElementRef, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@components/icon/icon.component';
import { PageHeroComponent } from '@components/page-hero/page-hero.component';
import { RevealDirective } from '@directives/reveal.directive';
import { CATEGORIES, imageUrl } from '@/data/portfolio.data';

@Component({
  selector: 'app-about',
  imports: [RouterLink, IconComponent, PageHeroComponent, RevealDirective],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutComponent {
  protected readonly portrait = imageUrl('sg-portrait', 1000, 1300);
  protected readonly detail = imageUrl('sg-detail', 900, 700);
  protected readonly categories = CATEGORIES;

  protected readonly stats = [
    { value: '12', label: 'Years behind the camera' },
    { value: '480+', label: 'Sessions photographed' },
    { value: '160', label: 'Weddings' },
    { value: '14', label: 'Countries' },
  ];

  protected readonly values = [
    {
      title: 'Honest',
      text: 'No stiff poses. I guide gently and wait for the real thing to happen.',
    },
    {
      title: 'Timeless',
      text: 'Natural colour and careful editing that will still feel right in thirty years.',
    },
    {
      title: 'Private',
      text: 'Your photographs are delivered in your own project folder that only you can open.',
    },
  ];

  /** Floating preview image that follows the cursor over the services list. */
  protected readonly hovered = signal<number | null>(null);
  private readonly floater = viewChild<ElementRef<HTMLElement>>('floater');
  private frame = 0;

  protected onMove(e: MouseEvent) {
    // Written straight to the style in a rAF - no change detection per mouse move.
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      const el = this.floater()?.nativeElement;
      if (el) el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    });
  }
}
