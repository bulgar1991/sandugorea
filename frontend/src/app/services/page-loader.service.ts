import { Injectable, signal } from '@angular/core';

/** Shared state of the full-screen page loader (read by page intros so they start after it). */
@Injectable({ providedIn: 'root' })
export class PageLoaderState {
  readonly visible = signal(true);
}

/** How long the loader takes to fade out (keep in sync with styles/_page-loader.scss). */
export const LOADER_FADE_MS = 500;
