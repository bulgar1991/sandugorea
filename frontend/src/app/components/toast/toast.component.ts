import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconComponent } from '@components/icon/icon.component';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toasts',
  imports: [IconComponent],
  template: `
    <div
      class="pointer-events-none fixed right-4 bottom-4 z-[95] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3"
      aria-live="polite"
    >
      @for (t of toasts.toasts(); track t.id) {
        <div
          class="toast pointer-events-auto flex items-center gap-3 rounded-xl border bg-surface-2 px-4 py-3 text-sm shadow-2xl"
          [class]="
            t.kind === 'error'
              ? 'border-danger/40'
              : t.kind === 'info'
                ? 'border-line'
                : 'border-accent/40'
          "
          animate.enter="toast-in"
          animate.leave="toast-out"
        >
          <app-icon
            [name]="t.kind === 'error' ? 'close' : 'check'"
            [size]="16"
            [class]="t.kind === 'error' ? 'text-danger' : 'text-accent'"
          />
          <span class="flex-1">{{ t.message }}</span>
          <button
            type="button"
            class="cursor-pointer text-ink-subtle hover:text-ink"
            (click)="toasts.dismiss(t.id)"
            aria-label="Dismiss"
          >
            <app-icon name="close" [size]="14" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toast-in {
      animation: in 0.5s var(--ease-out-expo);
    }
    .toast-out {
      animation: out 0.3s ease forwards;
    }
    @keyframes in {
      from {
        opacity: 0;
        transform: translate3d(0, 16px, 0);
      }
    }
    @keyframes out {
      to {
        opacity: 0;
        transform: translate3d(24px, 0, 0);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastsComponent {
  protected readonly toasts = inject(ToastService);
}
