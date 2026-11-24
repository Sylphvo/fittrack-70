import { MealPreset, WorkoutItem } from '../types/fittrack';

export const FITTRACK_CONFIG = {
  APP_NAME: 'FitTrack 70',
  MODE_LABEL: 'Zero-Starch Siết Mỡ',
  START_WEIGHT: 88.0,
  TARGET_WEIGHT: 70.0,
  TARGET_KCAL: 1450,
  SAFE_KCAL_MIN: 1350,
  SAFE_KCAL_MAX: 1500,
  TARGET_PROTEIN: 145,
  TARGET_WATER: 3000,
  WORKOUT_WINDOW: '18:15 – 19:15',
  SLEEP_TARGET: '22:30',
  CARDIO_TOTAL_SECONDS: 40 * 60, // 40 minutes
  CARDIO_WALK_SECONDS: 3 * 60,   // 3 min brisk walk
  CARDIO_RUN_SECONDS: 1 * 60,    // 1 min run / stair climb
} as const;

export const ZERO_STARCH_PRESETS: MealPreset[] = [
  {
    id: 'preset-americano',
    name: 'Americano đá nguyên chất (0 đường)',
    kcal: 15,
    protein: 0,
    category: 'Đồ uống',
    slot: '07:15 Sáng',
  },
  {
    id: 'preset-eggs-3',
    name: '3 Trứng gà luộc (2 nguyên + 1 lòng trắng)',
    kcal: 195,
    protein: 16,
    category: 'Bữa sáng',
    slot: '07:15 Sáng',
  },
  {
    id: 'preset-chicken-250',
    name: '250g Ức gà luộc/áp chảo không dầu + Rau',
    kcal: 480,
    protein: 62,
    category: 'Bữa chính',
    slot: '12:00 Trưa',
  },
  {
    id: 'preset-greek-yogurt',
    name: '1 Hũ sữa chua Hy Lạp không đường',
    kcal: 130,
    protein: 10,
    category: 'Bữa phụ',
    slot: '16:00 Chiều',
  },
  {
    id: 'preset-eggs-cha-lua',
    name: '4 Trứng luộc + 100g Chả lụa chay + Dưa leo',
    kcal: 480,
    protein: 55,
    category: 'Bữa chính',
    slot: '19:30 Tối',
  },
  {
    id: 'preset-electrolyte',
    name: 'Nước chanh muối loãng bù điện giải',
    kcal: 10,
    protein: 0,
    category: 'Điện giải',
    slot: 'Sau tập',
  },
];

export const EVENING_WORKOUT_PLAN: WorkoutItem[] = [
  {
    id: 'wk-ab-roller',
    time: '18:15',
    title: 'Đẩy con lăn 4 bánh',
    detail: '3 hiệp × 6–8 cái (siết cơ lõi, không võng lưng)',
    durationMin: 10,
    estimatedKcal: 60,
  },
  {
    id: 'wk-wall-crunch',
    time: '18:25',
    title: 'Gập bụng trên tường',
    detail: '3 hiệp × 20 cái (bụng trên - bụng bên - nâng hông)',
    durationMin: 10,
    estimatedKcal: 70,
  },
  {
    id: 'wk-interval-cardio',
    time: '18:35',
    title: 'Cardio đốt mỡ ngắt quãng',
    detail: '40 phút (3p đi bộ cực nhanh + 1p chạy bộ/leo cầu thang)',
    durationMin: 40,
    estimatedKcal: 400,
    hasTimer: true,
  },
];

export const DAILY_ROUTINE_STEPS = [
  { id: 'rt-weight', time: '06:30', label: 'Cân buổi sáng & ghi nhận' },
  { id: 'rt-breakfast', time: '07:15', label: '3 Trứng + Americano + 500ml nước' },
  { id: 'rt-workout', time: '18:15', label: 'Hoàn thành buổi tập 18h15–19h15' },
  { id: 'rt-closeout', time: '22:00', label: 'Kiểm tra Calo ≤ 1.450 & Chốt ngày' },
] as const;
