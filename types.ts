export enum AppStep {
  WELCOME = 'WELCOME',
  QUESTION = 'QUESTION',
  SPREAD_SELECT = 'SPREAD_SELECT',
  SHUFFLE_AND_DRAW = 'SHUFFLE_AND_DRAW',
  REVEAL = 'REVEAL',
  READING = 'READING',
  HISTORY = 'HISTORY'
}

export enum DrawMode {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL'
}

export enum Tone {
  GENTLE = 'GENTLE',    // 温暖鼓励
  RATIONAL = 'RATIONAL', // 直接理性
  SPIRITUAL = 'SPIRITUAL' // 灵性指引
}

export interface TarotCard {
  id: string;
  name: string;
  suit?: 'Wands' | 'Cups' | 'Swords' | 'Pentacles' | 'Major';
  number?: number;
  imageSeed: number; // For placeholder generation
}

export interface DrawnCard extends TarotCard {
  isReversed: boolean;
  positionIndex: number;
  positionName: string;
}

export interface Spread {
  id: string;
  name: string;
  description: string;
  cardCount: number;
  positions: string[]; // Meanings of each position
}

export interface ReadingResult {
  id: string;
  timestamp: number;
  question: string;
  spreadId: string;
  cards: DrawnCard[];
  interpretation: InterpretationResponse | null;
  tone: Tone;
}

export interface InterpretationResponse {
  summary: string;
  cardAnalysis: {
    cardName: string;
    position: string;
    meaning: string;
  }[];
  advice: string;
}

export interface UserSettings {
  tone: Tone;
  showMeanings: boolean;
}