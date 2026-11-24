import React, { memo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { FITTRACK_CONFIG } from '../config/fittrack';
import { COLORS, RADIUS, SPACING } from '../theme/tokens';

interface WeightPoint {
  dateKey: string;
  weightKg: number;
}

interface WeightChartProps {
  points: WeightPoint[];
}

export const WeightChart = memo(function WeightChart({ points }: WeightChartProps) {
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(260, width - SPACING.md * 4);
  const chartHeight = 160;
  const padX = 16;
  const padY = 18;

  const weights = points.map((p) => p.weightKg);
  const minW = Math.min(FITTRACK_CONFIG.TARGET_WEIGHT - 1, ...weights);
  const maxW = Math.max(FITTRACK_CONFIG.START_WEIGHT + 1, ...weights);
  const range = Math.max(1, maxW - minW);

  const mapY = (w: number) =>
    padY + ((maxW - w) / range) * (chartHeight - padY * 2);

  const mapX = (index: number) => {
    if (points.length <= 1) return chartWidth / 2;
    return padX + (index / (points.length - 1)) * (chartWidth - padX * 2);
  };

  const coords = points.map((p, idx) => ({
    x: mapX(idx),
    y: mapY(p.weightKg),
    ...p,
  }));

  const linePath = coords
    .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');

  const areaPath =
    coords.length > 1
      ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(chartHeight - padY).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(chartHeight - padY).toFixed(1)} Z`
      : '';

  const targetY = mapY(FITTRACK_CONFIG.TARGET_WEIGHT);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Biểu đồ cân nặng</Text>
        <Text style={styles.legend}>Mục tiêu {FITTRACK_CONFIG.TARGET_WEIGHT.toFixed(1)} kg</Text>
      </View>

      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <LinearGradient id="weightArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={COLORS.emerald} stopOpacity={0.28} />
            <Stop offset="100%" stopColor={COLORS.emerald} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {/* Target 70kg dashed line */}
        <Line
          x1={padX}
          y1={targetY}
          x2={chartWidth - padX}
          y2={targetY}
          stroke={COLORS.emerald}
          strokeWidth={1.2}
          strokeDasharray="5 5"
          opacity={0.7}
        />

        {areaPath ? <Path d={areaPath} fill="url(#weightArea)" /> : null}

        {coords.length > 1 ? (
          <Path
            d={linePath}
            fill="none"
            stroke={COLORS.emerald}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {coords.map((pt) => (
          <Circle
            key={pt.dateKey}
            cx={pt.x}
            cy={pt.y}
            r={4.5}
            fill={COLORS.bg}
            stroke={COLORS.emerald}
            strokeWidth={2.5}
          />
        ))}
      </Svg>

      <View style={styles.axisRow}>
        <Text style={styles.axisLabel}>
          Khởi điểm: {FITTRACK_CONFIG.START_WEIGHT.toFixed(1)} kg
        </Text>
        <Text style={styles.axisLabel}>
          Hiện tại: {points[points.length - 1]?.weightKg.toFixed(1)} kg
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  legend: {
    color: COLORS.emerald,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  axisLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
});
