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
import { FoodLogModal } from '../components/FoodLogModal';
import { FITTRACK_CONFIG } from '../config/fittrack';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SPACING, ThemePalette, TYPO } from '../theme/tokens';
import { DailyRecord, GoogleUser, MealPreset } from '../types/fittrack';

interface TodayScreenProps {
  todayKey: string;
  user: GoogleUser | null;
  currentWeight: number;
  todayRecord: DailyRecord;
  totals: {
    kcal: number;
    protein: number;
    burnedKcal: number;
    waterMl: number;
    remainingKcal: number;
    isInSafeZone: boolean;
    isOverHardCeiling: boolean;
    totalReps: number;
    completedCount: number;
    totalWorkouts: number;
  };
  onSaveWeight: (weight: number) => void;
  onAdjustWater: (deltaMl: number) => void;
  onAddMealsBatch: (
    items: {
      name: string;
      kcal: number;
      protein: number;
      source?: 'ai_photo' | 'app_menu' | 'manual';
      presetId?: string;
    }[]
  ) => void;
  onAddPreset: (preset: MealPreset) => void;
  onAddMorningCombo: () => void;
  onRemoveMeal: (id: string) => void;
  onToggleWorkout: (id: string) => void;
  onLoadDefaultWorkouts: () => void;
  onNavigateWorkout: () => void;
  onNavigateRoadmap: () => void;
}

export function TodayScreen({
  todayKey,
  user,
  currentWeight,
  todayRecord,
  totals,
  onSaveWeight,
  onAdjustWater,
  onAddMealsBatch,
  onAddPreset,
  onAddMorningCombo,
  onRemoveMeal,
  onToggleWorkout,
  onLoadDefaultWorkouts,
  onNavigateWorkout,
  onNavigateRoadmap,
}: TodayScreenProps) {
  const { colors, mode, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [weightInput, setWeightInput] = useState(
    (todayRecord.weightKg ?? currentWeight).toFixed(1)
  );
  const [editingWeight, setEditingWeight] = useState(false);
  const [foodModalOpen, setFoodModalOpen] = useState(false);

  const proteinPct = Math.min(100, Math.round((totals.protein / FITTRACK_CONFIG.TARGET_PROTEIN) * 100));
  const waterPct = Math.min(100, Math.round((totals.waterMl / FITTRACK_CONFIG.TARGET_WATER) * 100));
  const lostKg = Math.max(0, FITTRACK_CONFIG.START_WEIGHT - currentWeight);
  const toGoalKg = Math.max(0, currentWeight - FITTRACK_CONFIG.TARGET_WEIGHT);

  const handleWeightSubmit = () => {
    const parsed = parseFloat(weightInput.replace(',', '.'));
    if (Number.isFinite(parsed) && parsed >= 40 && parsed <= 200) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onSaveWeight(parsed);
      setWeightInput(parsed.toFixed(1));
      setEditingWeight(false);
    }
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
            <Text style={styles.dateText}>{todayKey} · FITTRACK 70</Text>
            <Text style={[TYPO.title, { color: colors.textPrimary }]}>
              {user ? `Chào, ${user.name}` : 'Hôm nay'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                toggleTheme();
              }}
              accessibilityRole="button"
              accessibilityLabel="Đổi giao diện sáng tối"
            >
              <Ionicons
                name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'}
                size={18}
                color={mode === 'dark' ? colors.amber : colors.textPrimary}
              />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.accountPill, pressed && styles.pressed]}
              onPress={onNavigateRoadmap}
              accessibilityRole="button"
              accessibilityLabel="Tài khoản Google và lộ trình"
            >
              <Ionicons
                name={user ? 'person-circle' : 'logo-google'}
                size={16}
                color={user ? colors.emerald : colors.textPrimary}
              />
              <Text style={styles.accountPillText}>{user ? 'Google' : 'Đăng nhập'}</Text>
            </Pressable>
          </View>
        </View>

        {/* 1. CÂN NẶNG ĐƯA LÊN ĐẦU TRANG */}
        <View style={styles.weightTopCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="scale-outline" size={18} color={colors.emerald} />
              <Text style={[TYPO.sectionTitle, { color: colors.textPrimary }]}>
                Cân nặng hiện tại
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setWeightInput((todayRecord.weightKg ?? currentWeight).toFixed(1));
                setEditingWeight((v) => !v);
              }}
              hitSlop={10}
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
              />
              <Pressable
                style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
                onPress={handleWeightSubmit}
              >
                <Text style={styles.saveBtnText}>Lưu cân</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* 2. VÒNG CALO & NÚT GHI MÓN (CHỤP AI / THEO APP) */}
        <View style={styles.heroCard}>
          <CircularGauge
            value={totals.kcal}
            target={FITTRACK_CONFIG.TARGET_KCAL}
            hardMax={FITTRACK_CONFIG.SAFE_KCAL_MAX}
          />

          <View style={styles.inOutRow}>
            <View style={styles.inOutBox}>
              <Text style={styles.inOutLabel}>Nạp vào</Text>
              <Text style={[styles.inOutVal, { color: colors.emerald }]}>{totals.kcal} kcal</Text>
            </View>
            <View style={styles.inOutDivider} />
            <View style={styles.inOutBox}>
              <Text style={styles.inOutLabel}>Đốt tập luyện</Text>
              <Text style={[styles.inOutVal, { color: colors.amber }]}>
                -{totals.burnedKcal} kcal
              </Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.logFoodCta, pressed && styles.pressed]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              setFoodModalOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Ghi món bằng chụp ảnh AI hoặc ăn theo menu app"
          >
            <Ionicons name="camera" size={19} color={colors.onAccent} />
            <Text style={styles.logFoodCtaText}>Ghi món (Chụp ảnh AI / Theo App)</Text>
          </Pressable>
        </View>

        {/* 3. ĐẠM & NƯỚC */}
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
              <Text style={styles.metricLabel}>Nước uống</Text>
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
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  onAdjustWater(250);
                }}
              >
                <Text style={styles.waterBtnText}>+250</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.waterBtn,
                  styles.waterBtnPrimary,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  onAdjustWater(500);
                }}
              >
                <Text style={[styles.waterBtnText, { color: colors.onAccent }]}>+500ml</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* 4. BÀI TẬP CHO NGÀY HÔM NAY (THAY CHECKLIST VẬN HÀNH) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="fitness-outline" size={18} color={colors.emerald} />
              <Text style={[TYPO.sectionTitle, { color: colors.textPrimary }]}>
                Bài tập hôm nay ({totals.totalReps} cái)
              </Text>
            </View>
            <Pressable onPress={onNavigateWorkout} hitSlop={8}>
              <Text style={styles.editText}>Thêm bài →</Text>
            </Pressable>
          </View>

          {todayRecord.workouts.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Chưa có bài tập nào cho hôm nay.</Text>
              <Pressable style={styles.smallActionBtn} onPress={onLoadDefaultWorkouts}>
                <Text style={styles.smallActionText}>+ Nạp 3 bài bụng tại nhà (100 cái)</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.listGap}>
              {todayRecord.workouts.map((w) => (
                <Pressable
                  key={w.id}
                  style={({ pressed }) => [
                    styles.workoutRow,
                    w.done && styles.workoutRowDone,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                    onToggleWorkout(w.id);
                  }}
                >
                  <Ionicons
                    name={w.done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={w.done ? colors.emerald : colors.textMuted}
                  />
                  <View style={styles.flex}>
                    <Text style={[styles.workoutName, w.done && styles.workoutNameDone]}>
                      {w.title}
                    </Text>
                    <Text style={styles.workoutMeta}>
                      {w.reps} {w.unit || 'cái'} · Đốt ~{w.estimatedKcal} kcal
                    </Text>
                  </View>
                  <View style={styles.repsPill}>
                    <Text style={styles.repsPillText}>
                      {w.reps} {w.unit || 'cái'}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* 5. DANH SÁCH CALO ĐÃ NẠP HÔM NAY */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="restaurant-outline" size={18} color={colors.amber} />
              <Text style={[TYPO.sectionTitle, { color: colors.textPrimary }]}>
                Món đã nạp hôm nay ({todayRecord.meals.length})
              </Text>
            </View>
            <Pressable onPress={() => setFoodModalOpen(true)} hitSlop={8}>
              <Text style={styles.editText}>+ Ghi món</Text>
            </Pressable>
          </View>

          {todayRecord.meals.length === 0 ? (
            <Text style={styles.emptyText}>
              Chưa ghi món nào hôm nay. Bấm "Ghi món" để chụp ảnh AI hoặc chọn thực đơn có sẵn.
            </Text>
          ) : (
            <View style={styles.listGap}>
              {todayRecord.meals.map((meal) => (
                <View key={meal.id} style={styles.mealRow}>
                  <View style={styles.timeBadge}>
                    <Text style={styles.timeBadgeText}>{meal.timestamp}</Text>
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.mealName} numberOfLines={2}>
                      {meal.name}
                    </Text>
                    <Text style={styles.mealMeta}>
                      {meal.kcal} kcal · {meal.protein}g đạm
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      onRemoveMeal(meal.id);
                    }}
                    hitSlop={10}
                    style={styles.deleteBtn}
                  >
                    <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <FoodLogModal
        visible={foodModalOpen}
        context={{
          currentWeight,
          consumedKcal: totals.kcal,
          consumedProtein: totals.protein,
          burnedKcal: totals.burnedKcal,
          waterMl: totals.waterMl,
        }}
        onClose={() => setFoodModalOpen(false)}
        onConfirmBatch={onAddMealsBatch}
        onAddPreset={onAddPreset}
        onAddMorningCombo={onAddMorningCombo}
      />
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
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    accountPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderStrong,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: RADIUS.full,
    },
    accountPillText: {
      color: c.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    dateText: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.9,
    },
    weightTopCard: {
      backgroundColor: c.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: c.emeraldBorder,
      padding: SPACING.md,
      gap: SPACING.sm,
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
      backgroundColor: c.emeraldDim,
      borderWidth: 1,
      borderColor: c.emeraldBorder,
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
    inOutRow: {
      flexDirection: 'row',
      width: '100%',
      paddingVertical: 10,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: c.border,
    },
    inOutBox: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
    },
    inOutDivider: {
      width: 1,
      backgroundColor: c.border,
    },
    inOutLabel: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    inOutVal: {
      fontSize: 16,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    logFoodCta: {
      width: '100%',
      minHeight: 50,
      borderRadius: RADIUS.md,
      backgroundColor: c.emerald,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    logFoodCtaText: {
      color: c.onAccent,
      fontSize: 14,
      fontWeight: '800',
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
    listGap: {
      gap: 8,
    },
    emptyBox: {
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
    },
    emptyText: {
      color: c.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },
    smallActionBtn: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: RADIUS.full,
      backgroundColor: c.emeraldDim,
      borderWidth: 1,
      borderColor: c.emeraldBorder,
    },
    smallActionText: {
      color: c.emerald,
      fontSize: 12,
      fontWeight: '700',
    },
    workoutRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.surfaceMuted,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: c.border,
      padding: 12,
    },
    workoutRowDone: {
      borderColor: c.emeraldBorder,
    },
    workoutName: {
      color: c.textPrimary,
      fontSize: 13.5,
      fontWeight: '700',
    },
    workoutNameDone: {
      color: c.textSecondary,
      textDecorationLine: 'line-through',
    },
    workoutMeta: {
      color: c.textMuted,
      fontSize: 11.5,
      marginTop: 2,
      fontVariant: ['tabular-nums'],
    },
    repsPill: {
      backgroundColor: c.emeraldDim,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: RADIUS.full,
    },
    repsPillText: {
      color: c.emerald,
      fontSize: 11.5,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    mealRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.surfaceMuted,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: c.border,
      padding: 10,
    },
    timeBadge: {
      backgroundColor: c.surfaceElevated,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: RADIUS.sm,
    },
    timeBadgeText: {
      color: c.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    mealName: {
      color: c.textPrimary,
      fontSize: 13,
      fontWeight: '600',
    },
    mealMeta: {
      color: c.textMuted,
      fontSize: 11.5,
      marginTop: 2,
      fontVariant: ['tabular-nums'],
    },
    deleteBtn: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: { opacity: 0.78 },
  });
