export interface DialogueStep {
  partnerRu: string; partnerUz: string; correct: string; correctUz: string; wrong: string[];
}
export interface Situation {
  id: string; titleRu: string; titleUz: string; partnerRu: string; partnerUz: string;
  icon: string; avatar: string; steps: DialogueStep[]; closing: null;
}
export interface Topic {
  id: string; titleRu: string; titleUz: string; scene: string; color: string; colorSoft: string;
  situations: Situation[];
}
export type SituationSummary = Omit<Situation, 'steps'> & { steps: {}[] };
export type SituationCatalog = {topics: (Omit<Topic, 'situations'> & { situations: SituationSummary[] })[]; completed: string[]; stars: number};
export interface DialogueRound {
  id: string; situationId: string; position: number; total: number; mistakes: number; finished: boolean;
  stars: number; earned: number;
  messages: {from: 'partner' | 'me'; ru: string; uz?: string}[];
  question: {partnerRu: string; partnerUz: string; options: {id: string; text: string}[]} | null;
}
export interface DialogueAnswer {correct: boolean; round: DialogueRound; completed?: string[]; totalStars?: number}
