import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { EVENING_WORKOUT_PLAN, FITTRACK_CONFIG } from '../config/fittrack';
import { COLORS, RADIUS, SPACING, TYPO } from '../theme/tokens';

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
  const [elapsed, setElapsed] = useState(cardioElapsedSec);
  const [isRunning, setIsRunning] = useState(false);
  const prevPhaseRef = useRef<'walk' | 'run'>('walk');

  const totalSec = FITTRACK_CONFIG.CARDIO_TOTAL_SECONDS;
  const cycleSec = FITTRACK_CONFIG.CARDIO_WALK_SECONDS + FITTRACK_CONFIG.CARDIO_RUN_SECONDS; // 240s = 4m
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

  // Haptic alert when transitioning between 3-min Brisk Walk and 1-min Run/Stairs
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
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.kicker}>SAU GIỜ LÀM · {FITTRACK_CONFIG.WORKOUT_WINDOW}</Text>
          <Text style={[TYPO.title, { color: COLORS.textPrimary }]}>Kế hoạch vận động</Text>
        </View>
        <View style={styles.burnPill}>
          <Ionicons name="flash" size={14} color={COLORS.emerald} />
          <Text style={styles.burnText}>~{burnedKcal} kcal</Text>
        </View>
      </View>

      {/* 40-Minute Interval Cardio Timer */}
      <View
        style={[
          styles.timerCard,
          { borderColor: isRunPhase ? COLORS.amberBorder : COLORS.emeraldBorder },
        ]}
      >
        <View style={styles.timerTopRow}>
          <View
            style={[
              styles.phasePill,
              {
                backgroundColor: isRunPhase ? COLORS.amberDim : COLORS.emeraldDim,
              },
            ]}
          >
            <View
              style={[
                styles.phaseDot,
                { backgroundColor: isRunPhase ? COLORS.amber : COLORS.emerald },
              ]}
            />
            <Text
              style={[
                styles.phaseText,
                { color: isRunPhase ? COLORS.amber : COLORS.emerald },
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

        {/* Progress Bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progressPct}%`,
                backgroundColor: isRunPhase ? COLORS.amber : COLORS.emerald,
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
            <Ionicons name="refresh" size={20} color={COLORS.textPrimary} />
            <Text style={styles.secondaryBtnText}>Đặt lại</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: isRunning ? COLORS.amber : COLORS.emerald },
              pressed && styles.pressed,
            ]}
            onPress={handleStartPause}
            accessibilityRole="button"
            accessibilityLabel={isRunning ? 'Tạm dừng Cardio' : 'Bắt đầu Cardio 40 phút'}
          >
            <Ionicons
              name={isRunning ? 'pause' : 'play'}
              size={20}
              color={COLORS.black}
            />
            <Text style={styles.primaryBtnText}>
              {isRunning ? 'Tạm dừng' : elapsed > 0 && elapsed < totalSec ? 'Tiếp tục' : 'Bắt đầu 40p'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Fixed Evening Schedule */}
      <View style={styles.sectionHeader}>
        <Text style={[TYPO.sectionTitle, { color: COLORS.textPrimary }]}>
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
                <Text style={[styles.timeText, done && { color: COLORS.emerald }]}>
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
                color={done ? COLORS.emerald : COLORS.textMuted}
              />
            </Pressable>
          );
        })}
      </View>

      {/* Coaching Tip */}
      <View style={styles.tipCard}>
        <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.cyan} />
        <Text style={styles.tipText}>
          Kỹ thuật an toàn: Khi đẩy con lăn 4 bánh luôn gồng chặt cơ bụng, tuyệt đối không võng
          lưng dưới. Uống thêm nước chanh muối loãng sau buổi tập để bù điện giải.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: SPACING.md,
    paddingBottom: 36,
    gap: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kicker: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  burnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.emeraldDim,
    borderWidth: 1,
    borderColor: COLORS.emeraldBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  burnText: {
    color: COLORS.emerald,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timerCard: {
    backgroundColor: COLORS.surface,
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
    color: COLORS.textPrimary,
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  clockSub: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
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
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryBtnText: {
    color: COLORS.textPrimary,
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
    color: COLORS.black,
    fontSize: 15,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sectionHint: {
    color: COLORS.textMuted,
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
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  workoutCardDone: {
    borderColor: COLORS.emeraldBorder,
    backgroundColor: COLORS.surfaceMuted,
  },
  timeCol: {
    width: 50,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceElevated,
  },
  timeText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  durationText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  workoutTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  workoutTitleDone: {
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
  },
  workoutDetail: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  workoutBurn: {
    color: COLORS.emerald,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.cyanDim,
    borderWidth: 1,
    borderColor: COLORS.cyanBorder,
    borderRadius: RADIUS.md,
    padding: 14,
  },
  tipText: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 12,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.78,
  },
});
