import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

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
    plugins: [react(), tailwindcss()],
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
