import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { FITTRACK_CONFIG, HOME_WORKOUT_LIBRARY } from '../config/fittrack';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SPACING, ThemePalette, TYPO } from '../theme/tokens';
import { DailyWorkoutLog, HomeWorkoutTemplate } from '../types/fittrack';

interface WorkoutScreenProps {
  workouts: DailyWorkoutLog[];
  burnedKcal: number;
  cardioElapsedSec: number;
  onToggleWorkout: (id: string) => void;
  onAddTemplate: (tpl: HomeWorkoutTemplate) => void;
  onAddCustomWorkout: (item: { title: string; reps: number; estimatedKcal: number }) => void;
  onRemoveWorkout: (id: string) => void;
  onUpdateCardioElapsed: (seconds: number) => void;
}

function formatClock(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function WorkoutScreen({
  workouts,
  burnedKcal,
  cardioElapsedSec,
  onToggleWorkout,
  onAddTemplate,
  onAddCustomWorkout,
  onRemoveWorkout,
  onUpdateCardioElapsed,
}: WorkoutScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [modeTab, setModeTab] = useState<'app' | 'custom'>('app');
  const [customTitle, setCustomTitle] = useState('');
  const [customReps, setCustomReps] = useState('');
  const [customKcal, setCustomKcal] = useState('');

  const [elapsed, setElapsed] = useState(cardioElapsedSec);
  const [isRunning, setIsRunning] = useState(false);
  const prevPhaseRef = useRef<'walk' | 'run'>('walk');

  const totalSec = FITTRACK_CONFIG.CARDIO_TOTAL_SECONDS;
  const cycleSec = FITTRACK_CONFIG.CARDIO_WALK_SECONDS + FITTRACK_CONFIG.CARDIO_RUN_SECONDS;
  const remainingSec = Math.max(0, totalSec - elapsed);
  const progressPct = Math.min(100, (elapsed / totalSec) * 100);
  const currentRound = Math.min(10, Math.floor(elapsed / cycleSec) + 1);
  const secInCycle = elapsed % cycleSec;
  const isRunPhase = secInCycle >= FITTRACK_CONFIG.CARDIO_WALK_SECONDS;

  useEffect(() => {
    setElapsed(cardioElapsedSec);
  }, [cardioElapsedSec]);

  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => {
      setElapsed((prev) => {
        const next = Math.min(totalSec, prev + 1);
        if (next >= totalSec) {
          setIsRunning(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          onUpdateCardioElapsed(totalSec);
        } else if (next % 15 === 0) {
          onUpdateCardioElapsed(next);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isRunning, totalSec, onUpdateCardioElapsed]);

  useEffect(() => {
    const currentPhase: 'walk' | 'run' = isRunPhase ? 'run' : 'walk';
    if (isRunning && prevPhaseRef.current !== currentPhase) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
    prevPhaseRef.current = currentPhase;
  }, [isRunPhase, isRunning]);

  const handleAddCustomSubmit = () => {
    const reps = parseInt(customReps, 10);
    if (!customTitle.trim() || !Number.isFinite(reps) || reps <= 0) return;
    const kcal = parseInt(customKcal, 10);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onAddCustomWorkout({
      title: customTitle.trim(),
      reps,
      estimatedKcal: Number.isFinite(kcal) && kcal > 0 ? kcal : Math.max(20, Math.round(reps * 1.6)),
    });
    setCustomTitle('');
    setCustomReps('');
    setCustomKcal('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>TẬP TẠI NHÀ · {FITTRACK_CONFIG.WORKOUT_WINDOW}</Text>
            <Text style={[TYPO.title, { color: colors.textPrimary }]}>Bài tập hôm nay</Text>
          </View>
          <View style={styles.burnPill}>
            <Ionicons name="flame" size={14} color={colors.amber} />
            <Text style={styles.burnText}>Đốt ~{burnedKcal} kcal</Text>
          </View>
        </View>

        {/* Compact Cardio 40m Timer */}
        <View
          style={[
            styles.timerCard,
            { borderColor: isRunPhase ? colors.amberBorder : colors.emeraldBorder },
          ]}
        >
          <View style={styles.timerHeader}>
            <Text style={[styles.phaseText, { color: isRunPhase ? colors.amber : colors.emerald }]}>
              {elapsed >= totalSec
                ? 'HOÀN THÀNH 40P CARDIO'
                : isRunPhase
                  ? `Vòng ${currentRound}/10 · TĂNG TỐC (1p)`
                  : `Vòng ${currentRound}/10 · ĐI BỘ NHANH (3p)`}
            </Text>
            <Text style={styles.clockVal}>{formatClock(remainingSec)}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressPct}%`,
                  backgroundColor: isRunPhase ? colors.amber : colors.emerald,
                },
              ]}
            />
          </View>
          <View style={styles.timerControls}>
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
              onPress={() => {
                setIsRunning(false);
                setElapsed(0);
                onUpdateCardioElapsed(0);
              }}
            >
              <Ionicons name="refresh" size={17} color={colors.textPrimary} />
              <Text style={styles.secondaryBtnText}>Đặt lại</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: isRunning ? colors.amber : colors.emerald },
                pressed && styles.pressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                if (isRunning) {
                  setIsRunning(false);
                  onUpdateCardioElapsed(elapsed);
                } else {
                  if (elapsed >= totalSec) {
                    setElapsed(0);
                    onUpdateCardioElapsed(0);
                  }
                  setIsRunning(true);
                }
              }}
            >
              <Ionicons name={isRunning ? 'pause' : 'play'} size={17} color={colors.onAccent} />
              <Text style={styles.primaryBtnText}>
                {isRunning ? 'Tạm dừng' : 'Bắt đầu Cardio 40p'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Today's Active Workout List */}
        {workouts.length > 0 ? (
          <View style={styles.sectionCard}>
            <Text style={[TYPO.sectionTitle, { color: colors.textPrimary }]}>
              Danh sách tập hôm nay ({workouts.filter((w) => w.done).length}/{workouts.length})
            </Text>
            <View style={styles.listGap}>
              {workouts.map((item) => (
                <View
                  key={item.id}
                  style={[styles.activeRow, item.done && styles.activeRowDone]}
                >
                  <Pressable
                    style={styles.activeCheckArea}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                      onToggleWorkout(item.id);
                    }}
                  >
                    <Ionicons
                      name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
                      size={24}
                      color={item.done ? colors.emerald : colors.textMuted}
                    />
                    <View style={styles.flex}>
                      <Text style={[styles.itemTitle, item.done && styles.itemTitleDone]}>
                        {item.title}
                      </Text>
                      <Text style={styles.itemSub}>
                        {item.reps} {item.unit || 'cái'} · Đốt ~{item.estimatedKcal} kcal
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => onRemoveWorkout(item.id)}
                    hitSlop={8}
                    style={styles.delBtn}
                  >
                    <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* 2 Options Segment: Tập theo App / Tự thêm Custom */}
        <View style={styles.segmentWrap}>
          <Pressable
            style={[styles.segmentBtn, modeTab === 'app' && styles.segmentBtnActive]}
            onPress={() => setModeTab('app')}
          >
            <Text style={[styles.segmentText, modeTab === 'app' && styles.segmentTextActive]}>
              1. Gợi ý tập tại nhà
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segmentBtn, modeTab === 'custom' && styles.segmentBtnActive]}
            onPress={() => setModeTab('custom')}
          >
            <Text style={[styles.segmentText, modeTab === 'custom' && styles.segmentTextActive]}>
              2. Tự thêm bài tập
            </Text>
          </Pressable>
        </View>

        {modeTab === 'app' ? (
          <View style={styles.listGap}>
            {HOME_WORKOUT_LIBRARY.map((tpl) => (
              <View key={tpl.id} style={styles.tplCard}>
                <View style={styles.flex}>
                  <Text style={styles.tplCat}>{tpl.category}</Text>
                  <Text style={styles.itemTitle}>{tpl.title}</Text>
                  <Text style={styles.itemSub}>{tpl.detail}</Text>
                  <Text style={styles.tplMeta}>
                    {tpl.defaultReps} {tpl.unit} · Đốt ~{tpl.estimatedKcal} kcal
                  </Text>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.addCircle, pressed && styles.pressed]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                    onAddTemplate(tpl);
                  }}
                >
                  <Ionicons name="add" size={22} color={colors.onAccent} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.sectionCard}>
            <Text style={[TYPO.sectionTitle, { color: colors.textPrimary }]}>
              Tự nhập bài tập (Custom)
            </Text>
            <TextInput
              value={customTitle}
              onChangeText={setCustomTitle}
              placeholder="Tên bài tập (VD: Plank tĩnh, Đá chân cao...)"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <View style={styles.rowGap}>
              <TextInput
                value={customReps}
                onChangeText={setCustomReps}
                placeholder="Số cái (VD: 30)"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={[styles.input, styles.flex]}
              />
              <TextInput
                value={customKcal}
                onChangeText={setCustomKcal}
                placeholder="Kcal đốt (tự tính nếu trống)"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={[styles.input, styles.flex]}
              />
            </View>
            <Pressable
              style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}
              onPress={handleAddCustomSubmit}
            >
              <Text style={styles.submitBtnText}>+ Thêm & đánh dấu đã tập</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (c: ThemePalette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    content: {
      padding: SPACING.md,
      paddingBottom: 28,
      gap: SPACING.md,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    kicker: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.9,
    },
    burnPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.amberDim,
      borderWidth: 1,
      borderColor: c.amberBorder,
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: RADIUS.full,
    },
    burnText: {
      color: c.amber,
      fontSize: 12,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    timerCard: {
      backgroundColor: c.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      padding: SPACING.md,
      gap: 10,
    },
    timerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    phaseText: {
      fontSize: 12,
      fontWeight: '800',
    },
    clockVal: {
      color: c.textPrimary,
      fontSize: 28,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    progressTrack: {
      width: '100%',
      height: 7,
      borderRadius: 4,
      backgroundColor: c.border,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
    },
    timerControls: {
      flexDirection: 'row',
      gap: SPACING.sm,
    },
    secondaryBtn: {
      height: 42,
      paddingHorizontal: 14,
      borderRadius: RADIUS.md,
      backgroundColor: c.surfaceElevated,
      borderWidth: 1,
      borderColor: c.borderStrong,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    secondaryBtnText: {
      color: c.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    primaryBtn: {
      flex: 1,
      height: 42,
      borderRadius: RADIUS.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    primaryBtnText: {
      color: c.onAccent,
      fontSize: 13.5,
      fontWeight: '800',
    },
    sectionCard: {
      backgroundColor: c.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: SPACING.md,
      gap: SPACING.sm,
    },
    listGap: {
      gap: 8,
    },
    activeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surfaceMuted,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: c.border,
      padding: 12,
    },
    activeRowDone: {
      borderColor: c.emeraldBorder,
    },
    activeCheckArea: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    delBtn: {
      padding: 6,
    },
    segmentWrap: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: RADIUS.md,
      padding: 4,
      borderWidth: 1,
      borderColor: c.border,
    },
    segmentBtn: {
      flex: 1,
      minHeight: 40,
      borderRadius: RADIUS.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentBtnActive: {
      backgroundColor: c.emerald,
    },
    segmentText: {
      color: c.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    segmentTextActive: {
      color: c.onAccent,
    },
    tplCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
    },
    tplCat: {
      color: c.cyan,
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 2,
    },
    itemTitle: {
      color: c.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    itemTitleDone: {
      color: c.textSecondary,
      textDecorationLine: 'line-through',
    },
    itemSub: {
      color: c.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    tplMeta: {
      color: c.emerald,
      fontSize: 11.5,
      fontWeight: '700',
      marginTop: 4,
      fontVariant: ['tabular-nums'],
    },
    addCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: c.emerald,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowGap: {
      flexDirection: 'row',
      gap: SPACING.sm,
    },
    input: {
      height: 44,
      backgroundColor: c.bg,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: RADIUS.sm,
      paddingHorizontal: 12,
      color: c.textPrimary,
      fontSize: 14,
    },
    submitBtn: {
      height: 46,
      borderRadius: RADIUS.md,
      backgroundColor: c.emerald,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitBtnText: {
      color: c.onAccent,
      fontSize: 14,
      fontWeight: '800',
    },
    pressed: { opacity: 0.78 },
  });
