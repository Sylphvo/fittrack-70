export type TabKey = 'today' | 'meals' | 'ai' | 'workout' | 'roadmap';

export interface FoodScanResult {
  dishName: string;
  estimatedKcal: number;
  estimatedProtein: number;
  hasStarch: boolean;
  verdict: 'an_toan' | 'can_nhac' | 'nen_tranh';
  advice: string;
  isDemo?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  imageUri?: string;
  scanResult?: FoodScanResult;
  addedToLog?: boolean;
  timestamp: string;
}

export interface MealPreset {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  category: 'Đồ uống' | 'Bữa sáng' | 'Bữa chính' | 'Bữa phụ' | 'Điện giải';
  slot: string;
}

export interface MealLogEntry {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  timestamp: string;
  presetId?: string;
}

export interface WorkoutItem {
  id: string;
  time: string;
  title: string;
  detail: string;
  durationMin: number;
  estimatedKcal: number;
  hasTimer?: boolean;
}

export interface DailyRecord {
  dateKey: string; // YYYY-MM-DD
  weightKg: number | null;
  meals: MealLogEntry[];
  waterMl: number;
  completedWorkouts: string[];
  cardioElapsedSec: number;
  isClosedOut: boolean;
  closedOutAt?: string;
}

export interface FitTrackState {
  currentWeight: number;
  records: Record<string, DailyRecord>;
}
