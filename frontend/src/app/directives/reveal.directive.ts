import {
  Directive,
  ElementRef,
  Injectable,
  OnDestroy,
  afterNextRender,
  inject,
  input,
} from '@angular/core';

/** One shared IntersectionObserver for every revealed element on the page. */
@Injectable({ providedIn: 'root' })
export class RevealObserver {
  private observer?: IntersectionObserver;

  observe(el: Element) {
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-revealed');
      return;
    }
    this.observer ??= new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            this.observer?.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    this.observer.observe(el);
  }

  unobserve(el: Element) {
    this.observer?.unobserve(el);
  }
}

/**
 * Animates an element in the first time it scrolls into view.
 *   <h2 appReveal>…</h2>                      fade + slide up (default)
 *   <img appReveal="clip" [revealDelay]="200">  curtain wipe
 *   appReveal="fade" | "scale"
 */
@Directive({
  selector: '[appReveal]',
  host: {
    '[attr.data-reveal]': 'appReveal() || "up"',
    '[style.--reveal-delay]': 'revealDelay() + "ms"',
  },
})
export class RevealDirective implements OnDestroy {
  readonly appReveal = input<'' | 'up' | 'fade' | 'scale' | 'clip'>('');
  readonly revealDelay = input(0);

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly observer = inject(RevealObserver);

  constructor() {
    afterNextRender(() => this.observer.observe(this.el.nativeElement));
  }

  ngOnDestroy() {
    this.observer.unobserve(this.el.nativeElement);
  }
}
