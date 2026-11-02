import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CtaBandComponent } from '@components/cta-band/cta-band.component';
import { IconComponent } from '@components/icon/icon.component';
import { PageBannerComponent } from '@components/page-banner/page-banner.component';
import { RevealDirective } from '@directives/reveal.directive';
import { ButtonComponent } from '@ui/button/button.component';
import { ContainerComponent } from '@ui/container/container.component';
import {
  EyebrowComponent,
  TextComponent,
  TitleComponent,
} from '@ui/typography/typography.component';
import { BANNER_IMAGES, SERVICES } from '@/data/portfolio.data';

/** Services: one row per session type (photo with parallax, text, what's included), then the process. */
@Component({
  selector: 'app-services-page',
  imports: [
    RouterLink,
    TranslatePipe,
    CtaBandComponent,
    IconComponent,
    PageBannerComponent,
    RevealDirective,
    ButtonComponent,
    ContainerComponent,
    EyebrowComponent,
    TextComponent,
    TitleComponent,
  ],
  templateUrl: './services-page.component.html',
  styleUrl: './services-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicesPageComponent {
  protected readonly image = BANNER_IMAGES.services;
  protected readonly services = SERVICES;
  protected readonly includes = ['i1', 'i2', 'i3'];
  protected readonly steps = ['s1', 's2', 's3'];
}
