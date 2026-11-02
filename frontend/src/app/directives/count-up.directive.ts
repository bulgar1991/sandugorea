import { Directive, ElementRef, OnDestroy, afterNextRender, inject, input } from '@angular/core';

/**
 * Counts from 0 to `appCountUp` the first time the element scrolls into view.
 *   <span [appCountUp]="480" suffix="+"></span>
 * Writes textContent directly inside requestAnimationFrame - no change detection per frame.
 */
@Directive({ selector: '[appCountUp]' })
export class CountUpDirective implements OnDestroy {
  readonly appCountUp = input.required<number>();
  readonly suffix = input('');
  readonly duration = input(1800);

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private observer?: IntersectionObserver;
  private frame = 0;

  constructor() {
    afterNextRender(() => {
      this.el.textContent = `0${this.suffix()}`;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.el.textContent = `${this.appCountUp()}${this.suffix()}`;
        return;
      }
      this.observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          this.observer?.disconnect();
          this.run();
        },
        { threshold: 0.5 },
      );
      this.observer.observe(this.el);
    });
  }

  private run() {
    const target = this.appCountUp();
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / this.duration());
      const eased = 1 - Math.pow(1 - t, 4);
      this.el.textContent = `${Math.round(target * eased)}${this.suffix()}`;
      if (t < 1) this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
    cancelAnimationFrame(this.frame);
  }
}
