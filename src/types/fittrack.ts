export type TabKey = 'today' | 'workout' | 'roadmap';

export interface GoogleUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  provider: 'google_oauth' | 'google_local';
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
  source?: 'ai_photo' | 'app_menu' | 'manual';
  presetId?: string;
}

export interface HomeWorkoutTemplate {
  id: string;
  title: string;
  category: 'Bụng & Lõi' | 'Toàn thân' | 'Cardio tại nhà';
  defaultReps: number;
  unit: 'cái' | 'phút';
  estimatedKcal: number;
  detail: string;
}

export interface DailyWorkoutLog {
  id: string;
  title: string;
  reps: number;
  unit?: 'cái' | 'phút';
  estimatedKcal: number;
  done: boolean;
  source?: 'app' | 'custom';
}

export interface ScannedFoodItem {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  hasStarch: boolean;
  selected: boolean;
}

export interface FoodPhotoReview {
  items: ScannedFoodItem[];
  verdict: 'an_toan' | 'can_nhac' | 'nen_tranh';
  advice: string;
  isDemo?: boolean;
}

export interface DailyRecord {
  dateKey: string; // YYYY-MM-DD
  weightKg: number | null;
  meals: MealLogEntry[];
  waterMl: number;
  workouts: DailyWorkoutLog[];
  cardioElapsedSec: number;
  isClosedOut: boolean;
  closedOutAt?: string;
}

export interface FitTrackState {
  startDate: string;
  currentWeight: number;
  records: Record<string, DailyRecord>;
  appliedSeeds?: string[];
}
