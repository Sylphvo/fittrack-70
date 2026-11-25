import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { AiCoachScreen } from './src/screens/AiCoachScreen';
import { MealsScreen } from './src/screens/MealsScreen';
import { RoadmapScreen } from './src/screens/RoadmapScreen';
import { TodayScreen } from './src/screens/TodayScreen';
import { WorkoutScreen } from './src/screens/WorkoutScreen';
import { useFitTrackStore } from './src/store/useFitTrackStore';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { SPACING, ThemePalette } from './src/theme/tokens';
import { TabKey } from './src/types/fittrack';

const TABS: {
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'today', label: 'Hôm nay', icon: 'pulse-outline', activeIcon: 'pulse' },
  { key: 'meals', label: 'Thực đơn', icon: 'restaurant-outline', activeIcon: 'restaurant' },
  { key: 'ai', label: 'AI Quét', icon: 'camera-outline', activeIcon: 'camera' },
  { key: 'workout', label: 'Tập 18h15', icon: 'timer-outline', activeIcon: 'timer' },
  { key: 'roadmap', label: 'Lộ trình', icon: 'trending-down-outline', activeIcon: 'trending-down' },
];

function MainApp() {
  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const store = useFitTrackStore();
  const { colors, mode } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleSelectTab = useCallback((tab: TabKey) => {
    Haptics.selectionAsync().catch(() => {});
    setActiveTab(tab);
  }, []);

  const Container = Platform.OS === 'web' ? View : SafeAreaView;
  const TabWrapper = Platform.OS === 'web' ? View : SafeAreaView;

  if (!store.isLoaded) {
    return (
      <Container style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.emerald} />
        <Text style={styles.loadingText}>Đang tải dữ liệu FitTrack 70...</Text>
      </Container>
    );
  }

  return (
    <Container
      style={styles.container}
      {...(Platform.OS === 'web' ? {} : { edges: ['top', 'left', 'right'] as const })}
    >
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} backgroundColor={colors.bg} />

      <View style={styles.body}>
        {activeTab === 'today' ? (
          <TodayScreen
            todayKey={store.todayKey}
            currentWeight={store.currentWeight}
            todayRecord={store.todayRecord}
            totals={store.totals}
            streakDays={store.streakDays}
            onSaveWeight={store.setMorningWeight}
            onAdjustWater={store.adjustWater}
            onAddMorningCombo={store.addMorningCombo}
            onToggleCloseOut={store.toggleCloseOutDay}
            onNavigateMeals={() => handleSelectTab('meals')}
            onNavigateWorkout={() => handleSelectTab('workout')}
          />
        ) : null}

        {activeTab === 'meals' ? (
          <MealsScreen
            meals={store.todayRecord.meals}
            totalKcal={store.totals.kcal}
            totalProtein={store.totals.protein}
            onAddPreset={store.addPresetMeal}
            onAddCustom={store.addMeal}
            onRemoveMeal={store.removeMeal}
          />
        ) : null}

        {activeTab === 'ai' ? (
          <AiCoachScreen
            context={{
              currentWeight: store.currentWeight,
              consumedKcal: store.totals.kcal,
              consumedProtein: store.totals.protein,
              waterMl: store.totals.waterMl,
              workoutsDone: store.todayRecord.completedWorkouts.length,
            }}
            onAddMeal={store.addMeal}
          />
        ) : null}

        {activeTab === 'workout' ? (
          <WorkoutScreen
            completedWorkouts={store.todayRecord.completedWorkouts}
            customWorkouts={store.todayRecord.customWorkouts ?? []}
            cardioElapsedSec={store.todayRecord.cardioElapsedSec}
            onToggleWorkout={store.toggleWorkout}
            onToggleCustomWorkout={store.toggleCustomWorkout}
            onUpdateCardioElapsed={store.setCardioElapsed}
          />
        ) : null}

        {activeTab === 'roadmap' ? (
          <RoadmapScreen
            currentWeight={store.currentWeight}
            weightHistory={store.weightHistory}
            historyList={store.historyList}
            onImportJson={store.importDailyJson}
          />
        ) : null}
      </View>

      {/* Bottom Tab Bar */}
      <TabWrapper
        style={styles.tabBarSafe}
        {...(Platform.OS === 'web' ? {} : { edges: ['bottom'] as const })}
      >
        <View style={styles.tabBar} accessibilityRole="tablist">
          {TABS.map((tab) => {
            const focused = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={({ pressed }) => [styles.tabItem, pressed && styles.tabPressed]}
                onPress={() => handleSelectTab(tab.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={tab.label}
              >
                <Ionicons
                  name={focused ? tab.activeIcon : tab.icon}
                  size={22}
                  color={focused ? colors.emerald : colors.textMuted}
                />
                <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </TabWrapper>
    </Container>
  );
}

function AppShell() {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isDesktopWeb = Platform.OS === 'web' && width > 520;

  if (isDesktopWeb) {
    return (
      <View style={styles.webBackdrop}>
        <View style={styles.webPhoneFrame}>
          <MainApp />
        </View>
      </View>
    );
  }
  return <MainApp />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <AppShell />
        </ErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const createStyles = (c: ThemePalette) =>
  StyleSheet.create({
    webBackdrop: {
      flex: 1,
      backgroundColor: c.mode === 'dark' ? '#040608' : '#E2E8F0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    webPhoneFrame: {
      flex: 1,
      width: '100%',
      maxWidth: 430,
      maxHeight: 900,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },
    body: {
      flex: 1,
      overflow: 'hidden',
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: c.bg,
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
    },
    loadingText: {
      color: c.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
    tabBarSafe: {
      backgroundColor: c.surface,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    tabBar: {
      flexDirection: 'row',
      height: 58,
      paddingHorizontal: 6,
    },
    tabItem: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
    },
    tabPressed: {
      opacity: 0.7,
    },
    tabLabel: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    tabLabelActive: {
      color: c.emerald,
      fontWeight: '700',
    },
  });
