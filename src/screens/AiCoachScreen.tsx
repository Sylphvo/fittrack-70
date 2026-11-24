import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import {
  analyzeFoodImage,
  chatWithCoach,
  DailyCoachContext,
  loadGeminiApiKey,
  saveGeminiApiKey,
} from '../services/aiCoach';
import { getTimeStamp } from '../store/useFitTrackStore';
import { COLORS, RADIUS, SPACING, TYPO } from '../theme/tokens';
import { ChatMessage } from '../types/fittrack';

interface AiCoachScreenProps {
  context: DailyCoachContext;
  onAddMeal: (meal: { name: string; kcal: number; protein: number }) => void;
}

const QUICK_PROMPTS = [
  'Hôm nay tôi ăn vậy ổn chưa?',
  'Tối nay ăn gì còn đủ đạm?',
  'Đói lúc 21h thì làm sao?',
  'Nhắc lịch tập 18h15 giúp tôi',
];

const WELCOME_MSG: ChatMessage = {
  id: 'welcome-coach',
  role: 'assistant',
  text: 'Chào bạn! Tôi là trợ lý AI FitTrack 70. Hãy bấm "Chụp món ăn" hoặc "Chọn ảnh" để quét calo & kiểm tra Zero-Starch, hoặc nhắn câu hỏi bất kỳ bên dưới.',
  timestamp: getTimeStamp(),
};

export function AiCoachScreen({ context, onAddMeal }: AiCoachScreenProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [draftKey, setDraftKey] = useState('');
  const [showKeyPanel, setShowKeyPanel] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadGeminiApiKey().then((stored) => {
      setApiKey(stored);
      setDraftKey(stored);
    });
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 80);
  };

  const handleSaveKey = async () => {
    await saveGeminiApiKey(draftKey);
    setApiKey(draftKey.trim());
    setShowKeyPanel(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const processPickedImage = async (
    uri: string,
    base64: string | null | undefined,
    mimeType?: string
  ) => {
    const userMsg: ChatMessage = {
      id: `img-${Date.now()}`,
      role: 'user',
      text: 'Phân tích calo & đạm món ăn trong ảnh này giúp tôi.',
      imageUri: uri,
      timestamp: getTimeStamp(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsBusy(true);
    scrollToBottom();

    try {
      const scan = await analyzeFoodImage(
        base64 || '',
        mimeType || 'image/jpeg',
        context,
        apiKey
      );
      const aiMsg: ChatMessage = {
        id: `scan-${Date.now()}`,
        role: 'assistant',
        text: scan.advice,
        scanResult: scan,
        addedToLog: false,
        timestamp: getTimeStamp(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err) {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        text: err instanceof Error ? err.message : 'Không thể phân tích ảnh lúc này.',
        timestamp: getTimeStamp(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsBusy(false);
      scrollToBottom();
    }
  };

  const handlePickImage = async (source: 'camera' | 'library') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera' && Platform.OS !== 'web') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            'Cần quyền Camera',
            'Vui lòng cấp quyền Camera trong Cài đặt iPhone để chụp ảnh món ăn.'
          );
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.65,
          base64: true,
        });
      } else {
        if (Platform.OS !== 'web') {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            Alert.alert(
              'Cần quyền Thư viện ảnh',
              'Vui lòng cấp quyền Thư viện ảnh để chọn ảnh món ăn.'
            );
            return;
          }
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.65,
          base64: true,
        });
      }

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      await processPickedImage(asset.uri, asset.base64, asset.mimeType ?? 'image/jpeg');
    } catch (err) {
      Alert.alert(
        'Lỗi chọn ảnh',
        err instanceof Error ? err.message : 'Không thể mở camera hoặc thư viện ảnh.'
      );
    }
  };

  const handleSendText = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isBusy) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (!overrideText) setInput('');

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
      timestamp: getTimeStamp(),
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setIsBusy(true);
    scrollToBottom();

    try {
      const reply = await chatWithCoach(text, nextHistory, context, apiKey);
      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: reply,
        timestamp: getTimeStamp(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        text: err instanceof Error ? err.message : 'Lỗi kết nối AI, vui lòng thử lại.',
        timestamp: getTimeStamp(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsBusy(false);
      scrollToBottom();
    }
  };

  const handleAddScannedMeal = (msgId: string) => {
    const target = messages.find((m) => m.id === msgId);
    if (!target?.scanResult || target.addedToLog) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onAddMeal({
      name: target.scanResult.dishName,
      kcal: target.scanResult.estimatedKcal,
      protein: target.scanResult.estimatedProtein,
    });
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, addedToLog: true } : m))
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>GEMINI VISION · TRỢ LÝ ZERO-STARCH</Text>
          <Text style={[TYPO.title, { color: COLORS.textPrimary }]}>Quét Calo & Chat AI</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.keyBtn,
            apiKey ? styles.keyBtnActive : null,
            pressed && styles.pressed,
          ]}
          onPress={() => setShowKeyPanel((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel="Cấu hình Gemini API Key"
        >
          <Ionicons
            name={apiKey ? 'key' : 'key-outline'}
            size={15}
            color={apiKey ? COLORS.emerald : COLORS.amber}
          />
          <Text style={[styles.keyBtnText, { color: apiKey ? COLORS.emerald : COLORS.amber }]}>
            {apiKey ? 'Gemini Live' : 'Demo · Nhập Key'}
          </Text>
        </Pressable>
      </View>

      {/* Collapsible Gemini API Key Panel */}
      {showKeyPanel ? (
        <View style={styles.keyPanel}>
          <Text style={styles.keyPanelTitle}>Cấu hình Gemini API Key (miễn phí tại aistudio.google.com)</Text>
          <View style={styles.keyInputRow}>
            <TextInput
              value={draftKey}
              onChangeText={setDraftKey}
              placeholder="Dán khóa AIza... (để trống = chế độ Demo)"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={styles.keyInput}
              accessibilityLabel="Nhập Gemini API Key"
            />
            <Pressable
              style={({ pressed }) => [styles.keySaveBtn, pressed && styles.pressed]}
              onPress={handleSaveKey}
              accessibilityRole="button"
              accessibilityLabel="Lưu API Key"
            >
              <Text style={styles.keySaveText}>Lưu</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Camera & Photo Picker Action Strip */}
      <View style={styles.scanBar}>
        <Pressable
          style={({ pressed }) => [styles.scanBtnPrimary, pressed && styles.pressed]}
          onPress={() => handlePickImage('camera')}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityLabel="Chụp ảnh món ăn để xem calo"
        >
          <Ionicons name="camera" size={18} color={COLORS.black} />
          <Text style={styles.scanBtnPrimaryText}>Chụp món ăn</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.scanBtnSecondary, pressed && styles.pressed]}
          onPress={() => handlePickImage('library')}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityLabel="Chọn ảnh món ăn từ thư viện"
        >
          <Ionicons name="images-outline" size={18} color={COLORS.textPrimary} />
          <Text style={styles.scanBtnSecondaryText}>Chọn ảnh có sẵn</Text>
        </Pressable>
      </View>

      {/* Chat Messages Thread */}
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const scan = msg.scanResult;
          const verdictColor =
            scan?.verdict === 'an_toan'
              ? COLORS.emerald
              : scan?.verdict === 'nen_tranh'
                ? COLORS.coral
                : COLORS.amber;
          const verdictLabel =
            scan?.verdict === 'an_toan'
              ? 'Chuẩn Zero-Starch'
              : scan?.verdict === 'nen_tranh'
                ? 'Nên tránh (Carb/Calo cao)'
                : 'Cân nhắc khẩu phần';

          return (
            <View
              key={msg.id}
              style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAi]}
            >
              <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
                {msg.imageUri ? (
                  <Image
                    source={{ uri: msg.imageUri }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                ) : null}

                {scan ? (
                  <View style={styles.scanCard}>
                    <View style={styles.scanCardTop}>
                      <Text style={styles.scanDishName}>{scan.dishName}</Text>
                      <View
                        style={[
                          styles.verdictPill,
                          {
                            backgroundColor:
                              scan.verdict === 'an_toan'
                                ? COLORS.emeraldDim
                                : scan.verdict === 'nen_tranh'
                                  ? COLORS.coralDim
                                  : COLORS.amberDim,
                          },
                        ]}
                      >
                        <Text style={[styles.verdictText, { color: verdictColor }]}>
                          {verdictLabel}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.scanMetricsRow}>
                      <View style={styles.scanMetricBox}>
                        <Text style={styles.scanMetricLabel}>Ước tính Calo</Text>
                        <Text style={[styles.scanMetricVal, { color: COLORS.emerald }]}>
                          {scan.estimatedKcal} kcal
                        </Text>
                      </View>
                      <View style={styles.scanMetricBox}>
                        <Text style={styles.scanMetricLabel}>Ước tính Đạm</Text>
                        <Text style={[styles.scanMetricVal, { color: COLORS.amber }]}>
                          {scan.estimatedProtein}g
                        </Text>
                      </View>
                      <View style={styles.scanMetricBox}>
                        <Text style={styles.scanMetricLabel}>Tinh bột</Text>
                        <Text
                          style={[
                            styles.scanMetricVal,
                            { color: scan.hasStarch ? COLORS.coral : COLORS.cyan },
                          ]}
                        >
                          {scan.hasStarch ? 'Có' : '0%'}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      style={({ pressed }) => [
                        styles.addMealBtn,
                        msg.addedToLog && styles.addMealBtnDone,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => handleAddScannedMeal(msg.id)}
                      disabled={msg.addedToLog}
                      accessibilityRole="button"
                      accessibilityLabel={`Thêm ${scan.dishName} vào nhật ký hôm nay`}
                    >
                      <Ionicons
                        name={msg.addedToLog ? 'checkmark-circle' : 'add-circle'}
                        size={17}
                        color={msg.addedToLog ? COLORS.emerald : COLORS.black}
                      />
                      <Text
                        style={[
                          styles.addMealBtnText,
                          msg.addedToLog && { color: COLORS.emerald },
                        ]}
                      >
                        {msg.addedToLog
                          ? 'Đã thêm vào nhật ký hôm nay'
                          : `+ Thêm ${scan.estimatedKcal} kcal vào nhật ký`}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                <Text style={[styles.msgText, isUser && styles.msgTextUser]}>{msg.text}</Text>
                <Text style={[styles.timeLabel, isUser && styles.timeLabelUser]}>
                  {msg.timestamp}
                </Text>
              </View>
            </View>
          );
        })}

        {isBusy ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={COLORS.emerald} />
            <Text style={styles.loadingText}>AI đang phân tích dữ liệu...</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Quick Prompts */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsRow}
      >
        {QUICK_PROMPTS.map((q) => (
          <Pressable
            key={q}
            style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
            onPress={() => handleSendText(q)}
            disabled={isBusy}
          >
            <Text style={styles.chipText}>{q}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Chat Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Hỏi AI về món ăn, calo, lịch tập..."
          placeholderTextColor={COLORS.textMuted}
          style={styles.chatInput}
          returnKeyType="send"
          onSubmitEditing={() => handleSendText()}
          accessibilityLabel="Nhập câu hỏi cho trợ lý AI"
        />
        <Pressable
          style={({ pressed }) => [
            styles.sendBtn,
            (!input.trim() || isBusy) && styles.sendBtnDisabled,
            pressed && styles.pressed,
          ]}
          onPress={() => handleSendText()}
          disabled={!input.trim() || isBusy}
          accessibilityRole="button"
          accessibilityLabel="Gửi tin nhắn"
        >
          <Ionicons name="send" size={18} color={COLORS.black} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  kicker: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  keyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.amberDim,
    borderWidth: 1,
    borderColor: COLORS.amberBorder,
  },
  keyBtnActive: {
    backgroundColor: COLORS.emeraldDim,
    borderColor: COLORS.emeraldBorder,
  },
  keyBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  keyPanel: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: 12,
    gap: 8,
  },
  keyPanelTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  keyInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  keyInput: {
    flex: 1,
    height: 40,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    color: COLORS.textPrimary,
    fontSize: 13,
  },
  keySaveBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keySaveText: {
    color: COLORS.black,
    fontSize: 13,
    fontWeight: '800',
  },
  scanBar: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  scanBtnPrimary: {
    flex: 1,
    minHeight: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.emerald,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  scanBtnPrimaryText: {
    color: COLORS.black,
    fontSize: 13,
    fontWeight: '800',
  },
  scanBtnSecondary: {
    flex: 1,
    minHeight: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  scanBtnSecondaryText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  chatContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: 12,
  },
  bubbleRow: {
    flexDirection: 'row',
    width: '100%',
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowAi: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '88%',
    borderRadius: RADIUS.md,
    padding: 12,
    gap: 8,
  },
  bubbleUser: {
    backgroundColor: COLORS.emerald,
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 4,
  },
  previewImage: {
    width: 220,
    height: 150,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bg,
  },
  scanCard: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: 10,
    gap: 10,
  },
  scanCardTop: {
    gap: 6,
  },
  scanDishName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  verdictPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  verdictText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scanMetricsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  scanMetricBox: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  scanMetricLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  scanMetricVal: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  addMealBtn: {
    minHeight: 38,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.emerald,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  addMealBtnDone: {
    backgroundColor: COLORS.emeraldDim,
    borderWidth: 1,
    borderColor: COLORS.emeraldBorder,
  },
  addMealBtnText: {
    color: COLORS.black,
    fontSize: 12,
    fontWeight: '800',
  },
  msgText: {
    color: COLORS.textPrimary,
    fontSize: 13.5,
    lineHeight: 20,
  },
  msgTextUser: {
    color: COLORS.black,
    fontWeight: '600',
  },
  timeLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    alignSelf: 'flex-end',
    fontVariant: ['tabular-nums'],
  },
  timeLabelUser: {
    color: 'rgba(0,0,0,0.6)',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  chipsScroll: {
    maxHeight: 42,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  chipsRow: {
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    backgroundColor: COLORS.surfaceMuted,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  chatInput: {
    flex: 1,
    minHeight: 44,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.full,
    paddingHorizontal: 16,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.78,
  },
});
