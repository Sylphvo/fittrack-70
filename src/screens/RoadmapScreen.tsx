import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WeightChart } from '../components/WeightChart';
import { EVENING_WORKOUT_PLAN, FITTRACK_CONFIG } from '../config/fittrack';
import { COLORS, RADIUS, SPACING, TYPO } from '../theme/tokens';
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
  const totalToLose = FITTRACK_CONFIG.START_WEIGHT - FITTRACK_CONFIG.TARGET_WEIGHT; // 18.0 kg
  const lostSoFar = Math.max(0, FITTRACK_CONFIG.START_WEIGHT - currentWeight);
  const remainingKg = Math.max(0, currentWeight - FITTRACK_CONFIG.TARGET_WEIGHT);
  const pct = Math.min(100, Math.max(0, Math.round((lostSoFar / totalToLose) * 100)));

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View>
        <Text style={styles.kicker}>LỘ TRÌNH 88.0 KG → 70.0 KG</Text>
        <Text style={[TYPO.title, { color: COLORS.textPrimary }]}>Tiến độ & Kỷ lục</Text>
      </View>

      {/* Journey Progress Card */}
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
            <Text style={[styles.statVal, { color: COLORS.emerald }]}>
              -{lostSoFar.toFixed(1)} kg
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Còn lại</Text>
            <Text style={[styles.statVal, { color: COLORS.amber }]}>
              {remainingKg.toFixed(1)} kg
            </Text>
          </View>
        </View>
      </View>

      {/* SVG Weight Chart */}
      <WeightChart points={weightHistory} />

      {/* Zero-Starch Protocol Specs */}
      <View style={styles.specCard}>
        <Text style={[TYPO.sectionTitle, { color: COLORS.textPrimary }]}>
          Thông số siết mỡ FitTrack 70
        </Text>
        <View style={styles.specGrid}>
          <View style={styles.specItem}>
            <Text style={styles.specKey}>Trần Calo</Text>
            <Text style={[styles.specVal, { color: COLORS.emerald }]}>
              {FITTRACK_CONFIG.TARGET_KCAL} kcal
            </Text>
            <Text style={styles.specNote}>An toàn 1.350–1.500</Text>
          </View>
          <View style={styles.specItem}>
            <Text style={styles.specKey}>Mục tiêu Đạm</Text>
            <Text style={[styles.specVal, { color: COLORS.amber }]}>
              {FITTRACK_CONFIG.TARGET_PROTEIN}g / ngày
            </Text>
            <Text style={styles.specNote}>Giữ cơ khi cắt carb</Text>
          </View>
          <View style={styles.specItem}>
            <Text style={styles.specKey}>Nước & Điện giải</Text>
            <Text style={[styles.specVal, { color: COLORS.cyan }]}>
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

      {/* Daily History Log */}
      <Text style={[TYPO.sectionTitle, { color: COLORS.textPrimary }]}>
        Lịch sử theo ngày ({historyList.length})
      </Text>

      {historyList.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="calendar-outline" size={22} color={COLORS.textMuted} />
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
                          ? COLORS.emeraldDim
                          : COLORS.surfaceElevated,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: day.isClosedOut ? COLORS.emerald : COLORS.textSecondary },
                      ]}
                    >
                      {day.isClosedOut ? 'Đã chốt ngày' : 'Đang ghi nhận'}
                    </Text>
                  </View>
                </View>

                <View style={styles.historyMetrics}>
                  <Text style={[styles.historyMetric, { color: inZone ? COLORS.emerald : COLORS.coral }]}>
                    {kcal} kcal
                  </Text>
                  <Text style={styles.historyDot}>·</Text>
                  <Text style={[styles.historyMetric, { color: COLORS.amber }]}>{protein}g đạm</Text>
                  <Text style={styles.historyDot}>·</Text>
                  <Text style={[styles.historyMetric, { color: COLORS.cyan }]}>{day.waterMl}ml</Text>
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: SPACING.md,
    paddingBottom: 36,
    gap: SPACING.md,
  },
  kicker: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: 14,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  heroPct: {
    color: COLORS.textPrimary,
    fontSize: 34,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  targetBox: {
    backgroundColor: COLORS.emeraldDim,
    borderWidth: 1,
    borderColor: COLORS.emeraldBorder,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    alignItems: 'flex-end',
  },
  targetBoxLabel: {
    color: COLORS.emerald,
    fontSize: 11,
    fontWeight: '600',
  },
  targetBoxVal: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  barTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.border,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: COLORS.emerald,
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
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  statVal: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  specCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    gap: 3,
  },
  specKey: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  specVal: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  specNote: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  historyGap: {
    gap: SPACING.sm,
  },
  historyRow: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 8,
  },
  historyHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDate: {
    color: COLORS.textPrimary,
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
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  historyDot: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
});
