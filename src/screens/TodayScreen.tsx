import React, { useMemo, useState } from 'react';
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
import { CircularGauge } from '../components/CircularGauge';
import { DAILY_ROUTINE_STEPS, EVENING_WORKOUT_PLAN, FITTRACK_CONFIG } from '../config/fittrack';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SPACING, ThemePalette, TYPO } from '../theme/tokens';
import { DailyRecord } from '../types/fittrack';

interface TodayScreenProps {
  todayKey: string;
  currentWeight: number;
  todayRecord: DailyRecord;
  totals: {
    kcal: number;
    protein: number;
    waterMl: number;
    remainingKcal: number;
    isInSafeZone: boolean;
    isOverHardCeiling: boolean;
  };
  streakDays: number;
  onSaveWeight: (weight: number) => void;
  onAdjustWater: (deltaMl: number) => void;
  onAddMorningCombo: () => void;
  onToggleCloseOut: () => void;
  onNavigateMeals: () => void;
  onNavigateWorkout: () => void;
}

export function TodayScreen({
  todayKey,
  currentWeight,
  todayRecord,
  totals,
  streakDays,
  onSaveWeight,
  onAdjustWater,
  onAddMorningCombo,
  onToggleCloseOut,
  onNavigateMeals,
  onNavigateWorkout,
}: TodayScreenProps) {
  const { colors, mode, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [weightInput, setWeightInput] = useState(
    (todayRecord.weightKg ?? currentWeight).toFixed(1)
  );
  const [editingWeight, setEditingWeight] = useState(false);

  const proteinPct = Math.min(100, Math.round((totals.protein / FITTRACK_CONFIG.TARGET_PROTEIN) * 100));
  const waterPct = Math.min(100, Math.round((totals.waterMl / FITTRACK_CONFIG.TARGET_WATER) * 100));
  const lostKg = Math.max(0, FITTRACK_CONFIG.START_WEIGHT - currentWeight);
  const toGoalKg = Math.max(0, currentWeight - FITTRACK_CONFIG.TARGET_WEIGHT);

  const routineStatus: Record<string, boolean> = {
    'rt-weight': todayRecord.weightKg !== null,
    'rt-breakfast': todayRecord.meals.length > 0 && todayRecord.waterMl >= 500,
    'rt-workout': todayRecord.completedWorkouts.length >= EVENING_WORKOUT_PLAN.length,
    'rt-closeout': todayRecord.isClosedOut,
  };

  const handleWeightSubmit = () => {
    const parsed = parseFloat(weightInput.replace(',', '.'));
    if (Number.isFinite(parsed) && parsed >= 40 && parsed <= 200) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onSaveWeight(parsed);
      setWeightInput(parsed.toFixed(1));
      setEditingWeight(false);
    }
  };

  const handleWaterPress = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onAdjustWater(delta);
  };

  const handleMorningComboPress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onAddMorningCombo();
  };

  const handleCloseOutPress = () => {
    Haptics.notificationAsync(
      totals.isOverHardCeiling
        ? Haptics.NotificationFeedbackType.Warning
        : Haptics.NotificationFeedbackType.Success
    ).catch(() => {});
    onToggleCloseOut();
  };

  const handleToggleTheme = () => {
    Haptics.selectionAsync().catch(() => {});
    toggleTheme();
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
        {/* Top Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.dateText}>{todayKey} · ZERO-STARCH</Text>
            <Text style={[TYPO.title, { color: colors.textPrimary }]}>FitTrack 70</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={({ pressed }) => [styles.themeBtn, pressed && styles.pressed]}
              onPress={handleToggleTheme}
              accessibilityRole="button"
              accessibilityLabel={mode === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            >
              <Ionicons
                name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'}
                size={18}
                color={mode === 'dark' ? colors.amber : colors.textPrimary}
              />
            </Pressable>
            <View style={styles.streakPill}>
              <Ionicons name="flame" size={14} color={colors.amber} />
              <Text style={styles.streakText}>{streakDays} ngày</Text>
            </View>
          </View>
        </View>

        {/* Hero Calorie Ring Card */}
        <View style={styles.heroCard}>
          <CircularGauge
            value={totals.kcal}
            target={FITTRACK_CONFIG.TARGET_KCAL}
            hardMax={FITTRACK_CONFIG.SAFE_KCAL_MAX}
          />
          <View style={styles.heroFooter}>
            <View style={styles.zoneChip}>
              <View style={[styles.dot, { backgroundColor: colors.emerald }]} />
              <Text style={styles.zoneText}>
                Vùng an toàn: {FITTRACK_CONFIG.SAFE_KCAL_MIN}–{FITTRACK_CONFIG.SAFE_KCAL_MAX} kcal
              </Text>
            </View>
            <Pressable
              onPress={onNavigateMeals}
              style={({ pressed }) => [styles.quickLink, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Mở thực đơn để thêm món"
            >
              <Ionicons name="add-circle" size={18} color={colors.emerald} />
              <Text style={styles.quickLinkText}>Ghi món</Text>
            </Pressable>
          </View>
        </View>

        {/* Protein & Water Side-by-Side */}
        <View style={styles.dualRow}>
          <View style={styles.metricTile}>
            <View style={styles.metricHead}>
              <Ionicons name="barbell-outline" size={16} color={colors.amber} />
              <Text style={styles.metricLabel}>Đạm giữ cơ</Text>
            </View>
            <Text style={styles.metricValue}>
              {totals.protein}
              <Text style={styles.metricUnit}> / {FITTRACK_CONFIG.TARGET_PROTEIN}g</Text>
            </Text>
            <View style={styles.barTrack}>
              <View
                style={[styles.barFill, { width: `${proteinPct}%`, backgroundColor: colors.amber }]}
              />
            </View>
            <Text style={styles.metricSub}>{proteinPct}% mục tiêu ngày</Text>
          </View>

          <View style={styles.metricTile}>
            <View style={styles.metricHead}>
              <Ionicons name="water-outline" size={16} color={colors.cyan} />
              <Text style={styles.metricLabel}>Nước & Điện giải</Text>
            </View>
            <Text style={styles.metricValue}>
              {totals.waterMl}
              <Text style={styles.metricUnit}> / {FITTRACK_CONFIG.TARGET_WATER}ml</Text>
            </Text>
            <View style={styles.barTrack}>
              <View
                style={[styles.barFill, { width: `${waterPct}%`, backgroundColor: colors.cyan }]}
              />
            </View>
            <View style={styles.waterActions}>
              <Pressable
                style={({ pressed }) => [styles.waterBtn, pressed && styles.pressed]}
                onPress={() => handleWaterPress(250)}
                accessibilityRole="button"
                accessibilityLabel="Thêm 250 ml nước"
              >
                <Text style={styles.waterBtnText}>+250</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.waterBtn,
                  styles.waterBtnPrimary,
                  pressed && styles.pressed,
                ]}
                onPress={() => handleWaterPress(500)}
                accessibilityRole="button"
                accessibilityLabel="Thêm 500 ml nước"
              >
                <Text style={[styles.waterBtnText, { color: colors.onAccent }]}>+500ml</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Morning Weight Card (06:30) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="scale-outline" size={18} color={colors.emerald} />
              <Text style={[TYPO.sectionTitle, { color: colors.textPrimary }]}>
                Cân nặng buổi sáng (06:30)
              </Text>
            </View>
            <Pressable
              onPress={() => setEditingWeight((v) => !v)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Chỉnh sửa cân nặng"
            >
              <Text style={styles.editText}>{editingWeight ? 'Đóng' : 'Cập nhật'}</Text>
            </Pressable>
          </View>

          <View style={styles.weightSummaryRow}>
            <View>
              <Text style={styles.weightBig}>{currentWeight.toFixed(1)} kg</Text>
              <Text style={styles.weightMeta}>
                Đã giảm {lostKg.toFixed(1)} kg · Còn {toGoalKg.toFixed(1)} kg tới 70.0 kg
              </Text>
            </View>
            <View style={styles.goalBadge}>
              <Text style={styles.goalBadgeText}>88 → 70</Text>
            </View>
          </View>

          {editingWeight ? (
            <View style={styles.weightInputRow}>
              <TextInput
                value={weightInput}
                onChangeText={setWeightInput}
                keyboardType="decimal-pad"
                placeholder="VD: 87.4"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                accessibilityLabel="Nhập số cân nặng buổi sáng tính bằng kg"
              />
              <Pressable
                style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
                onPress={handleWeightSubmit}
                accessibilityRole="button"
                accessibilityLabel="Lưu cân nặng"
              >
                <Text style={styles.saveBtnText}>Lưu cân</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* 07:15 Quick Morning Combo */}
        <Pressable
          style={({ pressed }) => [styles.comboCard, pressed && styles.pressed]}
          onPress={handleMorningComboPress}
          accessibilityRole="button"
          accessibilityLabel="Chọn nhanh combo 07 giờ 15 sáng gồm 3 trứng luộc, Americano đá và 500ml nước"
        >
          <View style={styles.comboIcon}>
            <Ionicons name="sunny-outline" size={20} color={colors.amber} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.comboTitle}>Combo 07:15 Sáng (1 chạm)</Text>
            <Text style={styles.comboSub}>
              3 Trứng luộc + Americano đá + 500ml nước · 210 kcal · 16g đạm
            </Text>
          </View>
          <Ionicons name="add-circle-outline" size={24} color={colors.amber} />
        </Pressable>

        {/* Daily Routine Checklist */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="checkmark-done-outline" size={18} color={colors.cyan} />
              <Text style={[TYPO.sectionTitle, { color: colors.textPrimary }]}>
                Checklist vận hành hôm nay
              </Text>
            </View>
            <Pressable onPress={onNavigateWorkout} hitSlop={8}>
              <Text style={styles.editText}>Tập 18h15 →</Text>
            </Pressable>
          </View>

          <View style={styles.checklist}>
            {DAILY_ROUTINE_STEPS.map((step) => {
              const done = routineStatus[step.id];
              return (
                <View key={step.id} style={styles.checkRow}>
                  <Ionicons
                    name={done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={done ? colors.emerald : colors.textMuted}
                  />
                  <Text style={styles.checkTime}>{step.time}</Text>
                  <Text style={[styles.checkLabel, done && styles.checkLabelDone]}>
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* 22:00 Close Out Day CTA */}
        <Pressable
          style={({ pressed }) => [
            styles.closeOutBtn,
            todayRecord.isClosedOut && styles.closeOutBtnDone,
            pressed && styles.pressed,
          ]}
          onPress={handleCloseOutPress}
          accessibilityRole="button"
          accessibilityLabel={todayRecord.isClosedOut ? 'Mở khóa ngày hôm nay' : 'Chốt ngày hôm nay'}
        >
          <Ionicons
            name={todayRecord.isClosedOut ? 'shield-checkmark' : 'moon-outline'}
            size={20}
            color={todayRecord.isClosedOut ? colors.emerald : colors.onAccent}
          />
          <Text
            style={[
              styles.closeOutText,
              todayRecord.isClosedOut && { color: colors.emerald },
            ]}
          >
            {todayRecord.isClosedOut
              ? `Đã chốt ngày lúc ${todayRecord.closedOutAt ?? '22:00'} · Ngủ trước 22:30`
              : totals.isInSafeZone
                ? 'Chốt ngày (22:00) · Đạt vùng xanh ≤ 1.450 kcal'
                : 'Chốt ngày (22:00) · Lưu kỷ lục hôm nay'}
          </Text>
        </Pressable>
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
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    themeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateText: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.9,
    },
    streakPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.amberDim,
      borderWidth: 1,
      borderColor: c.amberBorder,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: RADIUS.full,
    },
    streakText: {
      color: c.amber,
      fontSize: 12,
      fontWeight: '700',
    },
    heroCard: {
      backgroundColor: c.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: SPACING.lg,
      paddingHorizontal: SPACING.md,
      alignItems: 'center',
      gap: SPACING.md,
    },
    heroFooter: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    zoneChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    zoneText: {
      color: c.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
    quickLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: RADIUS.full,
      backgroundColor: c.emeraldDim,
    },
    quickLinkText: {
      color: c.emerald,
      fontSize: 12,
      fontWeight: '700',
    },
    dualRow: {
      flexDirection: 'row',
      gap: SPACING.sm,
    },
    metricTile: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: c.border,
      padding: SPACING.md,
      gap: 8,
    },
    metricHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    metricLabel: {
      color: c.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    metricValue: {
      color: c.textPrimary,
      fontSize: 20,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    metricUnit: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    barTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: c.border,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: 3,
    },
    metricSub: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    waterActions: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 2,
    },
    waterBtn: {
      flex: 1,
      minHeight: 34,
      borderRadius: RADIUS.sm,
      backgroundColor: c.surfaceElevated,
      borderWidth: 1,
      borderColor: c.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    waterBtnPrimary: {
      backgroundColor: c.cyan,
      borderColor: c.cyan,
    },
    waterBtnText: {
      color: c.textPrimary,
      fontSize: 12,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    sectionCard: {
      backgroundColor: c.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: SPACING.md,
      gap: SPACING.sm,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    editText: {
      color: c.emerald,
      fontSize: 13,
      fontWeight: '700',
    },
    weightSummaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    weightBig: {
      color: c.textPrimary,
      fontSize: 28,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    weightMeta: {
      color: c.textSecondary,
      fontSize: 12,
      marginTop: 2,
      fontVariant: ['tabular-nums'],
    },
    goalBadge: {
      backgroundColor: c.surfaceElevated,
      borderWidth: 1,
      borderColor: c.borderStrong,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: RADIUS.sm,
    },
    goalBadgeText: {
      color: c.emerald,
      fontSize: 12,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    weightInputRow: {
      flexDirection: 'row',
      gap: SPACING.sm,
      marginTop: 4,
    },
    input: {
      flex: 1,
      height: 44,
      backgroundColor: c.bg,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: RADIUS.sm,
      paddingHorizontal: 12,
      color: c.textPrimary,
      fontSize: 15,
      fontWeight: '600',
    },
    saveBtn: {
      height: 44,
      paddingHorizontal: 18,
      backgroundColor: c.emerald,
      borderRadius: RADIUS.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveBtnText: {
      color: c.onAccent,
      fontSize: 14,
      fontWeight: '700',
    },
    comboCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: c.amberBorder,
      padding: SPACING.md,
    },
    comboIcon: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.sm,
      backgroundColor: c.amberDim,
      alignItems: 'center',
      justifyContent: 'center',
    },
    comboTitle: {
      color: c.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    comboSub: {
      color: c.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    checklist: {
      gap: 10,
      marginTop: 2,
    },
    checkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    checkTime: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: '700',
      width: 42,
      fontVariant: ['tabular-nums'],
    },
    checkLabel: {
      flex: 1,
      color: c.textPrimary,
      fontSize: 13,
      fontWeight: '500',
    },
    checkLabelDone: {
      color: c.textSecondary,
      textDecorationLine: 'line-through',
    },
    closeOutBtn: {
      minHeight: 54,
      borderRadius: RADIUS.md,
      backgroundColor: c.emerald,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: SPACING.md,
    },
    closeOutBtnDone: {
      backgroundColor: c.emeraldDim,
      borderWidth: 1,
      borderColor: c.emeraldBorder,
    },
    closeOutText: {
      color: c.onAccent,
      fontSize: 14,
      fontWeight: '800',
    },
    pressed: {
      opacity: 0.78,
    },
  });
