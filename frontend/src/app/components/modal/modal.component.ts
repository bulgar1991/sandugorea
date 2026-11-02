import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@components/icon/icon.component';

@Component({
  selector: 'app-modal',
  imports: [IconComponent, TranslatePipe],
  template: `
    @if (open()) {
      <div
        class="modal"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title()"
        animate.leave="modal--leaving"
      >
        <div class="modal__backdrop" (click)="close()" aria-hidden="true"></div>
        <div class="modal__panel" [class.modal__panel--wide]="wide()">
          <div class="modal__head">
            <h2 class="title title--md">{{ title() }}</h2>
            <button
              type="button"
              class="modal__close"
              (click)="close()"
              [attr.aria-label]="'common.close' | translate"
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
    .modal {
      @apply fixed inset-0 z-modal flex items-end justify-center sm:items-center sm:p-6;

      &--leaving {
        @apply animate-fade-out;
      }
      &__backdrop {
        @apply absolute inset-0 animate-fade-in bg-black/80;
      }
      &__panel {
        @apply relative max-h-[92svh] w-full animate-panel-in overflow-y-auto rounded-t-3xl border border-line bg-surface p-6 sm:max-w-lg sm:rounded-3xl sm:p-8;

        &--wide {
          @apply sm:max-w-2xl;
        }
      }
      &__head {
        @apply mb-6 flex items-start justify-between gap-6;
      }
      &__close {
        @apply -mr-2 -mt-1 cursor-pointer rounded-full p-2 text-ink-muted hover:bg-white/5 hover:text-ink;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'close()' },
})
export class ModalComponent {
  readonly open = model(false);
  readonly title = input('');
  readonly wide = input(false);

  protected close() {
    this.open.set(false);
  }
}
