import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@components/icon/icon.component';
import { RevealDirective } from '@directives/reveal.directive';
import { imageUrl } from '@/data/portfolio.data';

/** Image + description about the photographer. */
@Component({
  selector: 'app-about-section',
  imports: [RouterLink, TranslatePipe, IconComponent, RevealDirective],
  templateUrl: './about-section.component.html',
  styleUrl: './about-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutSectionComponent {
  protected readonly portrait = imageUrl('sg-portrait', 1000, 1300);
  protected readonly detail = imageUrl('sg-detail', 700, 900);
  protected readonly highlights = [
    'about.highlights.h1',
    'about.highlights.h2',
    'about.highlights.h3',
  ];
}
