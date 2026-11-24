import React, { useCallback, useState } from 'react';
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
import { COLORS, SPACING } from './src/theme/tokens';
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

  const handleSelectTab = useCallback((tab: TabKey) => {
    Haptics.selectionAsync().catch(() => {});
    setActiveTab(tab);
  }, []);

  if (!store.isLoaded) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.emerald} />
        <Text style={styles.loadingText}>Đang tải dữ liệu FitTrack 70...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="light" backgroundColor={COLORS.bg} />

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
            cardioElapsedSec={store.todayRecord.cardioElapsedSec}
            onToggleWorkout={store.toggleWorkout}
            onUpdateCardioElapsed={store.setCardioElapsed}
          />
        ) : null}

        {activeTab === 'roadmap' ? (
          <RoadmapScreen
            currentWeight={store.currentWeight}
            weightHistory={store.weightHistory}
            historyList={store.historyList}
          />
        ) : null}
      </View>

      {/* Bottom Tab Bar (iOS Safe Area Aware) */}
      <SafeAreaView edges={['bottom']} style={styles.tabBarSafe}>
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
                  color={focused ? COLORS.emerald : COLORS.textMuted}
                />
                <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

export default function App() {
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width > 520;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        {isDesktopWeb ? (
          <View style={styles.webBackdrop}>
            <View style={styles.webPhoneFrame}>
              <MainApp />
            </View>
          </View>
        ) : (
          <MainApp />
        )}
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webBackdrop: {
    flex: 1,
    backgroundColor: '#040608',
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
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  body: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  tabBarSafe: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
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
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: COLORS.emerald,
    fontWeight: '700',
  },
});
