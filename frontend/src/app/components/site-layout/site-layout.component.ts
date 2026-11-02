import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from '@components/footer/footer.component';
import { HeaderComponent } from '@components/header/header.component';
import { PreloaderComponent } from '@components/preloader/preloader.component';

@Component({
  selector: 'app-site-layout',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, PreloaderComponent],
  template: `
    <app-preloader />
    <app-header />
    <main>
      <router-outlet />
    </main>
    <app-footer />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteLayoutComponent {}
