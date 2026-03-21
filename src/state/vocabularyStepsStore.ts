import { create } from 'zustand';
import type { WordGroupStepsState } from '../api/vocabulary';
import {
  fetchWordGroupStepsState,
  postStep1Result,
  postStep2Result,
} from '../api/vocabulary';

type StepsStateByGroup = Record<number, WordGroupStepsState>;

type Status = 'idle' | 'loading' | 'error';

const cacheKeyStepsState = (wordGroupId: number) => `vocab_steps_${wordGroupId}`;

interface VocabularyStepsStore {
  byGroup: StepsStateByGroup;
  statusByGroup: Record<number, Status>;
  errorByGroup: Record<number, string | null>;
  fetchSteps: (token: string | null, wordGroupId: number) => Promise<void>;
  submitStep1: (
    token: string | null,
    wordGroupId: number,
    known: number,
    unknown: number
  ) => Promise<void>;
  submitStep2: (
    token: string | null,
    wordGroupId: number,
    correct: number,
    incorrect: number,
    totalQuestions?: number
  ) => Promise<void>;
}

export const useVocabularyStepsStore = create<VocabularyStepsStore>((set, get) => ({
  byGroup: {},
  statusByGroup: {},
  errorByGroup: {},

  async fetchSteps(token, wordGroupId) {
    if (!token || !wordGroupId) return;

    // 1) Quick hydrate from sessionStorage to prevent UI flicker.
    // 2) Then always refetch from backend for freshness.
    if (typeof window !== 'undefined' && 'sessionStorage' in window) {
      try {
        const raw = sessionStorage.getItem(cacheKeyStepsState(wordGroupId));
        if (raw) {
          const parsed = JSON.parse(raw) as WordGroupStepsState;
          set((state) => ({
            byGroup: { ...state.byGroup, [wordGroupId]: parsed },
            statusByGroup: { ...state.statusByGroup, [wordGroupId]: 'loading' },
            errorByGroup: { ...state.errorByGroup, [wordGroupId]: null },
          }));
        } else {
          set((state) => ({
            statusByGroup: { ...state.statusByGroup, [wordGroupId]: 'loading' },
            errorByGroup: { ...state.errorByGroup, [wordGroupId]: null },
          }));
        }
      } catch {
        set((state) => ({
          statusByGroup: { ...state.statusByGroup, [wordGroupId]: 'loading' },
          errorByGroup: { ...state.errorByGroup, [wordGroupId]: null },
        }));
      }
    } else {
      set((state) => ({
        statusByGroup: { ...state.statusByGroup, [wordGroupId]: 'loading' },
        errorByGroup: { ...state.errorByGroup, [wordGroupId]: null },
      }));
    }
    try {
      const data = await fetchWordGroupStepsState(token, wordGroupId);
      if (!data) throw new Error('Failed to load steps state');
      set((state) => ({
        byGroup: { ...state.byGroup, [wordGroupId]: data },
        statusByGroup: { ...state.statusByGroup, [wordGroupId]: 'idle' },
      }));
      // Persist for reload UX
      if (typeof window !== 'undefined' && 'sessionStorage' in window) {
        try {
          sessionStorage.setItem(cacheKeyStepsState(wordGroupId), JSON.stringify(data));
        } catch {
          // ignore cache write failures
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Xatolik yuz berdi';
      set((state) => ({
        statusByGroup: { ...state.statusByGroup, [wordGroupId]: 'error' },
        errorByGroup: { ...state.errorByGroup, [wordGroupId]: msg },
      }));
    }
  },

  async submitStep1(token, wordGroupId, known, unknown) {
    if (!token || !wordGroupId) return;
    set((state) => ({
      statusByGroup: { ...state.statusByGroup, [wordGroupId]: 'loading' },
      errorByGroup: { ...state.errorByGroup, [wordGroupId]: null },
    }));
    try {
      const data = await postStep1Result(token, wordGroupId, known, unknown);
      if (!data) throw new Error('Failed to save step1 result');
      set((state) => ({
        byGroup: { ...state.byGroup, [wordGroupId]: data },
        statusByGroup: { ...state.statusByGroup, [wordGroupId]: 'idle' },
      }));
      if (typeof window !== 'undefined' && 'sessionStorage' in window) {
        try {
          sessionStorage.setItem(cacheKeyStepsState(wordGroupId), JSON.stringify(data));
        } catch {
          // ignore
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Xatolik yuz berdi';
      set((state) => ({
        statusByGroup: { ...state.statusByGroup, [wordGroupId]: 'error' },
        errorByGroup: { ...state.errorByGroup, [wordGroupId]: msg },
      }));
      throw e instanceof Error ? e : new Error(msg);
    }
  },

  async submitStep2(token, wordGroupId, correct, incorrect, totalQuestions) {
    if (!token || !wordGroupId) return;
    set((state) => ({
      statusByGroup: { ...state.statusByGroup, [wordGroupId]: 'loading' },
      errorByGroup: { ...state.errorByGroup, [wordGroupId]: null },
    }));
    try {
      const data = await postStep2Result(token, wordGroupId, correct, incorrect, totalQuestions);
      if (!data) throw new Error('Failed to save step2 result');
      set((state) => ({
        byGroup: { ...state.byGroup, [wordGroupId]: data },
        statusByGroup: { ...state.statusByGroup, [wordGroupId]: 'idle' },
      }));
      if (typeof window !== 'undefined' && 'sessionStorage' in window) {
        try {
          sessionStorage.setItem(cacheKeyStepsState(wordGroupId), JSON.stringify(data));
        } catch {
          // ignore
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Xatolik yuz berdi';
      set((state) => ({
        statusByGroup: { ...state.statusByGroup, [wordGroupId]: 'error' },
        errorByGroup: { ...state.errorByGroup, [wordGroupId]: msg },
      }));
      throw e instanceof Error ? e : new Error(msg);
    }
  },
}));

