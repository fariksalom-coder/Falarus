import fs from 'node:fs';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import {defineConfig, loadEnv} from 'vite';

const SITE_TITLE =
  'FalaRus — rus tili, patent, ВНЖ, fuqarolik RF | online kurs';
const SITE_DESCRIPTION =
  'FalaRus: rus tili kursi — patent imtihoni, ВНЖ, РВП va RF fuqaroligi uchun tayyorlov. Rus tili A1–B2, lug\'at, testlar. O\'zbekiston va migrantlar uchun. Rus tili patent va ВНЖ savollari. Rus tilini noldan o\'rganish, ruscha gapirish. Русский язык для патента, ВНЖ, гражданства РФ и РВП — онлайн-курс для узбеков.';
const OG_IMAGE_URL = 'https://www.falarus.uz/icons/icon-512.png';

function escapeHtmlAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/\r?\n/g, ' ');
}

/** Injects seo-keywords.txt into index.html meta + JSON-LD at build/dev time. */
function seoInjectPlugin(): Plugin {
  const kwPath = path.resolve(__dirname, 'seo-keywords.txt');

  return {
    name: 'seo-inject',
    transformIndexHtml(html) {
      let keywords = '';
      try {
        if (fs.existsSync(kwPath)) {
          keywords = fs.readFileSync(kwPath, 'utf-8').trim().replace(/\s+/g, ' ');
        }
      } catch {
        /* ignore */
      }

      const orgLd = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'FalaRus',
        url: 'https://www.falarus.uz',
        logo: 'https://www.falarus.uz/icons/icon-512.png',
        description: SITE_DESCRIPTION,
        sameAs: ['https://www.instagram.com/falarus'],
      });

      const websiteLd = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'FalaRus',
        url: 'https://www.falarus.uz',
        description: SITE_DESCRIPTION,
        ...(keywords ? { keywords } : {}),
      });

      return html
        .replace(/__SEO_SITE_TITLE__/g, SITE_TITLE)
        .replace(/__SEO_SITE_TITLE_ESCAPED__/g, escapeHtmlAttr(SITE_TITLE))
        .replace(/__SEO_SITE_DESCRIPTION_ESCAPED__/g, escapeHtmlAttr(SITE_DESCRIPTION))
        .replace(/__SEO_META_KEYWORDS_ESCAPED__/g, escapeHtmlAttr(keywords))
        .replace(/__OG_IMAGE_ESCAPED__/g, escapeHtmlAttr(OG_IMAGE_URL))
        .replace(/__ORG_LD_JSON__/g, orgLd)
        .replace(/__WEBSITE_LD_JSON__/g, websiteLd);
    },
  };
}

/** Inlined when .env.production is missing on CI (Vercel). Must match Storage bucket layout: /courses/... */
const DEFAULT_PROD_COURSE_MEDIA_BASE =
  'https://nwwgwatiplergfcionyo.supabase.co/storage/v1/object/public/course-assets';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const vitePrefixed = loadEnv(mode, '.', 'VITE_');
  const courseMediaBase =
    (vitePrefixed.VITE_COURSE_MEDIA_BASE_URL || env.VITE_COURSE_MEDIA_BASE_URL || '').trim() ||
    (mode === 'production' ? DEFAULT_PROD_COURSE_MEDIA_BASE : '');

  return {
    plugins: [seoInjectPlugin(), react(), tailwindcss()],
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
              return 'react-vendor';
            }
            if (id.includes('node_modules/@supabase')) {
              return 'supabase-vendor';
            }
            if (id.includes('node_modules/lucide-react') || id.includes('node_modules/motion')) {
              return 'ui-vendor';
            }
            if (id.includes('/src/pages/admin/') || id.includes('/src/api/admin')) {
              return 'admin';
            }
            if (
              id.includes('/src/pages/Vocabulary') ||
              id.includes('/src/components/vocabulary/') ||
              id.includes('/src/api/vocabulary') ||
              id.includes('/src/state/vocabulary')
            ) {
              return 'vocabulary';
            }
            if (
              id.includes('/src/pages/LessonEleven') ||
              id.includes('/src/pages/LessonFourteen') ||
              id.includes('/src/pages/LessonFifteen')
            ) {
              return 'lessons-mid';
            }
            if (
              id.includes('/src/pages/LessonSeventeen') ||
              id.includes('/src/pages/LessonEighteen') ||
              id.includes('/src/pages/LessonNineteen') ||
              id.includes('/src/pages/LessonTwenty') ||
              id.includes('/src/pages/LessonTwentyOne') ||
              id.includes('/src/pages/LessonTwentyTwo') ||
              id.includes('/src/pages/LessonTwentyThree') ||
              id.includes('/src/pages/LessonTwentyFour') ||
              id.includes('/src/pages/GrammarLessonTaskPage')
            ) {
              return 'lessons-late';
            }
            if (
              id.includes('/src/pages/Lesson') ||
              id.includes('/src/pages/Greeting') ||
              id.includes('/src/pages/MatchingPairs') ||
              id.includes('/src/pages/SentenceBuilder')
            ) {
              return 'lessons-core';
            }
            return undefined;
          },
        },
      },
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.APP_URL': JSON.stringify(env.APP_URL),
      ...(courseMediaBase
        ? {'import.meta.env.VITE_COURSE_MEDIA_BASE_URL': JSON.stringify(courseMediaBase)}
        : {}),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
