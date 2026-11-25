import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { FITTRACK_CONFIG } from '../config/fittrack';
import { TrajectoryPoint } from '../store/useFitTrackStore';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SPACING, ThemePalette } from '../theme/tokens';

interface WeightChartProps {
  points: TrajectoryPoint[];
}

export const WeightChart = memo(function WeightChart({ points }: WeightChartProps) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const chartWidth = Math.max(260, Math.min(width, 430) - SPACING.md * 4);
  const chartHeight = 168;
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
  const firstPt = points[0];
  const lastPt = points[points.length - 1];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Biểu đồ lộ trình (Calo + Cân thực tế)</Text>
        <Text style={styles.legend}>Mục tiêu {FITTRACK_CONFIG.TARGET_WEIGHT.toFixed(1)} kg</Text>
      </View>

      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <LinearGradient id="weightArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.emerald} stopOpacity={0.28} />
            <Stop offset="100%" stopColor={colors.emerald} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        <Line
          x1={padX}
          y1={targetY}
          x2={chartWidth - padX}
          y2={targetY}
          stroke={colors.emerald}
          strokeWidth={1.2}
          strokeDasharray="5 5"
          opacity={0.7}
        />

        {areaPath ? <Path d={areaPath} fill="url(#weightArea)" /> : null}

        {coords.length > 1 ? (
          <Path
            d={linePath}
            fill="none"
            stroke={colors.emerald}
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
            r={pt.isActual ? 5 : 3.5}
            fill={pt.isActual ? colors.emerald : colors.surface}
            stroke={pt.isActual ? colors.emerald : colors.cyan}
            strokeWidth={2}
          />
        ))}
      </Svg>

      <View style={styles.axisRow}>
        <Text style={styles.axisLabel}>
          Bắt đầu: {firstPt?.dateKey ?? ''} ({firstPt?.weightKg.toFixed(1) ?? '88.0'} kg)
        </Text>
        <Text style={styles.axisLabel}>
          Hôm nay: {lastPt?.weightKg.toFixed(1) ?? '88.0'} kg
        </Text>
      </View>

      <View style={styles.dotLegendRow}>
        <View style={styles.dotLegendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.emerald }]} />
          <Text style={styles.dotLegendText}>Cân thực tế</Text>
        </View>
        <View style={styles.dotLegendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.cyan },
            ]}
          />
          <Text style={styles.dotLegendText}>Ước tính từ Calo ngày</Text>
        </View>
      </View>
    </View>
  );
});

const createStyles = (c: ThemePalette) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: SPACING.md,
      gap: 6,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      color: c.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    legend: {
      color: c.emerald,
      fontSize: 11.5,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    axisRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    axisLabel: {
      color: c.textSecondary,
      fontSize: 11.5,
      fontVariant: ['tabular-nums'],
    },
    dotLegendRow: {
      flexDirection: 'row',
      gap: 14,
      marginTop: 2,
    },
    dotLegendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    dotLegendText: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
  });
