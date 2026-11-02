import { ChangeDetectionStrategy, Component, ElementRef, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@components/icon/icon.component';
import { RevealDirective } from '@directives/reveal.directive';
import { BRAND, imageUrl } from '@/data/portfolio.data';

/** Max tilt of the portrait towards the mouse, in degrees. */
const MAX_TILT = 8;

/** Image + description about the photographer. */
@Component({
  selector: 'app-about-section',
  imports: [RouterLink, TranslatePipe, IconComponent, RevealDirective],
  templateUrl: './about-section.component.html',
  styleUrl: './about-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutSectionComponent {
  protected readonly portrait = imageUrl('sg-portrait', 1000, 1300);
  protected readonly detail = imageUrl('sg-detail', 700, 900);
  protected readonly highlights = [
    'about.highlights.h1',
    'about.highlights.h2',
    'about.highlights.h3',
  ];
  /** Text running around the rotating badge (repeated to fill the circle). */
  protected readonly ringText = `${BRAND.owner} • Photography • `.repeat(2).toUpperCase();

  private readonly tilt = viewChild.required<ElementRef<HTMLElement>>('tilt');
  private readonly canTilt =
    typeof matchMedia !== 'undefined' &&
    matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches;
  private frame = 0;

  /**
   * 3D tilt + moving light, written straight to CSS variables inside one requestAnimationFrame:
   * no change detection per mouse move, and only `transform` changes (GPU).
   */
  protected onMove(e: MouseEvent) {
    if (!this.canTilt) return;
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      const el = this.tilt().nativeElement;
      const r = el.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      el.style.setProperty('--ry', `${(x - 0.5) * 2 * MAX_TILT}deg`);
      el.style.setProperty('--rx', `${(0.5 - y) * 2 * MAX_TILT}deg`);
      el.style.setProperty('--lx', `${(x - 0.5) * 100}%`);
      el.style.setProperty('--ly', `${(y - 0.5) * 100}%`);
      el.classList.add('about__tilt--active');
    });
  }

  protected onLeave() {
    if (!this.canTilt) return;
    cancelAnimationFrame(this.frame);
    const el = this.tilt().nativeElement;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.classList.remove('about__tilt--active');
  }
}
