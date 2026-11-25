import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FITTRACK_CONFIG, SEEDED_DAILY_LOGS, ZERO_STARCH_PRESETS } from '../config/fittrack';
import {
  CustomWorkoutLog,
  DailyRecord,
  FitTrackState,
  MealLogEntry,
  MealPreset,
} from '../types/fittrack';

const STORAGE_KEY = '@fittrack70/state_v1';

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
    completedWorkouts: [],
    customWorkouts: [],
    cardioElapsedSec: 0,
    isClosedOut: false,
  };
}

function applySeeds(base: FitTrackState): { state: FitTrackState; changed: boolean } {
  const applied = new Set(base.appliedSeeds ?? []);
  let changed = false;
  let nextWeight = base.currentWeight;
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
      applied.add(seed.seedId);
      changed = true;
    }
  }

  if (!changed) return { state: base, changed: false };
  return {
    state: {
      currentWeight: nextWeight,
      records: nextRecords,
      appliedSeeds: Array.from(applied),
    },
    changed: true,
  };
}

const INITIAL_STATE: FitTrackState = applySeeds({
  currentWeight: FITTRACK_CONFIG.START_WEIGHT,
  records: {},
  appliedSeeds: [],
}).state;

export function useFitTrackStore() {
  const [state, setState] = useState<FitTrackState>(INITIAL_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const todayKey = getTodayKey();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw && mounted) {
          const parsed = JSON.parse(raw) as FitTrackState;
          if (parsed && typeof parsed.currentWeight === 'number' && parsed.records) {
            const merged = applySeeds(parsed);
            setState(merged.state);
            if (merged.changed) {
              AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged.state)).catch(() => {});
            }
          }
        } else if (mounted) {
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_STATE)).catch(() => {});
        }
      } catch {
        // Fallback to initial state
      } finally {
        if (mounted) setIsLoaded(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const persist = useCallback((updater: (prev: FitTrackState) => FitTrackState) => {
    setState((prev) => {
      const next = updater(prev);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const todayRecord: DailyRecord = useMemo(() => {
    return state.records[todayKey] ?? createEmptyDay(todayKey);
  }, [state.records, todayKey]);

  const totals = useMemo(() => {
    const kcal = todayRecord.meals.reduce((sum, item) => sum + item.kcal, 0);
    const protein = todayRecord.meals.reduce((sum, item) => sum + item.protein, 0);
    const remainingKcal = FITTRACK_CONFIG.TARGET_KCAL - kcal;
    const isInSafeZone = kcal <= FITTRACK_CONFIG.TARGET_KCAL;
    const isOverHardCeiling = kcal > FITTRACK_CONFIG.SAFE_KCAL_MAX;
    const totalReps = (todayRecord.customWorkouts ?? []).reduce(
      (sum, w) => (w.done ? sum + w.reps : sum),
      0
    );
    return {
      kcal,
      protein,
      waterMl: todayRecord.waterMl,
      remainingKcal,
      isInSafeZone,
      isOverHardCeiling,
      totalReps,
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

  const addMeal = useCallback(
    (meal: { name: string; kcal: number; protein: number; presetId?: string }) => {
      const entry: MealLogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: meal.name.trim(),
        kcal: Math.max(0, Math.round(meal.kcal)),
        protein: Math.max(0, Math.round(meal.protein)),
        timestamp: getTimeStamp(),
        presetId: meal.presetId,
      };
      persist((prev) => {
        const current = prev.records[todayKey] ?? createEmptyDay(todayKey);
        return {
          ...prev,
          records: {
            ...prev.records,
            [todayKey]: {
              ...current,
              meals: [entry, ...current.meals],
            },
          },
        };
      });
    },
    [persist, todayKey]
  );

  const addPresetMeal = useCallback(
    (preset: MealPreset) => {
      addMeal({
        name: preset.name,
        kcal: preset.kcal,
        protein: preset.protein,
        presetId: preset.id,
      });
    },
    [addMeal]
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

  const toggleWorkout = useCallback(
    (workoutId: string) => {
      persist((prev) => {
        const current = prev.records[todayKey] ?? createEmptyDay(todayKey);
        const exists = current.completedWorkouts.includes(workoutId);
        const nextList = exists
          ? current.completedWorkouts.filter((id) => id !== workoutId)
          : [...current.completedWorkouts, workoutId];
        return {
          ...prev,
          records: {
            ...prev.records,
            [todayKey]: { ...current, completedWorkouts: nextList },
          },
        };
      });
    },
    [persist, todayKey]
  );

  const toggleCustomWorkout = useCallback(
    (workoutId: string) => {
      persist((prev) => {
        const current = prev.records[todayKey] ?? createEmptyDay(todayKey);
        const nextCustom = (current.customWorkouts ?? []).map((w) =>
          w.id === workoutId ? { ...w, done: !w.done } : w
        );
        return {
          ...prev,
          records: {
            ...prev.records,
            [todayKey]: { ...current, customWorkouts: nextCustom },
          },
        };
      });
    },
    [persist, todayKey]
  );

  const setCardioElapsed = useCallback(
    (seconds: number) => {
      persist((prev) => {
        const current = prev.records[todayKey] ?? createEmptyDay(todayKey);
        const autoComplete =
          seconds >= FITTRACK_CONFIG.CARDIO_TOTAL_SECONDS &&
          !current.completedWorkouts.includes('wk-interval-cardio')
            ? [...current.completedWorkouts, 'wk-interval-cardio']
            : current.completedWorkouts;
        return {
          ...prev,
          records: {
            ...prev.records,
            [todayKey]: {
              ...current,
              cardioElapsedSec: seconds,
              completedWorkouts: autoComplete,
            },
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
            }))
          : [];

        const customWorkouts: CustomWorkoutLog[] = Array.isArray(parsed.workouts)
          ? parsed.workouts.map(
              (w: { title?: string; reps?: number; done?: boolean }, idx: number) => ({
                id: `imp-w-${Date.now()}-${idx}`,
                title: String(w.title || 'Bài tập'),
                reps: Math.max(0, Math.round(Number(w.reps) || 0)),
                done: w.done !== false,
              })
            )
          : [];

        persist((prev) => {
          const existing = prev.records[dateKey] ?? createEmptyDay(dateKey);
          return {
            ...prev,
            currentWeight: validWeight ?? prev.currentWeight,
            records: {
              ...prev.records,
              [dateKey]: {
                ...existing,
                dateKey,
                weightKg: validWeight ?? existing.weightKg,
                meals: meals.length > 0 ? meals : existing.meals,
                customWorkouts:
                  customWorkouts.length > 0 ? customWorkouts : existing.customWorkouts,
              },
            },
          };
        });

        return {
          ok: true,
          message: `Đã cập nhật ngày ${dateKey} (${meals.length} món, ${customWorkouts.length} bài tập).`,
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

  const weightHistory = useMemo(() => {
    const entries = Object.values(state.records)
      .filter((r) => r.weightKg !== null)
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      .map((r) => ({ dateKey: r.dateKey, weightKg: r.weightKg as number }));

    if (entries.length === 0) {
      return [{ dateKey: todayKey, weightKg: state.currentWeight }];
    }
    return entries;
  }, [state.records, state.currentWeight, todayKey]);

  const streakDays = useMemo(() => {
    return historyList.filter((r) => {
      const dayKcal = r.meals.reduce((s, m) => s + m.kcal, 0);
      return r.isClosedOut && dayKcal <= FITTRACK_CONFIG.SAFE_KCAL_MAX;
    }).length;
  }, [historyList]);

  return {
    isLoaded,
    todayKey,
    currentWeight: state.currentWeight,
    todayRecord,
    totals,
    historyList,
    weightHistory,
    streakDays,
    setMorningWeight,
    addMeal,
    addPresetMeal,
    addMorningCombo,
    removeMeal,
    adjustWater,
    toggleWorkout,
    toggleCustomWorkout,
    setCardioElapsed,
    toggleCloseOutDay,
    importDailyJson,
  };
}
