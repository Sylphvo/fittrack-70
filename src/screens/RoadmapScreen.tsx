import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { WeightChart } from '../components/WeightChart';
import { FITTRACK_CONFIG } from '../config/fittrack';
import {
  loadGoogleClientId,
  saveGoogleClientId,
  signInWithGoogleEmailLocal,
  signInWithGoogleOAuthWeb,
} from '../services/googleAuth';
import { calculateBurnedKcal, TrajectoryPoint } from '../store/useFitTrackStore';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SPACING, ThemePalette, TYPO } from '../theme/tokens';
import { DailyRecord, GoogleUser } from '../types/fittrack';

interface RoadmapScreenProps {
  user: GoogleUser | null;
  currentWeight: number;
  weightTrajectory: TrajectoryPoint[];
  historyList: DailyRecord[];
  onSignInUser: (user: GoogleUser) => void;
  onSignOutUser: () => void;
  onImportJson: (rawJson: string) => { ok: boolean; message: string };
}

export function RoadmapScreen({
  user,
  currentWeight,
  weightTrajectory,
  historyList,
  onSignInUser,
  onSignOutUser,
  onImportJson,
}: RoadmapScreenProps) {
  const { colors, mode, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [showImport, setShowImport] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [importStatus, setImportStatus] = useState<{ ok: boolean; message: string } | null>(null);

  const [showAuthForm, setShowAuthForm] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [googleClientId, setGoogleClientId] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    loadGoogleClientId().then(setGoogleClientId);
  }, []);

  const totalToLose = FITTRACK_CONFIG.START_WEIGHT - FITTRACK_CONFIG.TARGET_WEIGHT;
  const lostSoFar = Math.max(0, FITTRACK_CONFIG.START_WEIGHT - currentWeight);
  const remainingKg = Math.max(0, currentWeight - FITTRACK_CONFIG.TARGET_WEIGHT);
  const pct = Math.min(100, Math.max(0, Math.round((lostSoFar / totalToLose) * 100)));

  const handleGoogleOAuth = async () => {
    setAuthError(null);
    if (!googleClientId.trim()) {
      setShowAuthForm(true);
      return;
    }
    try {
      setIsSigningIn(true);
      await saveGoogleClientId(googleClientId);
      const signed = await signInWithGoogleOAuthWeb(googleClientId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onSignInUser(signed);
      setShowAuthForm(false);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Đăng nhập Google thất bại.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLocalGoogleLogin = async () => {
    setAuthError(null);
    try {
      const signed = await signInWithGoogleEmailLocal(emailInput, nameInput);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onSignInUser(signed);
      setEmailInput('');
      setNameInput('');
      setShowAuthForm(false);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Email không hợp lệ.');
    }
  };

  const handleImportSubmit = () => {
    const res = onImportJson(jsonText);
    setImportStatus(res);
    if (res.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setJsonText('');
    }
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.kicker}>LỘ TRÌNH 88.0 KG → 70.0 KG</Text>
          <Text style={[TYPO.title, { color: colors.textPrimary }]}>Lộ trình & Tài khoản</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={({ pressed }) => [styles.pillBtn, pressed && styles.pressed]}
            onPress={() => setShowImport((v) => !v)}
          >
            <Ionicons name="code-download-outline" size={15} color={colors.emerald} />
            <Text style={styles.pillBtnText}>JSON</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.pillBtn, pressed && styles.pressed]}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              toggleTheme();
            }}
          >
            <Ionicons
              name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'}
              size={15}
              color={mode === 'dark' ? colors.amber : colors.textPrimary}
            />
            <Text style={styles.pillBtnText}>{mode === 'dark' ? 'Sáng' : 'Tối'}</Text>
          </Pressable>
        </View>
      </View>

      {/* Google Account Card */}
      <View style={styles.card}>
        {user ? (
          <View style={styles.userRow}>
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>
                  {(user.name[0] || 'G').toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.flex}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              <Text style={styles.userStatus}>Đã lưu lịch sử theo tài khoản Google</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.signOutBtn, pressed && styles.pressed]}
              onPress={onSignOutUser}
            >
              <Text style={styles.signOutText}>Đăng xuất</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.authBox}>
            <View style={styles.authHead}>
              <Ionicons name="logo-google" size={20} color={colors.emerald} />
              <View style={styles.flex}>
                <Text style={styles.userName}>Đăng nhập tài khoản Google</Text>
                <Text style={styles.userEmail}>
                  Lưu riêng hồ sơ, cân nặng & lịch sử nạp/đốt calo theo tài khoản của bạn
                </Text>
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [styles.googleBtn, pressed && styles.pressed]}
              onPress={() => setShowAuthForm((v) => !v)}
            >
              <Ionicons name="logo-google" size={17} color={colors.onAccent} />
              <Text style={styles.googleBtnText}>
                {showAuthForm ? 'Đóng khung đăng nhập' : 'Đăng nhập bằng Google'}
              </Text>
            </Pressable>

            {showAuthForm ? (
              <View style={styles.authForm}>
                <Text style={styles.formLabel}>Đăng nhập nhanh bằng Email Google:</Text>
                <TextInput
                  value={emailInput}
                  onChangeText={setEmailInput}
                  placeholder="tenban@gmail.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                />
                <TextInput
                  value={nameInput}
                  onChangeText={setNameInput}
                  placeholder="Tên hiển thị (tuỳ chọn)"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
                <Pressable style={styles.saveProfileBtn} onPress={handleLocalGoogleLogin}>
                  <Text style={styles.saveProfileText}>Tiếp tục với Gmail này</Text>
                </Pressable>

                <Text style={[styles.formLabel, { marginTop: 8 }]}>
                  Hoặc dùng Google OAuth Client ID thật (nếu bạn có):
                </Text>
                <TextInput
                  value={googleClientId}
                  onChangeText={setGoogleClientId}
                  placeholder="xxxx.apps.googleusercontent.com"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  style={styles.input}
                />
                {googleClientId.trim() ? (
                  <Pressable
                    style={styles.oauthBtn}
                    onPress={handleGoogleOAuth}
                    disabled={isSigningIn}
                  >
                    <Text style={styles.oauthBtnText}>
                      {isSigningIn ? 'Đang mở Google...' : 'Mở popup Google OAuth'}
                    </Text>
                  </Pressable>
                ) : null}

                {authError ? <Text style={styles.errText}>{authError}</Text> : null}
              </View>
            ) : null}
          </View>
        )}
      </View>

      {/* Quick JSON Import */}
      {showImport ? (
        <View style={styles.card}>
          <Text style={[TYPO.sectionTitle, { color: colors.textPrimary }]}>
            Nhập nhanh dữ liệu JSON trong ngày
          </Text>
          <TextInput
            value={jsonText}
            onChangeText={setJsonText}
            multiline
            numberOfLines={4}
            placeholder='Dán JSON {"date":"2026-11-25","weight":"88.0","foods":[...],"workouts":[...]}'
            placeholderTextColor={colors.textMuted}
            style={styles.jsonInput}
          />
          {importStatus ? (
            <Text
              style={{
                color: importStatus.ok ? colors.emerald : colors.coral,
                fontSize: 12,
                fontWeight: '600',
              }}
            >
              {importStatus.message}
            </Text>
          ) : null}
          <Pressable style={styles.saveProfileBtn} onPress={handleImportSubmit}>
            <Text style={styles.saveProfileText}>Cập nhật vào app</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Journey Progress */}
      <View style={styles.card}>
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
          <View>
            <Text style={styles.statLabel}>Khởi điểm</Text>
            <Text style={styles.statVal}>{FITTRACK_CONFIG.START_WEIGHT.toFixed(1)} kg</Text>
          </View>
          <View>
            <Text style={styles.statLabel}>Đã giảm</Text>
            <Text style={[styles.statVal, { color: colors.emerald }]}>
              -{lostSoFar.toFixed(1)} kg
            </Text>
          </View>
          <View>
            <Text style={styles.statLabel}>Còn lại</Text>
            <Text style={[styles.statVal, { color: colors.amber }]}>
              {remainingKg.toFixed(1)} kg
            </Text>
          </View>
        </View>
      </View>

      {/* Auto-Projected + Actual Weight Chart */}
      <WeightChart points={weightTrajectory} />

      {/* Daily History: Nạp bao nhiêu / Đốt bao nhiêu */}
      <Text style={[TYPO.sectionTitle, { color: colors.textPrimary }]}>
        Lịch sử Nạp & Đốt theo ngày ({historyList.length})
      </Text>

      <View style={styles.listGap}>
        {historyList.map((day) => {
          const kcalIn = day.meals.reduce((s, m) => s + m.kcal, 0);
          const protein = day.meals.reduce((s, m) => s + m.protein, 0);
          const kcalBurned = calculateBurnedKcal(day);
          const reps = (day.workouts ?? []).reduce(
            (s, w) => (w.done && w.unit !== 'phút' ? s + w.reps : s),
            0
          );
          const inZone = kcalIn <= FITTRACK_CONFIG.SAFE_KCAL_MAX;

          return (
            <View key={day.dateKey} style={styles.historyRow}>
              <View style={styles.historyHead}>
                <Text style={styles.historyDate}>{day.dateKey}</Text>
                {day.weightKg !== null ? (
                  <View style={styles.weightTag}>
                    <Text style={styles.weightTagText}>{day.weightKg.toFixed(1)} kg</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.historyGrid}>
                <View style={styles.hBox}>
                  <Text style={styles.hLabel}>Nạp vào</Text>
                  <Text style={[styles.hVal, { color: inZone ? colors.emerald : colors.coral }]}>
                    {kcalIn} kcal
                  </Text>
                </View>
                <View style={styles.hBox}>
                  <Text style={styles.hLabel}>Đốt tập</Text>
                  <Text style={[styles.hVal, { color: colors.amber }]}>-{kcalBurned} kcal</Text>
                </View>
                <View style={styles.hBox}>
                  <Text style={styles.hLabel}>Đạm / Tập</Text>
                  <Text style={styles.hVal}>
                    {protein}g · {reps} cái
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
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
    headerActions: {
      flexDirection: 'row',
      gap: 6,
    },
    pillBtn: {
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
    pillBtnText: {
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
    card: {
      backgroundColor: c.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: SPACING.md,
      gap: 12,
    },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    avatarFallback: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.emeraldDim,
      borderWidth: 1,
      borderColor: c.emeraldBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      color: c.emerald,
      fontSize: 18,
      fontWeight: '800',
    },
    userName: {
      color: c.textPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
    userEmail: {
      color: c.textSecondary,
      fontSize: 12,
    },
    userStatus: {
      color: c.emerald,
      fontSize: 11,
      fontWeight: '600',
      marginTop: 2,
    },
    signOutBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: RADIUS.sm,
      backgroundColor: c.surfaceElevated,
      borderWidth: 1,
      borderColor: c.borderStrong,
    },
    signOutText: {
      color: c.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    authBox: {
      gap: 10,
    },
    authHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    googleBtn: {
      minHeight: 44,
      borderRadius: RADIUS.md,
      backgroundColor: c.emerald,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    googleBtnText: {
      color: c.onAccent,
      fontSize: 13.5,
      fontWeight: '800',
    },
    authForm: {
      gap: 8,
      paddingTop: 6,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    formLabel: {
      color: c.textSecondary,
      fontSize: 11.5,
      fontWeight: '600',
    },
    input: {
      height: 42,
      backgroundColor: c.bg,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: RADIUS.sm,
      paddingHorizontal: 12,
      color: c.textPrimary,
      fontSize: 13.5,
    },
    saveProfileBtn: {
      height: 42,
      borderRadius: RADIUS.sm,
      backgroundColor: c.emerald,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveProfileText: {
      color: c.onAccent,
      fontSize: 13,
      fontWeight: '800',
    },
    oauthBtn: {
      height: 40,
      borderRadius: RADIUS.sm,
      backgroundColor: c.surfaceElevated,
      borderWidth: 1,
      borderColor: c.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    oauthBtnText: {
      color: c.textPrimary,
      fontSize: 12.5,
      fontWeight: '700',
    },
    errText: {
      color: c.coral,
      fontSize: 12,
      fontWeight: '600',
    },
    jsonInput: {
      minHeight: 84,
      backgroundColor: c.bg,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: RADIUS.sm,
      padding: 10,
      color: c.textPrimary,
      fontSize: 12,
      textAlignVertical: 'top',
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
      fontSize: 32,
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
    listGap: {
      gap: 10,
    },
    historyRow: {
      backgroundColor: c.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      gap: 10,
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
    weightTag: {
      backgroundColor: c.emeraldDim,
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: RADIUS.full,
    },
    weightTagText: {
      color: c.emerald,
      fontSize: 11.5,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    historyGrid: {
      flexDirection: 'row',
      gap: 8,
    },
    hBox: {
      flex: 1,
      backgroundColor: c.surfaceMuted,
      borderRadius: RADIUS.sm,
      padding: 8,
      gap: 2,
    },
    hLabel: {
      color: c.textMuted,
      fontSize: 10.5,
      fontWeight: '600',
    },
    hVal: {
      color: c.textPrimary,
      fontSize: 12.5,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    pressed: { opacity: 0.78 },
  });
