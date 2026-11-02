import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@components/icon/icon.component';
import { NAV_LINKS } from '@components/header/header.component';
import { RevealDirective } from '@directives/reveal.directive';
import { BRAND } from '@/data/portfolio.data';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, IconComponent, RevealDirective],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  protected readonly brand = BRAND;
  protected readonly links = NAV_LINKS;
  protected readonly year = new Date().getFullYear();
}
