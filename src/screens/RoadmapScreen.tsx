import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { WeightChart } from '../components/WeightChart';
import { EVENING_WORKOUT_PLAN, FITTRACK_CONFIG } from '../config/fittrack';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SPACING, ThemePalette, TYPO } from '../theme/tokens';
import { DailyRecord } from '../types/fittrack';

interface RoadmapScreenProps {
  currentWeight: number;
  weightHistory: { dateKey: string; weightKg: number }[];
  historyList: DailyRecord[];
}

export function RoadmapScreen({
  currentWeight,
  weightHistory,
  historyList,
}: RoadmapScreenProps) {
  const { colors, mode, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const totalToLose = FITTRACK_CONFIG.START_WEIGHT - FITTRACK_CONFIG.TARGET_WEIGHT;
  const lostSoFar = Math.max(0, FITTRACK_CONFIG.START_WEIGHT - currentWeight);
  const remainingKg = Math.max(0, currentWeight - FITTRACK_CONFIG.TARGET_WEIGHT);
  const pct = Math.min(100, Math.max(0, Math.round((lostSoFar / totalToLose) * 100)));

  const handleToggleTheme = () => {
    Haptics.selectionAsync().catch(() => {});
    toggleTheme();
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.kicker}>LỘ TRÌNH 88.0 KG → 70.0 KG</Text>
          <Text style={[TYPO.title, { color: colors.textPrimary }]}>Tiến độ & Kỷ lục</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.themePill, pressed && styles.pressed]}
          onPress={handleToggleTheme}
          accessibilityRole="button"
          accessibilityLabel="Đổi giao diện sáng tối"
        >
          <Ionicons
            name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'}
            size={15}
            color={mode === 'dark' ? colors.amber : colors.textPrimary}
          />
          <Text style={styles.themePillText}>{mode === 'dark' ? 'Nền sáng' : 'Nền tối'}</Text>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>Hoàn thành mục tiêu</Text>
            <Text style={styles.heroPct}>{pct}%</Text>
          </View>
          <View style={styles.targetBox}>
            <Text style={styles.targetBoxLabel}>Mục tiêu</Text>
            <Text style={styles.targetBoxVal}>{FITTRACK_CONFIG.TARGET_WEIGHT.toFixed(1)} kg</Text>
          </View>
        </View>

        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${pct}%` }]} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Khởi điểm</Text>
            <Text style={styles.statVal}>{FITTRACK_CONFIG.START_WEIGHT.toFixed(1)} kg</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Đã giảm</Text>
            <Text style={[styles.statVal, { color: colors.emerald }]}>
              -{lostSoFar.toFixed(1)} kg
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Còn lại</Text>
            <Text style={[styles.statVal, { color: colors.amber }]}>
              {remainingKg.toFixed(1)} kg
            </Text>
          </View>
        </View>
      </View>

      <WeightChart points={weightHistory} />

      <View style={styles.specCard}>
        <Text style={[TYPO.sectionTitle, { color: colors.textPrimary }]}>
          Thông số siết mỡ FitTrack 70
        </Text>
        <View style={styles.specGrid}>
          <View style={styles.specItem}>
            <Text style={styles.specKey}>Trần Calo</Text>
            <Text style={[styles.specVal, { color: colors.emerald }]}>
              {FITTRACK_CONFIG.TARGET_KCAL} kcal
            </Text>
            <Text style={styles.specNote}>An toàn 1.350–1.500</Text>
          </View>
          <View style={styles.specItem}>
            <Text style={styles.specKey}>Mục tiêu Đạm</Text>
            <Text style={[styles.specVal, { color: colors.amber }]}>
              {FITTRACK_CONFIG.TARGET_PROTEIN}g / ngày
            </Text>
            <Text style={styles.specNote}>Giữ cơ khi cắt carb</Text>
          </View>
          <View style={styles.specItem}>
            <Text style={styles.specKey}>Nước & Điện giải</Text>
            <Text style={[styles.specVal, { color: colors.cyan }]}>
              {FITTRACK_CONFIG.TARGET_WATER} ml
            </Text>
            <Text style={styles.specNote}>Kèm chanh muối loãng</Text>
          </View>
          <View style={styles.specItem}>
            <Text style={styles.specKey}>Tập & Ngủ</Text>
            <Text style={styles.specVal}>{FITTRACK_CONFIG.WORKOUT_WINDOW}</Text>
            <Text style={styles.specNote}>Ngủ trước {FITTRACK_CONFIG.SLEEP_TARGET}</Text>
          </View>
        </View>
      </View>

      <Text style={[TYPO.sectionTitle, { color: colors.textPrimary }]}>
        Lịch sử theo ngày ({historyList.length})
      </Text>

      {historyList.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="calendar-outline" size={22} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            Chưa có dữ liệu lịch sử. Hãy bắt đầu ghi cân nặng và bữa ăn ở tab Hôm nay.
          </Text>
        </View>
      ) : (
        <View style={styles.historyGap}>
          {historyList.map((day) => {
            const kcal = day.meals.reduce((s, m) => s + m.kcal, 0);
            const protein = day.meals.reduce((s, m) => s + m.protein, 0);
            const inZone = kcal <= FITTRACK_CONFIG.SAFE_KCAL_MAX;

            return (
              <View key={day.dateKey} style={styles.historyRow}>
                <View style={styles.historyHead}>
                  <Text style={styles.historyDate}>{day.dateKey}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: day.isClosedOut
                          ? colors.emeraldDim
                          : colors.surfaceElevated,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: day.isClosedOut ? colors.emerald : colors.textSecondary },
                      ]}
                    >
                      {day.isClosedOut ? 'Đã chốt ngày' : 'Đang ghi nhận'}
                    </Text>
                  </View>
                </View>

                <View style={styles.historyMetrics}>
                  <Text style={[styles.historyMetric, { color: inZone ? colors.emerald : colors.coral }]}>
                    {kcal} kcal
                  </Text>
                  <Text style={styles.historyDot}>·</Text>
                  <Text style={[styles.historyMetric, { color: colors.amber }]}>{protein}g đạm</Text>
                  <Text style={styles.historyDot}>·</Text>
                  <Text style={[styles.historyMetric, { color: colors.cyan }]}>{day.waterMl}ml</Text>
                  <Text style={styles.historyDot}>·</Text>
                  <Text style={styles.historyMetric}>
                    Tập {day.completedWorkouts.length}/{EVENING_WORKOUT_PLAN.length}
                  </Text>
                  {day.weightKg !== null ? (
                    <>
                      <Text style={styles.historyDot}>·</Text>
                      <Text style={styles.historyMetric}>{day.weightKg.toFixed(1)} kg</Text>
                    </>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
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
    themePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderStrong,
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: RADIUS.full,
    },
    themePillText: {
      color: c.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    kicker: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.9,
    },
    heroCard: {
      backgroundColor: c.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: SPACING.md,
      gap: 14,
    },
    heroTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    heroLabel: {
      color: c.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    heroPct: {
      color: c.textPrimary,
      fontSize: 34,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    targetBox: {
      backgroundColor: c.emeraldDim,
      borderWidth: 1,
      borderColor: c.emeraldBorder,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: RADIUS.md,
      alignItems: 'flex-end',
    },
    targetBoxLabel: {
      color: c.emerald,
      fontSize: 11,
      fontWeight: '600',
    },
    targetBoxVal: {
      color: c.textPrimary,
      fontSize: 18,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    barTrack: {
      height: 10,
      borderRadius: 5,
      backgroundColor: c.border,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: 5,
      backgroundColor: c.emerald,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 4,
    },
    statItem: {
      gap: 2,
    },
    statLabel: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    statVal: {
      color: c.textPrimary,
      fontSize: 16,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    specCard: {
      backgroundColor: c.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: SPACING.md,
      gap: SPACING.sm,
    },
    specGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
    },
    specItem: {
      width: '48%',
      backgroundColor: c.surfaceMuted,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: c.border,
      padding: 12,
      gap: 3,
    },
    specKey: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    specVal: {
      color: c.textPrimary,
      fontSize: 15,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    specNote: {
      color: c.textSecondary,
      fontSize: 11,
    },
    emptyCard: {
      backgroundColor: c.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: c.border,
      padding: SPACING.lg,
      alignItems: 'center',
      gap: 8,
    },
    emptyText: {
      color: c.textSecondary,
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 19,
    },
    historyGap: {
      gap: SPACING.sm,
    },
    historyRow: {
      backgroundColor: c.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      gap: 8,
    },
    historyHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    historyDate: {
      color: c.textPrimary,
      fontSize: 14,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    statusBadge: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: RADIUS.full,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    historyMetrics: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
    },
    historyMetric: {
      color: c.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    historyDot: {
      color: c.textMuted,
      fontSize: 12,
    },
    pressed: {
      opacity: 0.78,
    },
  });
