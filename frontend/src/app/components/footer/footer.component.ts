import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@components/icon/icon.component';
import { LanguageSwitcherComponent } from '@components/language-switcher/language-switcher.component';
import { NAV_LINKS } from '@components/header/header.component';
import { RevealDirective } from '@directives/reveal.directive';
import { SocialLinksComponent } from '@components/social-links/social-links.component';
import { BRAND } from '@/data/portfolio.data';
import { TextComponent } from '@ui/typography/typography.component';
import { ContainerComponent } from '@ui/container/container.component';

@Component({
  selector: 'app-footer',
  imports: [
    SocialLinksComponent,
    TextComponent,
    ContainerComponent,
    RouterLink,
    TranslatePipe,
    IconComponent,
    LanguageSwitcherComponent,
    RevealDirective,
  ],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  protected readonly brand = BRAND;
  protected readonly links = NAV_LINKS;
  protected readonly year = new Date().getFullYear();

  protected toTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
