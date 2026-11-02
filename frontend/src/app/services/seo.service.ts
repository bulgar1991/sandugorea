import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { OG_LOCALES, SITE_NAME, SITE_SHARE_IMAGE, SITE_URL } from '@/config/site';
import { SeoData } from '@models/seo.model';
import { DEFAULT_LANGUAGE } from './language.service';

/**
 * Sets the page title, description, canonical link, Open Graph and Twitter tags for the
 * current route (from its `data.seo`), and sets them again when the language changes.
 * The tags in src/index.html are the fallback before this runs.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);

  private current?: { seo: SeoData; path: string };

  constructor() {
    this.translate.onLangChange.subscribe(() => {
      if (this.current) this.apply(this.current.seo, this.current.path);
    });
  }

  /** `path` is the page's URL path, e.g. '/'. */
  apply(seo: SeoData, path: string): void {
    this.current = { seo, path };

    const lang = this.translate.getCurrentLang() ?? DEFAULT_LANGUAGE;
    const params = Object.fromEntries(
      Object.entries(seo.params ?? {}).map(([name, key]) => [name, this.text(key)]),
    );
    const title = this.text(seo.title, params);
    const description = this.text(seo.description ?? 'seo.home.description', params);
    // Path only - query strings and #fragments aren't separate pages.
    const cleanPath = path.split(/[?#]/)[0] || '/';
    const url = SITE_URL + cleanPath;

    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: 'index, follow, max-image-preview:large' });

    this.meta.updateTag({ property: 'og:type', content: seo.type ?? 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    const locale = OG_LOCALES[lang] ?? OG_LOCALES[DEFAULT_LANGUAGE];
    this.meta.updateTag({ property: 'og:locale', content: locale });
    // The other languages of the same page.
    this.meta
      .getTags("property='og:locale:alternate'")
      .forEach((tag) => this.meta.removeTagElement(tag));
    this.meta.addTags(
      Object.values(OG_LOCALES)
        .filter((other) => other !== locale)
        .map((other) => ({ property: 'og:locale:alternate', content: other })),
    );

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.applyImage(seo);

    this.setCanonical(url);

    // Extra per-route tags (e.g. robots: noindex) - these win over the defaults above.
    for (const tag of seo.metaTags ?? []) {
      const content = this.text(tag.content);
      if (tag.name) this.meta.updateTag({ name: tag.name, content });
      if (tag.property) this.meta.updateTag({ property: tag.property, content });
    }
  }

  private applyImage(seo: SeoData) {
    const image = seo.image ?? SITE_SHARE_IMAGE?.path;
    for (const sel of [
      "property='og:image'",
      "property='og:image:alt'",
      "property='og:image:type'",
      "property='og:image:width'",
      "property='og:image:height'",
      "name='twitter:image'",
      "name='twitter:image:alt'",
    ]) {
      this.meta.removeTag(sel);
    }
    if (!image) return;

    const imageUrl = `${SITE_URL}/${image}`;
    this.meta.updateTag({ property: 'og:image', content: imageUrl });
    this.meta.updateTag({ name: 'twitter:image', content: imageUrl });
    if (SITE_SHARE_IMAGE) {
      const alt = this.text(SITE_SHARE_IMAGE.alt);
      this.meta.updateTag({ property: 'og:image:alt', content: alt });
      this.meta.updateTag({ name: 'twitter:image:alt', content: alt });
    }
    // Size and type are only known for the default image.
    if (!seo.image && SITE_SHARE_IMAGE) {
      this.meta.updateTag({ property: 'og:image:type', content: SITE_SHARE_IMAGE.type });
      this.meta.updateTag({ property: 'og:image:width', content: String(SITE_SHARE_IMAGE.width) });
      this.meta.updateTag({
        property: 'og:image:height',
        content: String(SITE_SHARE_IMAGE.height),
      });
    }
  }

  private text(key: string, params?: Record<string, string>): string {
    return String(this.translate.instant(key, params));
  }

  private setCanonical(url: string): void {
    let link = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
