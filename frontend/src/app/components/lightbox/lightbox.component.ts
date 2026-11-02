import { ChangeDetectionStrategy, Component, computed, effect, input, model } from '@angular/core';
import { IconComponent } from '@components/icon/icon.component';
import { LightboxItem } from '@models/photo.models';

@Component({
  selector: 'app-lightbox',
  imports: [IconComponent],
  templateUrl: './lightbox.component.html',
  styleUrl: './lightbox.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onKey($event)' },
})
export class LightboxComponent {
  readonly items = input.required<LightboxItem[]>();
  /** Index of the open item; null = closed. */
  readonly index = model<number | null>(null);
  readonly allowDownload = input(false);

  protected readonly current = computed(() => {
    const i = this.index();
    return i === null ? undefined : this.items()[i];
  });

  private touchX = 0;

  constructor() {
    effect(() => {
      const open = this.index() !== null;
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) this.preloadNeighbours();
    });
  }

  protected close() {
    this.index.set(null);
  }

  protected step(delta: number) {
    const i = this.index();
    const n = this.items().length;
    if (i === null || n === 0) return;
    this.index.set((i + delta + n) % n);
  }

  protected onKey(e: KeyboardEvent) {
    if (this.index() === null) return;
    if (e.key === 'Escape') this.close();
    else if (e.key === 'ArrowRight') this.step(1);
    else if (e.key === 'ArrowLeft') this.step(-1);
  }

  protected onTouchStart(e: TouchEvent) {
    this.touchX = e.touches[0].clientX;
  }

  protected onTouchEnd(e: TouchEvent) {
    const dx = e.changedTouches[0].clientX - this.touchX;
    if (Math.abs(dx) > 50) this.step(dx < 0 ? 1 : -1);
  }

  private preloadNeighbours() {
    const i = this.index();
    const items = this.items();
    if (i === null || items.length < 2) return;
    for (const j of [i + 1, i - 1]) {
      const img = new Image();
      img.src = items[(j + items.length) % items.length].src;
    }
  }
}
