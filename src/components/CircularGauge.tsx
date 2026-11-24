import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { ThemePalette, TYPO } from '../theme/tokens';

interface CircularGaugeProps {
  value: number;
  target: number;
  hardMax: number;
  size?: number;
  strokeWidth?: number;
}

export const CircularGauge = memo(function CircularGauge({
  value,
  target,
  hardMax,
  size = 196,
  strokeWidth = 14,
}: CircularGaugeProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedRatio = Math.min(Math.max(value / target, 0), 1);
  const strokeDashoffset = circumference * (1 - clampedRatio);

  const isOverHard = value > hardMax;
  const isCaution = value > target && value <= hardMax;
  const activeColor = isOverHard
    ? colors.coral
    : isCaution
      ? colors.amber
      : colors.emerald;

  const remaining = target - value;
  const statusLabel = isOverHard
    ? `Vượt trần ${value - hardMax} kcal`
    : isCaution
      ? `Vùng biên (+${value - target} kcal)`
      : `Còn ${remaining} kcal`;

  return (
    <View
      style={[styles.wrapper, { width: size, height: size }]}
      accessibilityLabel={`Đã nạp ${value} trên ${target} kilocalo. ${statusLabel}`}
    >
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={activeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      <View style={styles.center}>
        <Text style={styles.kicker}>ĐÃ NẠP HÔM NAY</Text>
        <Text style={[TYPO.heroNumber, { color: colors.textPrimary }]}>{value}</Text>
        <Text style={styles.targetText}>/ {target} kcal</Text>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: isOverHard
                ? colors.coralDim
                : isCaution
                  ? colors.amberDim
                  : colors.emeraldDim,
            },
          ]}
        >
          <Text style={[styles.badgeText, { color: activeColor }]}>{statusLabel}</Text>
        </View>
      </View>
    </View>
  );
});

const createStyles = (c: ThemePalette) =>
  StyleSheet.create({
    wrapper: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    svg: {
      position: 'absolute',
    },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    kicker: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1,
      color: c.textMuted,
      marginBottom: 2,
    },
    targetText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
      fontVariant: ['tabular-nums'],
      marginTop: -2,
    },
    badge: {
      marginTop: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
  });
