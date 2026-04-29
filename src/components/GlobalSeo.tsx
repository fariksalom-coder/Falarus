import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { OG_IMAGE_URL, SITE_ORIGIN, clipTitle, clipDescription } from '../seo/constants';
import { isKnownAppRoute } from '../seo/knownRoutes';
import { resolveRouteSeo } from '../seo/resolveRouteSeo';

export function GlobalSeo() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const unknown = !isKnownAppRoute(pathname);
  const resolved = unknown
    ? {
        title: clipTitle('404 — sahifa topilmadi'),
        description: clipDescription(
          'Sahifa topilmadi. FalaRus bosh sahifasi yoki rus tili, patent va ВНЖ bo\'limlariga qaytishingiz mumkin.'
        ),
        noindex: true as boolean,
        ogType: 'website' as const,
        extraJsonLd: undefined as Record<string, unknown>[] | undefined,
      }
    : resolveRouteSeo(pathname, { authenticated: !!user });

  const canonicalPath = resolved.canonicalPath ?? pathname.split('?')[0];
  const canonicalUrl = `${SITE_ORIGIN}${canonicalPath}`;

  return (
    <Helmet prioritizeSeoTags>
      <html lang="uz" />
      <title>{resolved.title}</title>
      <meta name="description" content={resolved.description} />
      <meta
        name="robots"
        content={
          resolved.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'
        }
      />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:type" content={resolved.ogType ?? 'website'} />
      <meta property="og:site_name" content="FalaRus" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={resolved.title} />
      <meta property="og:description" content={resolved.description} />
      <meta property="og:image" content={OG_IMAGE_URL} />
      <meta property="og:image:width" content="512" />
      <meta property="og:image:height" content="512" />
      <meta property="og:locale" content="uz_UZ" />
      <meta property="og:locale:alternate" content="ru_RU" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={resolved.title} />
      <meta name="twitter:description" content={resolved.description} />
      <meta name="twitter:image" content={OG_IMAGE_URL} />
      {import.meta.env.VITE_GOOGLE_SITE_VERIFICATION ? (
        <meta
          name="google-site-verification"
          content={import.meta.env.VITE_GOOGLE_SITE_VERIFICATION}
        />
      ) : null}
      {import.meta.env.VITE_YANDEX_VERIFICATION ? (
        <meta name="yandex-verification" content={import.meta.env.VITE_YANDEX_VERIFICATION} />
      ) : null}
      {resolved.extraJsonLd?.map((obj, i) => (
        <script key={`seo-ld-${i}`} type="application/ld+json">
          {JSON.stringify(obj)}
        </script>
      ))}
    </Helmet>
  );
}
