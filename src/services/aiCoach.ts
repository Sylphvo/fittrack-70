import AsyncStorage from '@react-native-async-storage/async-storage';
import { FITTRACK_CONFIG } from '../config/fittrack';
import { ChatMessage, FoodScanResult } from '../types/fittrack';

const API_KEY_STORAGE = '@fittrack70/gemini_api_key_v1';
const GEMINI_MODEL = 'gemini-2.5-flash';

export interface DailyCoachContext {
  currentWeight: number;
  consumedKcal: number;
  consumedProtein: number;
  waterMl: number;
  workoutsDone: number;
}

export async function loadGeminiApiKey(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(API_KEY_STORAGE)) ?? '';
  } catch {
    return '';
  }
}

export async function saveGeminiApiKey(key: string): Promise<void> {
  const trimmed = key.trim();
  if (!trimmed) {
    await AsyncStorage.removeItem(API_KEY_STORAGE);
    return;
  }
  await AsyncStorage.setItem(API_KEY_STORAGE, trimmed);
}

function buildSystemContext(ctx: DailyCoachContext): string {
  const remainingKcal = FITTRACK_CONFIG.TARGET_KCAL - ctx.consumedKcal;
  const remainingProtein = Math.max(0, FITTRACK_CONFIG.TARGET_PROTEIN - ctx.consumedProtein);
  return [
    'Bạn là huấn luyện viên dinh dưỡng & siết mỡ cá nhân của ứng dụng FitTrack 70.',
    `Hồ sơ người dùng: Lộ trình giảm cân ${FITTRACK_CONFIG.START_WEIGHT} kg -> ${FITTRACK_CONFIG.TARGET_WEIGHT} kg. Cân nặng hiện tại: ${ctx.currentWeight.toFixed(1)} kg.`,
    `Chế độ: Zero-Starch (0% cơm, 0% đường). Trần calo: ${FITTRACK_CONFIG.TARGET_KCAL} kcal/ngày (an toàn 1.350–1.500 kcal), mục tiêu đạm: ${FITTRACK_CONFIG.TARGET_PROTEIN}g/ngày, nước: ${FITTRACK_CONFIG.TARGET_WATER}ml/ngày.`,
    `Lịch tập cố định: ${FITTRACK_CONFIG.WORKOUT_WINDOW} (con lăn 4 bánh, gập bụng tường, 40 phút Cardio ngắt quãng). Ngủ trước ${FITTRACK_CONFIG.SLEEP_TARGET}.`,
    `Dữ liệu hôm nay: Đã nạp ${ctx.consumedKcal} kcal (còn lại ${remainingKcal} kcal), Đạm ${ctx.consumedProtein}g (còn thiếu ${remainingProtein}g), Nước ${ctx.waterMl}ml, Bài tập hoàn thành ${ctx.workoutsDone}/3.`,
    'Trả lời bằng tiếng Việt ngắn gọn, thực chiến, thẳng thắn, dễ đọc trên màn hình điện thoại.',
  ].join('\n');
}

function parseJsonFromModelText(raw: string): FoodScanResult | null {
  try {
    const cleaned = raw
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    const verdict =
      obj.verdict === 'an_toan' || obj.verdict === 'can_nhac' || obj.verdict === 'nen_tranh'
        ? obj.verdict
        : 'can_nhac';
    return {
      dishName: String(obj.dishName || 'Món ăn chưa rõ tên'),
      estimatedKcal: Math.max(0, Math.round(Number(obj.estimatedKcal) || 0)),
      estimatedProtein: Math.max(0, Math.round(Number(obj.estimatedProtein) || 0)),
      hasStarch: Boolean(obj.hasStarch),
      verdict,
      advice: String(obj.advice || 'Kiểm tra khẩu phần để đảm bảo không vượt trần 1.450 kcal.'),
      isDemo: false,
    };
  } catch {
    return null;
  }
}

export async function analyzeFoodImage(
  base64: string,
  mimeType: string,
  ctx: DailyCoachContext,
  apiKey: string
): Promise<FoodScanResult> {
  const trimmedKey = apiKey.trim();
  const remainingKcal = FITTRACK_CONFIG.TARGET_KCAL - ctx.consumedKcal;

  if (!trimmedKey) {
    // Demo mode when user hasn't entered a Gemini API Key yet
    await new Promise((r) => setTimeout(r, 700));
    return {
      dishName: 'Phần ức gà áp chảo & rau xanh (Ước tính Demo)',
      estimatedKcal: 420,
      estimatedProtein: 54,
      hasStarch: false,
      verdict: remainingKcal >= 420 ? 'an_toan' : 'can_nhac',
      advice:
        remainingKcal >= 420
          ? `Rất hợp chuẩn Zero-Starch! Sau món này bạn vẫn còn ${remainingKcal - 420} kcal trong ngày. (Nhập Gemini API Key ở nút Khóa góc trên để AI nhận diện ảnh thật 100%).`
          : `Hôm nay bạn chỉ còn ${Math.max(0, remainingKcal)} kcal — cân nhắc giảm nửa khẩu phần. (Nhập Gemini API Key ở nút Khóa để AI nhận diện ảnh thật).`,
      isDemo: true,
    };
  }

  const prompt = `${buildSystemContext(ctx)}

Hãy phân tích bức ảnh món ăn này và trả về DUY NHẤT 1 JSON hợp lệ (không thêm chữ thừa ngoài JSON) theo đúng cấu trúc:
{
  "dishName": "Tên món ăn ngắn gọn bằng tiếng Việt",
  "estimatedKcal": 350,
  "estimatedProtein": 35,
  "hasStarch": false,
  "verdict": "an_toan",
  "advice": "1-2 câu đánh giá theo chế độ Zero-Starch và lượng calo còn lại hôm nay"
}
Trong đó "verdict" chỉ nhận 1 trong 3 giá trị: "an_toan", "can_nhac", "nen_tranh".`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
    trimmedKey
  )}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType || 'image/jpeg',
                data: base64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API lỗi (${res.status}): ${errText.slice(0, 140)}`);
  }

  const data = await res.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ??
    '';

  const parsed = parseJsonFromModelText(text);
  if (!parsed) {
    throw new Error('Không phân tích được kết quả JSON từ AI. Vui lòng chụp lại rõ món ăn hơn.');
  }
  return parsed;
}

function offlineCoachReply(question: string, ctx: DailyCoachContext): string {
  const q = question.toLowerCase();
  const remainingKcal = FITTRACK_CONFIG.TARGET_KCAL - ctx.consumedKcal;
  const remainingProtein = Math.max(0, FITTRACK_CONFIG.TARGET_PROTEIN - ctx.consumedProtein);
  const remainingWater = Math.max(0, FITTRACK_CONFIG.TARGET_WATER - ctx.waterMl);

  if (q.includes('tối') || q.includes('ăn gì') || q.includes('gợi ý') || q.includes('đạm')) {
    if (remainingKcal <= 150) {
      return `Hôm nay bạn đã nạp ${ctx.consumedKcal}/${FITTRACK_CONFIG.TARGET_KCAL} kcal (còn ${Math.max(0, remainingKcal)} kcal). Gợi ý tốt nhất lúc này là 1 hũ sữa chua Hy Lạp không đường (130 kcal, 10g đạm) hoặc 2 lòng trắng trứng luộc + nước chanh muối loãng để không vượt trần.`;
    }
    return `Bạn còn ${remainingKcal} kcal và cần thêm ${remainingProtein}g đạm hôm nay. Gợi ý chuẩn Zero-Starch:\n• 250g ức gà luộc/áp chảo không dầu + rau (480 kcal · 62g đạm)\n• Hoặc 4 trứng luộc + 100g chả lụa chay + dưa leo (480 kcal · 55g đạm).`;
  }

  if (q.includes('đói') || q.includes('21h') || q.includes('khuya') || q.includes('thèm')) {
    return `Khi đói buổi tối lúc siết mỡ:\n1. Uống ngay 300–400ml nước chanh muối loãng (10 kcal) — 70% cảm giác đói là thiếu nước/điện giải.\n2. Nếu vẫn cồn cào và còn calo, ăn 1–2 lòng trắng trứng hoặc dưa leo.\n3. Đi ngủ đúng giờ 22:30 để tránh hormone ghrelin tăng cao.`;
  }

  if (q.includes('tập') || q.includes('cardio') || q.includes('18h')) {
    return `Lịch tập cố định 18:15 – 19:15 hôm nay bạn đã hoàn thành ${ctx.workoutsDone}/3 bài. Hãy giữ nhịp Cardio 40 phút (3p đi bộ cực nhanh + 1p chạy/leo cầu thang) để đốt ~400 kcal, và bù điện giải ngay sau buổi tập nhé!`;
  }

  if (q.includes('ổn') || q.includes('đánh giá') || q.includes('hôm nay')) {
    const status =
      ctx.consumedKcal <= FITTRACK_CONFIG.TARGET_KCAL
        ? 'Đang nằm trong vùng xanh an toàn (≤ 1.450 kcal).'
        : 'Đang vượt nhẹ trần 1.450 kcal — hạn chế nạp thêm calo tối nay.';
    return `Tổng kết nhanh hôm nay:\n• Calo: ${ctx.consumedKcal}/${FITTRACK_CONFIG.TARGET_KCAL} kcal — ${status}\n• Đạm: ${ctx.consumedProtein}/${FITTRACK_CONFIG.TARGET_PROTEIN}g (còn thiếu ${remainingProtein}g)\n• Nước: ${ctx.waterMl}/${FITTRACK_CONFIG.TARGET_WATER}ml (còn ${remainingWater}ml)\n• Vận động: ${ctx.workoutsDone}/3 bài.`;
  }

  return `Dữ liệu hôm nay của bạn: ${ctx.consumedKcal}/${FITTRACK_CONFIG.TARGET_KCAL} kcal · ${ctx.consumedProtein}/${FITTRACK_CONFIG.TARGET_PROTEIN}g đạm · ${ctx.waterMl}ml nước.\n\nBạn có thể chụp ảnh món ăn để tôi tính calo ngay, hoặc nhập Gemini API Key (biểu tượng chìa khóa góc trên) để chat tự do với AI Gemini 2.5 Flash!`;
}

export async function chatWithCoach(
  userMessage: string,
  history: ChatMessage[],
  ctx: DailyCoachContext,
  apiKey: string
): Promise<string> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    await new Promise((r) => setTimeout(r, 450));
    return offlineCoachReply(userMessage, ctx);
  }

  const recentTurns = history
    .slice(-8)
    .filter((m) => m.text.trim().length > 0)
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
    trimmedKey
  )}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: buildSystemContext(ctx) }],
      },
      contents: [
        ...recentTurns,
        {
          role: 'user',
          parts: [{ text: userMessage }],
        },
      ],
      generationConfig: {
        temperature: 0.5,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API lỗi (${res.status}): ${errText.slice(0, 140)}`);
  }

  const data = await res.json();
  const reply: string =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ??
    '';

  return reply.trim() || 'AI chưa trả về nội dung, bạn thử hỏi lại nhé.';
}
