import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { EVENING_WORKOUT_PLAN, FITTRACK_CONFIG } from '../config/fittrack';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SPACING, ThemePalette, TYPO } from '../theme/tokens';

interface WorkoutScreenProps {
  completedWorkouts: string[];
  cardioElapsedSec: number;
  onToggleWorkout: (workoutId: string) => void;
  onUpdateCardioElapsed: (seconds: number) => void;
}

function formatClock(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function WorkoutScreen({
  completedWorkouts,
  cardioElapsedSec,
  onToggleWorkout,
  onUpdateCardioElapsed,
}: WorkoutScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
  const phaseRemaining = isRunPhase
    ? cycleSec - secInCycle
    : FITTRACK_CONFIG.CARDIO_WALK_SECONDS - secInCycle;

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

  const handleStartPause = () => {
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
  };

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIsRunning(false);
    setElapsed(0);
    onUpdateCardioElapsed(0);
  };

  const handleToggleItem = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onToggleWorkout(id);
  };

  const burnedKcal = EVENING_WORKOUT_PLAN.reduce(
    (sum, item) => (completedWorkouts.includes(item.id) ? sum + item.estimatedKcal : sum),
    0
  );

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.kicker}>SAU GIỜ LÀM · {FITTRACK_CONFIG.WORKOUT_WINDOW}</Text>
          <Text style={[TYPO.title, { color: colors.textPrimary }]}>Kế hoạch vận động</Text>
        </View>
        <View style={styles.burnPill}>
          <Ionicons name="flash" size={14} color={colors.emerald} />
          <Text style={styles.burnText}>~{burnedKcal} kcal</Text>
        </View>
      </View>

      <View
        style={[
          styles.timerCard,
          { borderColor: isRunPhase ? colors.amberBorder : colors.emeraldBorder },
        ]}
      >
        <View style={styles.timerTopRow}>
          <View
            style={[
              styles.phasePill,
              { backgroundColor: isRunPhase ? colors.amberDim : colors.emeraldDim },
            ]}
          >
            <View
              style={[
                styles.phaseDot,
                { backgroundColor: isRunPhase ? colors.amber : colors.emerald },
              ]}
            />
            <Text
              style={[
                styles.phaseText,
                { color: isRunPhase ? colors.amber : colors.emerald },
              ]}
            >
              {elapsed >= totalSec
                ? 'HOÀN THÀNH 40 PHÚT CARDIO'
                : isRunPhase
                  ? 'NHỊP TĂNG TỐC · CHẠY / LEO CẦU THANG (1P)'
                  : 'NHỊP NỀN · ĐI BỘ CỰC NHANH (3P)'}
            </Text>
          </View>
        </View>

        <Text style={styles.clockBig}>{formatClock(remainingSec)}</Text>
        <Text style={styles.clockSub}>
          Vòng {currentRound} / 10  ·  Đổi nhịp sau {formatClock(phaseRemaining)}
        </Text>

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
            onPress={handleReset}
            accessibilityRole="button"
            accessibilityLabel="Đặt lại đồng hồ 40 phút"
          >
            <Ionicons name="refresh" size={20} color={colors.textPrimary} />
            <Text style={styles.secondaryBtnText}>Đặt lại</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: isRunning ? colors.amber : colors.emerald },
              pressed && styles.pressed,
            ]}
            onPress={handleStartPause}
            accessibilityRole="button"
            accessibilityLabel={isRunning ? 'Tạm dừng Cardio' : 'Bắt đầu Cardio 40 phút'}
          >
            <Ionicons
              name={isRunning ? 'pause' : 'play'}
              size={20}
              color={colors.onAccent}
            />
            <Text style={styles.primaryBtnText}>
              {isRunning ? 'Tạm dừng' : elapsed > 0 && elapsed < totalSec ? 'Tiếp tục' : 'Bắt đầu 40p'}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[TYPO.sectionTitle, { color: colors.textPrimary }]}>
          Lịch trình cố định ({completedWorkouts.length}/{EVENING_WORKOUT_PLAN.length})
        </Text>
        <Text style={styles.sectionHint}>Tổng ~530 kcal</Text>
      </View>

      <View style={styles.listGap}>
        {EVENING_WORKOUT_PLAN.map((item) => {
          const done = completedWorkouts.includes(item.id);
          return (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.workoutCard,
                done && styles.workoutCardDone,
                pressed && styles.pressed,
              ]}
              onPress={() => handleToggleItem(item.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: done }}
              accessibilityLabel={`${item.time} ${item.title}`}
            >
              <View style={styles.timeCol}>
                <Text style={[styles.timeText, done && { color: colors.emerald }]}>
                  {item.time}
                </Text>
                <Text style={styles.durationText}>{item.durationMin}p</Text>
              </View>

              <View style={styles.flex}>
                <Text style={[styles.workoutTitle, done && styles.workoutTitleDone]}>
                  {item.title}
                </Text>
                <Text style={styles.workoutDetail}>{item.detail}</Text>
                <Text style={styles.workoutBurn}>Đốt ước tính ~{item.estimatedKcal} kcal</Text>
              </View>

              <Ionicons
                name={done ? 'checkmark-circle' : 'ellipse-outline'}
                size={26}
                color={done ? colors.emerald : colors.textMuted}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.tipCard}>
        <Ionicons name="shield-checkmark-outline" size={18} color={colors.cyan} />
        <Text style={styles.tipText}>
          Kỹ thuật an toàn: Khi đẩy con lăn 4 bánh luôn gồng chặt cơ bụng, tuyệt đối không võng
          lưng dưới. Uống thêm nước chanh muối loãng sau buổi tập để bù điện giải.
        </Text>
      </View>
    </ScrollView>
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
      backgroundColor: c.emeraldDim,
      borderWidth: 1,
      borderColor: c.emeraldBorder,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: RADIUS.full,
    },
    burnText: {
      color: c.emerald,
      fontSize: 12,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    timerCard: {
      backgroundColor: c.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      padding: SPACING.lg,
      alignItems: 'center',
      gap: 12,
    },
    timerTopRow: {
      width: '100%',
      alignItems: 'center',
    },
    phasePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: RADIUS.full,
    },
    phaseDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    phaseText: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
    clockBig: {
      color: c.textPrimary,
      fontSize: 56,
      fontWeight: '800',
      letterSpacing: -1.5,
      fontVariant: ['tabular-nums'],
    },
    clockSub: {
      color: c.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
    progressTrack: {
      width: '100%',
      height: 8,
      borderRadius: 4,
      backgroundColor: c.border,
      overflow: 'hidden',
      marginTop: 4,
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
    },
    timerControls: {
      flexDirection: 'row',
      width: '100%',
      gap: SPACING.sm,
      marginTop: 6,
    },
    secondaryBtn: {
      height: 48,
      paddingHorizontal: 16,
      borderRadius: RADIUS.md,
      backgroundColor: c.surfaceElevated,
      borderWidth: 1,
      borderColor: c.borderStrong,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    secondaryBtnText: {
      color: c.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    primaryBtn: {
      flex: 1,
      height: 48,
      borderRadius: RADIUS.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    primaryBtnText: {
      color: c.onAccent,
      fontSize: 15,
      fontWeight: '800',
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    sectionHint: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    listGap: {
      gap: SPACING.sm,
    },
    workoutCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
    },
    workoutCardDone: {
      borderColor: c.emeraldBorder,
      backgroundColor: c.surfaceMuted,
    },
    timeCol: {
      width: 50,
      alignItems: 'center',
      paddingVertical: 6,
      borderRadius: RADIUS.sm,
      backgroundColor: c.surfaceElevated,
    },
    timeText: {
      color: c.textPrimary,
      fontSize: 13,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    durationText: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    workoutTitle: {
      color: c.textPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
    workoutTitleDone: {
      color: c.textSecondary,
      textDecorationLine: 'line-through',
    },
    workoutDetail: {
      color: c.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 2,
    },
    workoutBurn: {
      color: c.emerald,
      fontSize: 11,
      fontWeight: '700',
      marginTop: 4,
    },
    tipCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: c.cyanDim,
      borderWidth: 1,
      borderColor: c.cyanBorder,
      borderRadius: RADIUS.md,
      padding: 14,
    },
    tipText: {
      flex: 1,
      color: c.textPrimary,
      fontSize: 12,
      lineHeight: 18,
    },
    pressed: {
      opacity: 0.78,
    },
  });
