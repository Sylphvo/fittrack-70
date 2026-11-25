import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FITTRACK_CONFIG,
  HOME_WORKOUT_LIBRARY,
  SEEDED_DAILY_LOGS,
  ZERO_STARCH_PRESETS,
} from '../config/fittrack';
import {
  DailyRecord,
  DailyWorkoutLog,
  FitTrackState,
  GoogleUser,
  HomeWorkoutTemplate,
  MealLogEntry,
  MealPreset,
} from '../types/fittrack';

const LEGACY_STORAGE_KEY = '@fittrack70/state_v1';

function getStorageKey(user: GoogleUser | null): string {
  if (!user?.email) return '@fittrack70/state_v2_guest';
  return `@fittrack70/state_v2_${user.email.toLowerCase()}`;
}

export function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTimeStamp(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function createEmptyDay(dateKey: string): DailyRecord {
  return {
    dateKey,
    weightKg: null,
    meals: [],
    waterMl: 0,
    workouts: [],
    cardioElapsedSec: 0,
    isClosedOut: false,
  };
}

export function calculateBurnedKcal(record: DailyRecord): number {
  const workoutBurn = (record.workouts ?? []).reduce(
    (sum, w) => (w.done ? sum + (w.estimatedKcal || 0) : sum),
    0
  );
  // Add live cardio timer burn if cardio item isn't already checked
  const hasCardioChecked = (record.workouts ?? []).some(
    (w) => w.done && (w.unit === 'phút' || w.title.toLowerCase().includes('cardio'))
  );
  const timerBurn = hasCardioChecked
    ? 0
    : Math.round((record.cardioElapsedSec / FITTRACK_CONFIG.CARDIO_TOTAL_SECONDS) * 400);
  return workoutBurn + timerBurn;
}

function normalizeLegacyState(rawObj: unknown): FitTrackState | null {
  if (!rawObj || typeof rawObj !== 'object') return null;
  const obj = rawObj as Record<string, unknown>;
  if (typeof obj.currentWeight !== 'number' || !obj.records || typeof obj.records !== 'object') {
    return null;
  }
  const recordsIn = obj.records as Record<string, Record<string, unknown>>;
  const recordsOut: Record<string, DailyRecord> = {};
  let earliest = getTodayKey();

  for (const [k, rec] of Object.entries(recordsIn)) {
    if (k < earliest) earliest = k;
    const existingWorkouts = Array.isArray(rec.workouts)
      ? (rec.workouts as DailyWorkoutLog[])
      : Array.isArray(rec.customWorkouts)
        ? (rec.customWorkouts as { id: string; title: string; reps: number; done: boolean }[]).map(
            (w) => ({
              id: w.id,
              title: w.title,
              reps: w.reps,
              unit: 'cái' as const,
              estimatedKcal: Math.max(20, Math.round(w.reps * 1.6)),
              done: w.done,
              source: 'app' as const,
            })
          )
        : [];
    recordsOut[k] = {
      dateKey: k,
      weightKg: typeof rec.weightKg === 'number' ? rec.weightKg : null,
      meals: Array.isArray(rec.meals) ? (rec.meals as MealLogEntry[]) : [],
      waterMl: typeof rec.waterMl === 'number' ? rec.waterMl : 0,
      workouts: existingWorkouts,
      cardioElapsedSec: typeof rec.cardioElapsedSec === 'number' ? rec.cardioElapsedSec : 0,
      isClosedOut: Boolean(rec.isClosedOut),
      closedOutAt: typeof rec.closedOutAt === 'string' ? rec.closedOutAt : undefined,
    };
  }

  return {
    startDate: typeof obj.startDate === 'string' ? obj.startDate : earliest,
    currentWeight: obj.currentWeight,
    records: recordsOut,
    appliedSeeds: Array.isArray(obj.appliedSeeds) ? (obj.appliedSeeds as string[]) : [],
  };
}

function applySeeds(base: FitTrackState): { state: FitTrackState; changed: boolean } {
  const applied = new Set(base.appliedSeeds ?? []);
  let changed = false;
  let nextWeight = base.currentWeight;
  let nextStartDate = base.startDate;
  const nextRecords = { ...base.records };

  for (const seed of SEEDED_DAILY_LOGS) {
    if (!applied.has(seed.seedId)) {
      const existing = nextRecords[seed.record.dateKey];
      nextRecords[seed.record.dateKey] = {
        ...seed.record,
        waterMl: existing?.waterMl || seed.record.waterMl,
      };
      if (seed.record.weightKg !== null) {
        nextWeight = seed.record.weightKg;
      }
      if (!nextStartDate || seed.record.dateKey < nextStartDate) {
        nextStartDate = seed.record.dateKey;
      }
      applied.add(seed.seedId);
      changed = true;
    }
  }

  if (!changed) return { state: base, changed: false };
  return {
    state: {
      startDate: nextStartDate || getTodayKey(),
      currentWeight: nextWeight,
      records: nextRecords,
      appliedSeeds: Array.from(applied),
    },
    changed: true,
  };
}

const DEFAULT_STATE: FitTrackState = applySeeds({
  startDate: '2026-11-25',
  currentWeight: FITTRACK_CONFIG.START_WEIGHT,
  records: {},
  appliedSeeds: [],
}).state;

export interface TrajectoryPoint {
  dateKey: string;
  weightKg: number;
  isActual: boolean;
  kcalIn: number;
  kcalBurned: number;
}

function enumerateDates(startKey: string, endKey: string): string[] {
  const result: string[] = [];
  const start = new Date(`${startKey}T00:00:00`);
  const end = new Date(`${endKey}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return [endKey];
  }
  const cursor = new Date(start);
  let guard = 0;
  while (cursor <= end && guard < 365) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    result.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return result;
}

export function useFitTrackStore(user: GoogleUser | null) {
  const [state, setState] = useState<FitTrackState>(DEFAULT_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const todayKey = getTodayKey();
  const storageKey = getStorageKey(user);

  useEffect(() => {
    let mounted = true;
    setIsLoaded(false);
    (async () => {
      try {
        let raw = await AsyncStorage.getItem(storageKey);
        if (!raw) {
          // Migrate guest or legacy v1 data seamlessly on first load
          raw =
            (await AsyncStorage.getItem('@fittrack70/state_v2_guest')) ||
            (await AsyncStorage.getItem(LEGACY_STORAGE_KEY));
        }
        if (raw && mounted) {
          const normalized = normalizeLegacyState(JSON.parse(raw));
          if (normalized) {
            const merged = applySeeds(normalized);
            setState(merged.state);
            AsyncStorage.setItem(storageKey, JSON.stringify(merged.state)).catch(() => {});
          } else {
            setState(DEFAULT_STATE);
          }
        } else if (mounted) {
          setState(DEFAULT_STATE);
          AsyncStorage.setItem(storageKey, JSON.stringify(DEFAULT_STATE)).catch(() => {});
        }
      } catch {
        if (mounted) setState(DEFAULT_STATE);
      } finally {
        if (mounted) setIsLoaded(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [storageKey]);

  const persist = useCallback(
    (updater: (prev: FitTrackState) => FitTrackState) => {
      setState((prev) => {
        const next = updater(prev);
        AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [storageKey]
  );

  const todayRecord: DailyRecord = useMemo(() => {
    return state.records[todayKey] ?? createEmptyDay(todayKey);
  }, [state.records, todayKey]);

  const totals = useMemo(() => {
    const kcal = todayRecord.meals.reduce((sum, item) => sum + item.kcal, 0);
    const protein = todayRecord.meals.reduce((sum, item) => sum + item.protein, 0);
    const burnedKcal = calculateBurnedKcal(todayRecord);
    const remainingKcal = FITTRACK_CONFIG.TARGET_KCAL - kcal;
    const isInSafeZone = kcal <= FITTRACK_CONFIG.TARGET_KCAL;
    const isOverHardCeiling = kcal > FITTRACK_CONFIG.SAFE_KCAL_MAX;
    const totalReps = (todayRecord.workouts ?? []).reduce(
      (sum, w) => (w.done && w.unit !== 'phút' ? sum + w.reps : sum),
      0
    );
    const completedCount = (todayRecord.workouts ?? []).filter((w) => w.done).length;
    return {
      kcal,
      protein,
      burnedKcal,
      waterMl: todayRecord.waterMl,
      remainingKcal,
      isInSafeZone,
      isOverHardCeiling,
      totalReps,
      completedCount,
      totalWorkouts: (todayRecord.workouts ?? []).length,
    };
  }, [todayRecord]);

  const setMorningWeight = useCallback(
    (weightKg: number) => {
      if (!Number.isFinite(weightKg) || weightKg < 40 || weightKg > 200) return;
      const rounded = Math.round(weightKg * 10) / 10;
      persist((prev) => {
        const current = prev.records[todayKey] ?? createEmptyDay(todayKey);
        return {
          ...prev,
          currentWeight: rounded,
          records: {
            ...prev.records,
            [todayKey]: { ...current, weightKg: rounded },
          },
        };
      });
    },
    [persist, todayKey]
  );

  const addMealsBatch = useCallback(
    (
      items: {
        name: string;
        kcal: number;
        protein: number;
        source?: 'ai_photo' | 'app_menu' | 'manual';
        presetId?: string;
      }[]
    ) => {
      if (items.length === 0) return;
      const ts = getTimeStamp();
      const entries: MealLogEntry[] = items.map((meal, idx) => ({
        id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        name: meal.name.trim(),
        kcal: Math.max(0, Math.round(meal.kcal)),
        protein: Math.max(0, Math.round(meal.protein)),
        timestamp: ts,
        source: meal.source,
        presetId: meal.presetId,
      }));
      persist((prev) => {
        const current = prev.records[todayKey] ?? createEmptyDay(todayKey);
        return {
          ...prev,
          records: {
            ...prev.records,
            [todayKey]: {
              ...current,
              meals: [...entries, ...current.meals],
            },
          },
        };
      });
    },
    [persist, todayKey]
  );

  const addPresetMeal = useCallback(
    (preset: MealPreset) => {
      addMealsBatch([
        {
          name: preset.name,
          kcal: preset.kcal,
          protein: preset.protein,
          source: 'app_menu',
          presetId: preset.id,
        },
      ]);
    },
    [addMealsBatch]
  );

  const addMorningCombo = useCallback(() => {
    const eggs = ZERO_STARCH_PRESETS.find((p) => p.id === 'preset-eggs-3');
    const coffee = ZERO_STARCH_PRESETS.find((p) => p.id === 'preset-americano');
    const ts = getTimeStamp();
    persist((prev) => {
      const current = prev.records[todayKey] ?? createEmptyDay(todayKey);
      const added: MealLogEntry[] = [];
      if (eggs) {
        added.push({
          id: `${Date.now()}-eggs`,
          name: eggs.name,
          kcal: eggs.kcal,
          protein: eggs.protein,
          timestamp: ts,
          source: 'app_menu',
          presetId: eggs.id,
        });
      }
      if (coffee) {
        added.push({
          id: `${Date.now()}-coffee`,
          name: coffee.name,
          kcal: coffee.kcal,
          protein: coffee.protein,
          timestamp: ts,
          source: 'app_menu',
          presetId: coffee.id,
        });
      }
      return {
        ...prev,
        records: {
          ...prev.records,
          [todayKey]: {
            ...current,
            meals: [...added, ...current.meals],
            waterMl: Math.min(6000, current.waterMl + 500),
          },
        },
      };
    });
  }, [persist, todayKey]);

  const removeMeal = useCallback(
    (entryId: string) => {
      persist((prev) => {
        const current = prev.records[todayKey] ?? createEmptyDay(todayKey);
        return {
          ...prev,
          records: {
            ...prev.records,
            [todayKey]: {
              ...current,
              meals: current.meals.filter((m) => m.id !== entryId),
            },
          },
        };
      });
    },
    [persist, todayKey]
  );

  const adjustWater = useCallback(
    (deltaMl: number) => {
      persist((prev) => {
        const current = prev.records[todayKey] ?? createEmptyDay(todayKey);
        const nextWater = Math.max(0, Math.min(6000, current.waterMl + deltaMl));
        return {
          ...prev,
          records: {
            ...prev.records,
            [todayKey]: { ...current, waterMl: nextWater },
          },
        };
      });
    },
    [persist, todayKey]
  );

  const toggleWorkoutItem = useCallback(
    (workoutId: string) => {
      persist((prev) => {
        const current = prev.records[todayKey] ?? createEmptyDay(todayKey);
        const nextList = (current.workouts ?? []).map((w) =>
          w.id === workoutId ? { ...w, done: !w.done } : w
        );
        return {
          ...prev,
          records: {
            ...prev.records,
            [todayKey]: { ...current, workouts: nextList },
          },
        };
      });
    },
    [persist, todayKey]
  );

  const addWorkoutFromTemplate = useCallback(
    (tpl: HomeWorkoutTemplate) => {
      persist((prev) => {
        const current = prev.records[todayKey] ?? createEmptyDay(todayKey);
        const nextItem: DailyWorkoutLog = {
          id: `${tpl.id}-${Date.now()}`,
          title: tpl.title,
          reps: tpl.defaultReps,
          unit: tpl.unit,
          estimatedKcal: tpl.estimatedKcal,
          done: false,
          source: 'app',
        };
        return {
          ...prev,
          records: {
            ...prev.records,
            [todayKey]: { ...current, workouts: [...(current.workouts ?? []), nextItem] },
          },
        };
      });
    },
    [persist, todayKey]
  );

  const addCustomWorkout = useCallback(
    (item: { title: string; reps: number; estimatedKcal: number; done?: boolean }) => {
      if (!item.title.trim()) return;
      persist((prev) => {
        const current = prev.records[todayKey] ?? createEmptyDay(todayKey);
        const nextItem: DailyWorkoutLog = {
          id: `custom-w-${Date.now()}`,
          title: item.title.trim(),
          reps: Math.max(1, Math.round(item.reps)),
          unit: 'cái',
          estimatedKcal: Math.max(5, Math.round(item.estimatedKcal)),
          done: item.done ?? true,
          source: 'custom',
        };
        return {
          ...prev,
          records: {
            ...prev.records,
            [todayKey]: { ...current, workouts: [...(current.workouts ?? []), nextItem] },
          },
        };
      });
    },
    [persist, todayKey]
  );

  const removeWorkoutItem = useCallback(
    (workoutId: string) => {
      persist((prev) => {
        const current = prev.records[todayKey] ?? createEmptyDay(todayKey);
        return {
          ...prev,
          records: {
            ...prev.records,
            [todayKey]: {
              ...current,
              workouts: (current.workouts ?? []).filter((w) => w.id !== workoutId),
            },
          },
        };
      });
    },
    [persist, todayKey]
  );

  const loadDefaultHomePlanToday = useCallback(() => {
    const starterIds = ['hw-body-saw', 'hw-wall-crunch', 'hw-wall-oblique'];
    const starter = HOME_WORKOUT_LIBRARY.filter((w) => starterIds.includes(w.id));
    persist((prev) => {
      const current = prev.records[todayKey] ?? createEmptyDay(todayKey);
      const added: DailyWorkoutLog[] = starter.map((tpl, idx) => ({
        id: `${tpl.id}-${Date.now()}-${idx}`,
        title: tpl.title,
        reps: tpl.defaultReps,
        unit: tpl.unit,
        estimatedKcal: tpl.estimatedKcal,
        done: false,
        source: 'app',
      }));
      return {
        ...prev,
        records: {
          ...prev.records,
          [todayKey]: { ...current, workouts: [...(current.workouts ?? []), ...added] },
        },
      };
    });
  }, [persist, todayKey]);

  const setCardioElapsed = useCallback(
    (seconds: number) => {
      persist((prev) => {
        const current = prev.records[todayKey] ?? createEmptyDay(todayKey);
        return {
          ...prev,
          records: {
            ...prev.records,
            [todayKey]: { ...current, cardioElapsedSec: seconds },
          },
        };
      });
    },
    [persist, todayKey]
  );

  const toggleCloseOutDay = useCallback(() => {
    persist((prev) => {
      const current = prev.records[todayKey] ?? createEmptyDay(todayKey);
      const nextClosed = !current.isClosedOut;
      return {
        ...prev,
        records: {
          ...prev.records,
          [todayKey]: {
            ...current,
            isClosedOut: nextClosed,
            closedOutAt: nextClosed ? getTimeStamp() : undefined,
          },
        },
      };
    });
  }, [persist, todayKey]);

  const importDailyJson = useCallback(
    (rawJson: string): { ok: boolean; message: string } => {
      try {
        const parsed = JSON.parse(rawJson.trim());
        const dateKey =
          typeof parsed.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
            ? parsed.date
            : todayKey;
        const parsedWeight =
          parsed.weight !== undefined && parsed.weight !== null
            ? parseFloat(String(parsed.weight).replace(',', '.'))
            : null;
        const validWeight =
          parsedWeight !== null && Number.isFinite(parsedWeight) && parsedWeight >= 40 && parsedWeight <= 200
            ? Math.round(parsedWeight * 10) / 10
            : null;

        const ts = getTimeStamp();
        const meals: MealLogEntry[] = Array.isArray(parsed.foods)
          ? parsed.foods.map((f: { name?: string; kcal?: number; protein?: number }, idx: number) => ({
              id: `imp-${Date.now()}-${idx}`,
              name: String(f.name || 'Món ăn'),
              kcal: Math.max(0, Math.round(Number(f.kcal) || 0)),
              protein: Math.max(0, Math.round(Number(f.protein) || 0)),
              timestamp: ts,
              source: 'ai_photo',
            }))
          : [];

        const workouts: DailyWorkoutLog[] = Array.isArray(parsed.workouts)
          ? parsed.workouts.map(
              (w: { title?: string; reps?: number; done?: boolean; estimatedKcal?: number }, idx: number) => {
                const reps = Math.max(0, Math.round(Number(w.reps) || 0));
                return {
                  id: `imp-w-${Date.now()}-${idx}`,
                  title: String(w.title || 'Bài tập'),
                  reps,
                  unit: 'cái' as const,
                  estimatedKcal:
                    typeof w.estimatedKcal === 'number'
                      ? Math.round(w.estimatedKcal)
                      : Math.max(20, Math.round(reps * 1.6)),
                  done: w.done !== false,
                  source: 'custom' as const,
                };
              }
            )
          : [];

        persist((prev) => {
          const existing = prev.records[dateKey] ?? createEmptyDay(dateKey);
          const nextStart = !prev.startDate || dateKey < prev.startDate ? dateKey : prev.startDate;
          return {
            ...prev,
            startDate: nextStart,
            currentWeight: validWeight ?? prev.currentWeight,
            records: {
              ...prev.records,
              [dateKey]: {
                ...existing,
                dateKey,
                weightKg: validWeight ?? existing.weightKg,
                meals: meals.length > 0 ? meals : existing.meals,
                workouts: workouts.length > 0 ? workouts : existing.workouts,
              },
            },
          };
        });

        return {
          ok: true,
          message: `Đã cập nhật ngày ${dateKey} (${meals.length} món, ${workouts.length} bài tập).`,
        };
      } catch {
        return { ok: false, message: 'JSON không hợp lệ. Vui lòng kiểm tra lại định dạng.' };
      }
    },
    [persist, todayKey]
  );

  const historyList = useMemo(() => {
    return Object.values(state.records).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [state.records]);

  // Weight trajectory from startDate to todayKey:
  // Anchors to actual logged weight whenever updated; otherwise projects smoothly from daily calorie balance!
  const weightTrajectory: TrajectoryPoint[] = useMemo(() => {
    const allKeys = Object.keys(state.records).sort();
    const firstKey = allKeys.length > 0 ? allKeys[0] : state.startDate || todayKey;
    const startKey = firstKey < todayKey ? firstKey : todayKey;
    const dates = enumerateDates(startKey, todayKey);

    let runningWeight: number = FITTRACK_CONFIG.START_WEIGHT;
    const points: TrajectoryPoint[] = [];

    for (const dKey of dates) {
      const rec = state.records[dKey];
      const kcalIn = rec ? rec.meals.reduce((s, m) => s + m.kcal, 0) : 0;
      const kcalBurned = rec ? calculateBurnedKcal(rec) : 0;

      if (rec && rec.weightKg !== null) {
        runningWeight = rec.weightKg;
        points.push({
          dateKey: dKey,
          weightKg: Math.round(runningWeight * 100) / 100,
          isActual: true,
          kcalIn,
          kcalBurned,
        });
      } else {
        // Estimate daily weight shift from calorie balance if any intake/burn was recorded
        if (kcalIn > 0 || kcalBurned > 0) {
          const netBalance = kcalIn - (FITTRACK_CONFIG.BASE_TDEE_KCAL + kcalBurned);
          runningWeight = Math.max(
            40,
            runningWeight + netBalance / FITTRACK_CONFIG.KCAL_PER_KG
          );
        }
        points.push({
          dateKey: dKey,
          weightKg: Math.round(runningWeight * 100) / 100,
          isActual: false,
          kcalIn,
          kcalBurned,
        });
      }
    }

    return points;
  }, [state.records, state.startDate, todayKey]);

  const streakDays = useMemo(() => {
    return historyList.filter((r) => {
      const dayKcal = r.meals.reduce((s, m) => s + m.kcal, 0);
      return dayKcal > 0 && dayKcal <= FITTRACK_CONFIG.SAFE_KCAL_MAX;
    }).length;
  }, [historyList]);

  return {
    isLoaded,
    todayKey,
    startDate: state.startDate,
    currentWeight: state.currentWeight,
    todayRecord,
    totals,
    historyList,
    weightTrajectory,
    streakDays,
    setMorningWeight,
    addMealsBatch,
    addPresetMeal,
    addMorningCombo,
    removeMeal,
    adjustWater,
    toggleWorkoutItem,
    addWorkoutFromTemplate,
    addCustomWorkout,
    removeWorkoutItem,
    loadDefaultHomePlanToday,
    setCardioElapsed,
    toggleCloseOutDay,
    importDailyJson,
  };
}
