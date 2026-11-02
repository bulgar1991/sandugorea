import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { IconComponent } from '@components/icon/icon.component';

@Component({
  selector: 'app-modal',
  imports: [IconComponent],
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title()"
        animate.enter="modal-enter"
        animate.leave="modal-leave"
      >
        <div
          class="modal-backdrop absolute inset-0 bg-black/80"
          (click)="close()"
          aria-hidden="true"
        ></div>
        <div
          class="modal-panel relative max-h-[92svh] w-full overflow-y-auto rounded-t-3xl border border-line bg-surface p-6 sm:rounded-3xl sm:p-8"
          [class]="width()"
        >
          <div class="mb-6 flex items-start justify-between gap-6">
            <h2 class="font-display text-3xl font-light">{{ title() }}</h2>
            <button
              type="button"
              class="-mt-1 -mr-2 cursor-pointer rounded-full p-2 text-ink-muted hover:bg-white/5 hover:text-ink"
              (click)="close()"
              aria-label="Close"
            >
              <app-icon name="close" />
            </button>
          </div>
          <ng-content />
        </div>
      </div>
    }
  `,
  styles: `
    .modal-enter .modal-backdrop {
      animation: backdrop 0.35s ease;
    }
    .modal-enter .modal-panel {
      animation: panel 0.6s var(--ease-out-expo);
    }
    .modal-leave {
      animation: leave 0.25s ease forwards;
    }
    @keyframes backdrop {
      from {
        opacity: 0;
      }
    }
    @keyframes panel {
      from {
        opacity: 0;
        transform: translate3d(0, 40px, 0) scale(0.98);
      }
    }
    @keyframes leave {
      to {
        opacity: 0;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'close()' },
})
export class ModalComponent {
  readonly open = model(false);
  readonly title = input('');
  readonly width = input('sm:max-w-lg');

  protected close() {
    this.open.set(false);
  }
}
