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
import { FITTRACK_CONFIG, ZERO_STARCH_PRESETS } from '../config/fittrack';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SPACING, ThemePalette, TYPO } from '../theme/tokens';
import { MealLogEntry, MealPreset } from '../types/fittrack';

interface MealsScreenProps {
  meals: MealLogEntry[];
  totalKcal: number;
  totalProtein: number;
  onAddPreset: (preset: MealPreset) => void;
  onAddCustom: (meal: { name: string; kcal: number; protein: number }) => void;
  onRemoveMeal: (id: string) => void;
}

export function MealsScreen({
  meals,
  totalKcal,
  totalProtein,
  onAddPreset,
  onAddCustom,
  onRemoveMeal,
}: MealsScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customKcal, setCustomKcal] = useState('');
  const [customProtein, setCustomProtein] = useState('');

  const remaining = FITTRACK_CONFIG.TARGET_KCAL - totalKcal;
  const overHard = totalKcal > FITTRACK_CONFIG.SAFE_KCAL_MAX;

  const handleAddPreset = (preset: MealPreset) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onAddPreset(preset);
  };

  const handleAddCustomSubmit = () => {
    const kcalNum = parseInt(customKcal, 10);
    const proteinNum = parseInt(customProtein || '0', 10);
    if (!customName.trim() || !Number.isFinite(kcalNum) || kcalNum <= 0) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onAddCustom({
      name: customName.trim(),
      kcal: kcalNum,
      protein: Number.isFinite(proteinNum) ? proteinNum : 0,
    });
    setCustomName('');
    setCustomKcal('');
    setCustomProtein('');
    setShowCustomForm(false);
  };

  const handleRemove = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onRemoveMeal(id);
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
            <Text style={styles.kicker}>0% CƠM · 0% ĐƯỜNG</Text>
            <Text style={[TYPO.title, { color: colors.textPrimary }]}>Thực đơn Zero-Starch</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.customToggle, pressed && styles.pressed]}
            onPress={() => setShowCustomForm((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="Mở biểu mẫu thêm món ăn tự nhập"
          >
            <Ionicons name={showCustomForm ? 'close' : 'add'} size={18} color={colors.emerald} />
            <Text style={styles.customToggleText}>{showCustomForm ? 'Đóng' : 'Tự nhập'}</Text>
          </Pressable>
        </View>

        <View style={styles.summaryStrip}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Calo đã nạp</Text>
            <Text style={[styles.summaryValue, { color: overHard ? colors.coral : colors.emerald }]}>
              {totalKcal}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Còn lại</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: remaining < 0 ? colors.coral : colors.textPrimary },
              ]}
            >
              {remaining >= 0 ? remaining : `${remaining}`}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Đạm hôm nay</Text>
            <Text style={[styles.summaryValue, { color: colors.amber }]}>{totalProtein}g</Text>
          </View>
        </View>

        {showCustomForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Thêm món ngoài Preset</Text>
            <TextInput
              value={customName}
              onChangeText={setCustomName}
              placeholder="Tên món (VD: 150g Cá hồi áp chảo)"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              accessibilityLabel="Tên món ăn"
            />
            <View style={styles.formRow}>
              <TextInput
                value={customKcal}
                onChangeText={setCustomKcal}
                placeholder="Kcal (VD: 280)"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={[styles.input, styles.flex]}
                accessibilityLabel="Số kilocalo"
              />
              <TextInput
                value={customProtein}
                onChangeText={setCustomProtein}
                placeholder="Đạm g (VD: 32)"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={[styles.input, styles.flex]}
                accessibilityLabel="Số gam đạm"
              />
            </View>
            <Pressable
              style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}
              onPress={handleAddCustomSubmit}
              accessibilityRole="button"
              accessibilityLabel="Lưu món ăn tự nhập"
            >
              <Text style={styles.submitBtnText}>Lưu vào nhật ký hôm nay</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={[TYPO.sectionTitle, { color: colors.textPrimary }]}>
            Bộ Preset chuẩn (1 chạm)
          </Text>
          <Text style={styles.sectionHint}>Tổng 6 món: 1.310 kcal · 143g đạm</Text>
        </View>

        <View style={styles.listGap}>
          {ZERO_STARCH_PRESETS.map((preset) => (
            <View key={preset.id} style={styles.presetCard}>
              <View style={styles.flex}>
                <View style={styles.presetMetaRow}>
                  <Text style={styles.slotTag}>{preset.slot}</Text>
                  <Text style={styles.catTag}>{preset.category}</Text>
                </View>
                <Text style={styles.presetName}>{preset.name}</Text>
                <Text style={styles.presetMacros}>
                  <Text style={{ color: colors.emerald, fontWeight: '700' }}>
                    {preset.kcal} kcal
                  </Text>
                  {'  ·  '}
                  <Text style={{ color: colors.amber, fontWeight: '700' }}>
                    {preset.protein}g đạm
                  </Text>
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [styles.addCircle, pressed && styles.pressed]}
                onPress={() => handleAddPreset(preset)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Thêm ${preset.name}`}
              >
                <Ionicons name="add" size={22} color={colors.onAccent} />
              </Pressable>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[TYPO.sectionTitle, { color: colors.textPrimary }]}>
            Nhật ký hôm nay ({meals.length})
          </Text>
        </View>

        {meals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="restaurant-outline" size={24} color={colors.textMuted} />
            <Text style={styles.emptyText}>
              Chưa ghi nhận bữa nào hôm nay. Chạm dấu + ở Preset bên trên để nạp nhanh.
            </Text>
          </View>
        ) : (
          <View style={styles.listGap}>
            {meals.map((entry) => (
              <View key={entry.id} style={styles.logRow}>
                <View style={styles.timeBadge}>
                  <Text style={styles.timeBadgeText}>{entry.timestamp}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.logName} numberOfLines={2}>
                    {entry.name}
                  </Text>
                  <Text style={styles.logMacros}>
                    {entry.kcal} kcal · {entry.protein}g đạm
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleRemove(entry.id)}
                  hitSlop={12}
                  style={styles.deleteBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Xóa ${entry.name}`}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            ))}
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
    customToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: RADIUS.full,
      backgroundColor: c.emeraldDim,
      borderWidth: 1,
      borderColor: c.emeraldBorder,
    },
    customToggleText: {
      color: c.emerald,
      fontSize: 12,
      fontWeight: '700',
    },
    summaryStrip: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 14,
      paddingHorizontal: SPACING.sm,
      alignItems: 'center',
    },
    summaryCol: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
    },
    summaryLabel: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    summaryValue: {
      fontSize: 20,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    divider: {
      width: 1,
      height: 28,
      backgroundColor: c.border,
    },
    formCard: {
      backgroundColor: c.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: c.emeraldBorder,
      padding: SPACING.md,
      gap: SPACING.sm,
    },
    formTitle: {
      color: c.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    formRow: {
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
      height: 44,
      borderRadius: RADIUS.sm,
      backgroundColor: c.emerald,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitBtnText: {
      color: c.onAccent,
      fontSize: 14,
      fontWeight: '800',
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    sectionHint: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
    listGap: {
      gap: SPACING.sm,
    },
    presetCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
    },
    presetMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    slotTag: {
      color: c.cyan,
      fontSize: 11,
      fontWeight: '700',
    },
    catTag: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    presetName: {
      color: c.textPrimary,
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 20,
    },
    presetMacros: {
      color: c.textSecondary,
      fontSize: 12,
      marginTop: 4,
      fontVariant: ['tabular-nums'],
    },
    addCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.emerald,
      alignItems: 'center',
      justifyContent: 'center',
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
    logRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: c.border,
      padding: 12,
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
    logName: {
      color: c.textPrimary,
      fontSize: 13,
      fontWeight: '600',
    },
    logMacros: {
      color: c.textMuted,
      fontSize: 12,
      marginTop: 2,
      fontVariant: ['tabular-nums'],
    },
    deleteBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: {
      opacity: 0.78,
    },
  });
