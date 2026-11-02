import { Injectable, signal } from '@angular/core';

/** Which one-page section (#home, #about, ...) is in view. Set by the home page, read by the header. */
@Injectable({ providedIn: 'root' })
export class ActiveSectionService {
  readonly id = signal('home');
  private observer?: IntersectionObserver;

  watch(sections: Element[]) {
    this.observer?.disconnect();
    // A section is "active" when it crosses the middle band of the viewport.
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) this.id.set(e.target.id);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    sections.forEach((s) => this.observer?.observe(s));
  }

  stop() {
    this.observer?.disconnect();
    this.id.set('home');
  }
}
