import AsyncStorage from '@react-native-async-storage/async-storage';
import { FITTRACK_CONFIG } from '../config/fittrack';
import { FoodPhotoReview, ScannedFoodItem } from '../types/fittrack';

const API_KEY_STORAGE = '@fittrack70/gemini_api_key_v1';
const GEMINI_MODEL = 'gemini-2.5-flash';

export interface DailyCoachContext {
  currentWeight: number;
  consumedKcal: number;
  consumedProtein: number;
  burnedKcal: number;
  waterMl: number;
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

function parseReviewJson(raw: string): FoodPhotoReview | null {
  try {
    const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    const obj = JSON.parse(cleaned.slice(start, end + 1));

    const rawItems = Array.isArray(obj.items)
      ? obj.items
      : obj.dishName
        ? [
            {
              name: obj.dishName,
              kcal: obj.estimatedKcal,
              protein: obj.estimatedProtein,
              hasStarch: obj.hasStarch,
            },
          ]
        : [];

    const items: ScannedFoodItem[] = rawItems.map(
      (
        it: { name?: string; kcal?: number; protein?: number; hasStarch?: boolean },
        idx: number
      ) => ({
        id: `scan-item-${Date.now()}-${idx}`,
        name: String(it.name || 'Món ăn'),
        kcal: Math.max(0, Math.round(Number(it.kcal) || 0)),
        protein: Math.max(0, Math.round(Number(it.protein) || 0)),
        hasStarch: Boolean(it.hasStarch),
        selected: true,
      })
    );

    if (items.length === 0) return null;

    const verdict =
      obj.verdict === 'an_toan' || obj.verdict === 'can_nhac' || obj.verdict === 'nen_tranh'
        ? obj.verdict
        : 'can_nhac';

    return {
      items,
      verdict,
      advice: String(
        obj.advice || 'Kiểm tra lại danh sách món bên trên rồi bấm Đồng ý để cộng vào hôm nay.'
      ),
      isDemo: false,
    };
  } catch {
    return null;
  }
}

export async function analyzeFoodPhotoForReview(
  base64: string,
  mimeType: string,
  ctx: DailyCoachContext,
  apiKey: string
): Promise<FoodPhotoReview> {
  const trimmedKey = apiKey.trim();
  const remainingKcal = FITTRACK_CONFIG.TARGET_KCAL - ctx.consumedKcal;

  if (!trimmedKey) {
    await new Promise((r) => setTimeout(r, 650));
    return {
      items: [
        {
          id: `demo-1-${Date.now()}`,
          name: 'Ức gà áp chảo không dầu (~200g)',
          kcal: 330,
          protein: 48,
          hasStarch: false,
          selected: true,
        },
        {
          id: `demo-2-${Date.now()}`,
          name: 'Rau củ luộc / salad xanh',
          kcal: 55,
          protein: 3,
          hasStarch: false,
          selected: true,
        },
      ],
      verdict: remainingKcal >= 385 ? 'an_toan' : 'can_nhac',
      advice:
        'Chế độ Demo: Nhập Gemini API Key (biểu tượng Chìa khóa) để AI nhận diện chính xác ảnh món ăn thật của bạn.',
      isDemo: true,
    };
  }

  const prompt = `Bạn là chuyên gia dinh dưỡng Zero-Starch (FitTrack 70, mục tiêu ${FITTRACK_CONFIG.TARGET_KCAL} kcal/ngày, đạm ${FITTRACK_CONFIG.TARGET_PROTEIN}g/ngày).
Hôm nay người dùng đã nạp ${ctx.consumedKcal} kcal (còn lại ${remainingKcal} kcal), đạm ${ctx.consumedProtein}g.
Hãy nhìn kỹ bức ảnh và liệt kê TẤT CẢ các món ăn/đồ uống có trong ảnh, ước tính khẩu phần thực tế, trả về DUY NHẤT 1 JSON hợp lệ theo mẫu:
{
  "items": [
    { "name": "Tên món + khối lượng ước tính", "kcal": 250, "protein": 20, "hasStarch": false }
  ],
  "verdict": "an_toan",
  "advice": "1 câu nhận xét ngắn gọn bằng tiếng Việt theo lượng calo còn lại hôm nay"
}
"verdict" chỉ nhận: "an_toan", "can_nhac", hoặc "nen_tranh".`;

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
      generationConfig: { temperature: 0.2 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API lỗi (${res.status}): ${errText.slice(0, 120)}`);
  }

  const data = await res.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ??
    '';

  const parsed = parseReviewJson(text);
  if (!parsed) {
    throw new Error('AI không phân tích được món trong ảnh. Vui lòng chụp rõ hơn nhé.');
  }
  return parsed;
}
