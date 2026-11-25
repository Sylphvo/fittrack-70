import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
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
import * as ImagePicker from 'expo-image-picker';
import { ZERO_STARCH_PRESETS } from '../config/fittrack';
import {
  analyzeFoodPhotoForReview,
  DailyCoachContext,
  loadGeminiApiKey,
  saveGeminiApiKey,
} from '../services/aiCoach';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SPACING, ThemePalette } from '../theme/tokens';
import { FoodPhotoReview, MealPreset } from '../types/fittrack';

interface FoodLogModalProps {
  visible: boolean;
  context: DailyCoachContext;
  onClose: () => void;
  onConfirmBatch: (
    items: {
      name: string;
      kcal: number;
      protein: number;
      source: 'ai_photo' | 'app_menu' | 'manual';
      presetId?: string;
    }[]
  ) => void;
  onAddPreset: (preset: MealPreset) => void;
  onAddMorningCombo: () => void;
}

export function FoodLogModal({
  visible,
  context,
  onClose,
  onConfirmBatch,
  onAddPreset,
  onAddMorningCombo,
}: FoodLogModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [option, setOption] = useState<'photo' | 'app_menu'>('photo');
  const [apiKey, setApiKey] = useState('');
  const [draftKey, setDraftKey] = useState('');
  const [showKeyBox, setShowKeyBox] = useState(false);

  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [review, setReview] = useState<FoodPhotoReview | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualKcal, setManualKcal] = useState('');
  const [manualProtein, setManualProtein] = useState('');

  useEffect(() => {
    if (visible) {
      loadGeminiApiKey().then((stored) => {
        setApiKey(stored);
        setDraftKey(stored);
      });
    }
  }, [visible]);

  const handleSaveKey = async () => {
    await saveGeminiApiKey(draftKey);
    setApiKey(draftKey.trim());
    setShowKeyBox(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const pickWebFile = (
    useCamera: boolean
  ): Promise<{ uri: string; base64: string; mimeType: string } | null> => {
    return new Promise((resolve) => {
      if (typeof document === 'undefined') {
        resolve(null);
        return;
      }
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      if (useCamera) fileInput.setAttribute('capture', 'environment');
      fileInput.onchange = () => {
        const file = fileInput.files?.[0];
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || '');
          const idx = dataUrl.indexOf(',');
          resolve({
            uri: dataUrl,
            base64: idx >= 0 ? dataUrl.slice(idx + 1) : '',
            mimeType: file.type || 'image/jpeg',
          });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      };
      fileInput.click();
    });
  };

  const handleScanPhoto = async (source: 'camera' | 'library') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setScanError(null);

    try {
      let uri = '';
      let base64 = '';
      let mimeType = 'image/jpeg';

      if (Platform.OS === 'web') {
        const picked = await pickWebFile(source === 'camera');
        if (!picked) return;
        uri = picked.uri;
        base64 = picked.base64;
        mimeType = picked.mimeType;
      } else {
        const perm =
          source === 'camera'
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Cần cấp quyền', 'Vui lòng cấp quyền Camera/Ảnh trong Cài đặt iPhone.');
          return;
        }
        const res =
          source === 'camera'
            ? await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.65,
                base64: true,
              })
            : await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.65,
                base64: true,
              });
        if (res.canceled || !res.assets?.[0]) return;
        uri = res.assets[0].uri;
        base64 = res.assets[0].base64 || '';
        mimeType = res.assets[0].mimeType || 'image/jpeg';
      }

      setPreviewUri(uri);
      setReview(null);
      setIsScanning(true);

      const analyzed = await analyzeFoodPhotoForReview(base64, mimeType, context, apiKey);
      setReview(analyzed);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Không thể phân tích ảnh lúc này.');
    } finally {
      setIsScanning(false);
    }
  };

  const toggleReviewItem = (id: string) => {
    setReview((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((it) =>
              it.id === id ? { ...it, selected: !it.selected } : it
            ),
          }
        : null
    );
  };

  const handleConfirmReview = () => {
    if (!review) return;
    const chosen = review.items.filter((i) => i.selected);
    if (chosen.length === 0) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onConfirmBatch(
      chosen.map((i) => ({
        name: i.name,
        kcal: i.kcal,
        protein: i.protein,
        source: 'ai_photo',
      }))
    );
    setReview(null);
    setPreviewUri(null);
    onClose();
  };

  const handleAddManual = () => {
    const kcal = parseInt(manualKcal, 10);
    const protein = parseInt(manualProtein || '0', 10);
    if (!manualName.trim() || !Number.isFinite(kcal) || kcal <= 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onConfirmBatch([
      {
        name: manualName.trim(),
        kcal,
        protein: Number.isFinite(protein) ? protein : 0,
        source: 'manual',
      },
    ]);
    setManualName('');
    setManualKcal('');
    setManualProtein('');
    setShowManual(false);
    onClose();
  };

  const selectedTotals = useMemo(() => {
    if (!review) return { kcal: 0, protein: 0, count: 0 };
    const chosen = review.items.filter((i) => i.selected);
    return {
      kcal: chosen.reduce((s, i) => s + i.kcal, 0),
      protein: chosen.reduce((s, i) => s + i.protein, 0),
      count: chosen.length,
    };
  }, [review]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Ghi món hôm nay</Text>
            <View style={styles.headerRight}>
              <Pressable
                style={styles.keyChip}
                onPress={() => setShowKeyBox((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel="Cấu hình Gemini API Key"
              >
                <Ionicons
                  name={apiKey ? 'key' : 'key-outline'}
                  size={14}
                  color={apiKey ? colors.emerald : colors.amber}
                />
                <Text style={[styles.keyChipText, { color: apiKey ? colors.emerald : colors.amber }]}>
                  {apiKey ? 'Gemini Live' : 'Key AI'}
                </Text>
              </Pressable>
              <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>

          {showKeyBox ? (
            <View style={styles.keyBox}>
              <Text style={styles.keyHint}>Dán Gemini API Key (aistudio.google.com) để quét ảnh thật:</Text>
              <View style={styles.rowGap}>
                <TextInput
                  value={draftKey}
                  onChangeText={setDraftKey}
                  placeholder="AIza..."
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  autoCapitalize="none"
                  style={[styles.input, styles.flex]}
                />
                <Pressable style={styles.smallSaveBtn} onPress={handleSaveKey}>
                  <Text style={styles.smallSaveText}>Lưu</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* 2 Options Segment Switch */}
          <View style={styles.segmentWrap}>
            <Pressable
              style={[styles.segmentBtn, option === 'photo' && styles.segmentBtnActive]}
              onPress={() => setOption('photo')}
            >
              <Ionicons
                name="camera-outline"
                size={16}
                color={option === 'photo' ? colors.onAccent : colors.textSecondary}
              />
              <Text style={[styles.segmentText, option === 'photo' && styles.segmentTextActive]}>
                1. Tự chụp (Custom)
              </Text>
            </Pressable>
            <Pressable
              style={[styles.segmentBtn, option === 'app_menu' && styles.segmentBtnActive]}
              onPress={() => setOption('app_menu')}
            >
              <Ionicons
                name="restaurant-outline"
                size={16}
                color={option === 'app_menu' ? colors.onAccent : colors.textSecondary}
              />
              <Text style={[styles.segmentText, option === 'app_menu' && styles.segmentTextActive]}>
                2. Ăn theo App
              </Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {option === 'photo' ? (
              <>
                <View style={styles.rowGap}>
                  <Pressable
                    style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
                    onPress={() => handleScanPhoto('camera')}
                    disabled={isScanning}
                  >
                    <Ionicons name="camera" size={18} color={colors.onAccent} />
                    <Text style={styles.primaryActionText}>Chụp món ăn</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
                    onPress={() => handleScanPhoto('library')}
                    disabled={isScanning}
                  >
                    <Ionicons name="images-outline" size={18} color={colors.textPrimary} />
                    <Text style={styles.secondaryActionText}>Chọn từ ảnh</Text>
                  </Pressable>
                </View>

                {previewUri ? (
                  <Image source={{ uri: previewUri }} style={styles.previewImg} resizeMode="cover" />
                ) : null}

                {isScanning ? (
                  <View style={styles.scanStateBox}>
                    <ActivityIndicator size="small" color={colors.emerald} />
                    <Text style={styles.scanStateText}>
                      AI đang nhận diện món ăn & tính calo...
                    </Text>
                  </View>
                ) : null}

                {scanError ? <Text style={styles.errorText}>{scanError}</Text> : null}

                {/* Review List before Confirming */}
                {review ? (
                  <View style={styles.reviewCard}>
                    <Text style={styles.reviewTitle}>
                      Đọc sơ qua danh sách AI nhận diện (chạm để bỏ chọn món sai):
                    </Text>

                    {review.items.map((item) => (
                      <Pressable
                        key={item.id}
                        style={[styles.reviewRow, !item.selected && styles.reviewRowMuted]}
                        onPress={() => toggleReviewItem(item.id)}
                      >
                        <Ionicons
                          name={item.selected ? 'checkbox' : 'square-outline'}
                          size={22}
                          color={item.selected ? colors.emerald : colors.textMuted}
                        />
                        <View style={styles.flex}>
                          <Text style={styles.reviewItemName}>{item.name}</Text>
                          <Text style={styles.reviewItemMeta}>
                            {item.kcal} kcal · {item.protein}g đạm
                            {item.hasStarch ? ' · Có tinh bột' : ' · 0% tinh bột'}
                          </Text>
                        </View>
                      </Pressable>
                    ))}

                    <Text style={styles.adviceText}>{review.advice}</Text>

                    <Pressable
                      style={({ pressed }) => [
                        styles.confirmBtn,
                        selectedTotals.count === 0 && { opacity: 0.4 },
                        pressed && styles.pressed,
                      ]}
                      onPress={handleConfirmReview}
                      disabled={selectedTotals.count === 0}
                    >
                      <Ionicons name="checkmark-circle" size={19} color={colors.onAccent} />
                      <Text style={styles.confirmBtnText}>
                        Đồng ý & Cộng +{selectedTotals.kcal} kcal ({selectedTotals.protein}g đạm)
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                {/* Optional Manual Entry */}
                <Pressable
                  style={styles.manualToggle}
                  onPress={() => setShowManual((v) => !v)}
                >
                  <Text style={styles.manualToggleText}>
                    {showManual ? 'Ẩn nhập tay' : '+ Hoặc tự gõ tên món & calo thủ công'}
                  </Text>
                </Pressable>

                {showManual ? (
                  <View style={styles.manualCard}>
                    <TextInput
                      value={manualName}
                      onChangeText={setManualName}
                      placeholder="Tên món (VD: 2 trứng luộc)"
                      placeholderTextColor={colors.textMuted}
                      style={styles.input}
                    />
                    <View style={styles.rowGap}>
                      <TextInput
                        value={manualKcal}
                        onChangeText={setManualKcal}
                        placeholder="Kcal"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        style={[styles.input, styles.flex]}
                      />
                      <TextInput
                        value={manualProtein}
                        onChangeText={setManualProtein}
                        placeholder="Đạm (g)"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        style={[styles.input, styles.flex]}
                      />
                    </View>
                    <Pressable style={styles.confirmBtn} onPress={handleAddManual}>
                      <Text style={styles.confirmBtnText}>Thêm vào hôm nay</Text>
                    </Pressable>
                  </View>
                ) : null}
              </>
            ) : (
              <>
                {/* Option 2: Ăn theo App */}
                <Pressable
                  style={({ pressed }) => [styles.comboBanner, pressed && styles.pressed]}
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                    onAddMorningCombo();
                    onClose();
                  }}
                >
                  <Ionicons name="sunny-outline" size={20} color={colors.amber} />
                  <View style={styles.flex}>
                    <Text style={styles.comboTitle}>Combo 07:15 Sáng (1 chạm)</Text>
                    <Text style={styles.comboSub}>
                      3 Trứng + Americano + 500ml nước · 210 kcal · 16g đạm
                    </Text>
                  </View>
                  <Ionicons name="add-circle" size={24} color={colors.amber} />
                </Pressable>

                {ZERO_STARCH_PRESETS.map((preset) => (
                  <View key={preset.id} style={styles.presetRow}>
                    <View style={styles.flex}>
                      <Text style={styles.presetSlot}>
                        {preset.slot} · {preset.category}
                      </Text>
                      <Text style={styles.presetName}>{preset.name}</Text>
                      <Text style={styles.presetMeta}>
                        {preset.kcal} kcal · {preset.protein}g đạm
                      </Text>
                    </View>
                    <Pressable
                      style={({ pressed }) => [styles.addPresetBtn, pressed && styles.pressed]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                        onAddPreset(preset);
                      }}
                    >
                      <Ionicons name="add" size={20} color={colors.onAccent} />
                    </Pressable>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (c: ThemePalette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'flex-end',
    },
    sheet: {
      height: '86%',
      backgroundColor: c.bg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 1,
      borderColor: c.borderStrong,
      paddingTop: SPACING.md,
      paddingHorizontal: SPACING.md,
    },
    sheetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    sheetTitle: {
      color: c.textPrimary,
      fontSize: 18,
      fontWeight: '800',
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    keyChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: RADIUS.full,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderStrong,
    },
    keyChipText: {
      fontSize: 11,
      fontWeight: '700',
    },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keyBox: {
      backgroundColor: c.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: c.borderStrong,
      padding: 10,
      gap: 8,
      marginBottom: SPACING.sm,
    },
    keyHint: {
      color: c.textSecondary,
      fontSize: 11,
    },
    segmentWrap: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: RADIUS.md,
      padding: 4,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: SPACING.md,
    },
    segmentBtn: {
      flex: 1,
      minHeight: 40,
      borderRadius: RADIUS.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    segmentBtnActive: {
      backgroundColor: c.emerald,
    },
    segmentText: {
      color: c.textSecondary,
      fontSize: 12.5,
      fontWeight: '700',
    },
    segmentTextActive: {
      color: c.onAccent,
    },
    scrollContent: {
      paddingBottom: 32,
      gap: 12,
    },
    rowGap: {
      flexDirection: 'row',
      gap: SPACING.sm,
    },
    primaryAction: {
      flex: 1,
      minHeight: 48,
      borderRadius: RADIUS.md,
      backgroundColor: c.emerald,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },
    primaryActionText: {
      color: c.onAccent,
      fontSize: 14,
      fontWeight: '800',
    },
    secondaryAction: {
      flex: 1,
      minHeight: 48,
      borderRadius: RADIUS.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderStrong,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },
    secondaryActionText: {
      color: c.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    previewImg: {
      width: '100%',
      height: 170,
      borderRadius: RADIUS.md,
      backgroundColor: c.surface,
    },
    scanStateBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      padding: 14,
      borderRadius: RADIUS.md,
      backgroundColor: c.surface,
    },
    scanStateText: {
      color: c.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    errorText: {
      color: c.coral,
      fontSize: 13,
      fontWeight: '600',
    },
    reviewCard: {
      backgroundColor: c.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: c.emeraldBorder,
      padding: 14,
      gap: 10,
    },
    reviewTitle: {
      color: c.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    reviewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: RADIUS.sm,
      backgroundColor: c.surfaceMuted,
      borderWidth: 1,
      borderColor: c.border,
    },
    reviewRowMuted: {
      opacity: 0.45,
    },
    reviewItemName: {
      color: c.textPrimary,
      fontSize: 13.5,
      fontWeight: '700',
    },
    reviewItemMeta: {
      color: c.textSecondary,
      fontSize: 12,
      marginTop: 2,
      fontVariant: ['tabular-nums'],
    },
    adviceText: {
      color: c.textSecondary,
      fontSize: 12,
      lineHeight: 17,
    },
    confirmBtn: {
      minHeight: 48,
      borderRadius: RADIUS.md,
      backgroundColor: c.emerald,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: 12,
    },
    confirmBtnText: {
      color: c.onAccent,
      fontSize: 13.5,
      fontWeight: '800',
    },
    manualToggle: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    manualToggleText: {
      color: c.emerald,
      fontSize: 13,
      fontWeight: '700',
    },
    manualCard: {
      backgroundColor: c.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: c.border,
      padding: 12,
      gap: 10,
    },
    input: {
      height: 42,
      backgroundColor: c.bg,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: RADIUS.sm,
      paddingHorizontal: 12,
      color: c.textPrimary,
      fontSize: 14,
    },
    smallSaveBtn: {
      height: 42,
      paddingHorizontal: 16,
      borderRadius: RADIUS.sm,
      backgroundColor: c.emerald,
      alignItems: 'center',
      justifyContent: 'center',
    },
    smallSaveText: {
      color: c.onAccent,
      fontWeight: '800',
      fontSize: 13,
    },
    comboBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: c.amberBorder,
      padding: 12,
    },
    comboTitle: {
      color: c.textPrimary,
      fontSize: 13.5,
      fontWeight: '700',
    },
    comboSub: {
      color: c.textSecondary,
      fontSize: 11.5,
      marginTop: 2,
    },
    presetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: c.border,
      padding: 12,
    },
    presetSlot: {
      color: c.cyan,
      fontSize: 11,
      fontWeight: '700',
    },
    presetName: {
      color: c.textPrimary,
      fontSize: 13.5,
      fontWeight: '600',
      marginTop: 2,
    },
    presetMeta: {
      color: c.textSecondary,
      fontSize: 12,
      marginTop: 2,
      fontVariant: ['tabular-nums'],
    },
    addPresetBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.emerald,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: { opacity: 0.78 },
  });
