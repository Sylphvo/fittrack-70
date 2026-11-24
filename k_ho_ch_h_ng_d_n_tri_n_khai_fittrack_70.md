# KẾ HOẠCH & HƯỚNG DẪN TRIỂN KHAI ỨNG DỤNG FITTRACK 70 (iOS / iPaside)

**Mục tiêu dự án:** Triển khai hoàn chỉnh ứng dụng **FitTrack 70** (Lộ trình giảm cân từ **88.0 kg → 70.0 kg**), tích hợp chế độ siết mỡ tốc độ cao (Zero-Starch 1.400 kcal/ngày) và lịch tập khung giờ **18h15 – 19h15** sau giờ làm.

---

## PHẦN 1: CẬP NHẬT NGHIỆP VỤ MỚI VÀO MÃ NGUỒN (ANTIGRAVITY / LOCAL)

Trước khi đóng gói ứng dụng, hãy cập nhật các thông số cấu hình trong mã nguồn để khớp hoàn toàn với lộ trình siết mỡ nhanh nhất của bạn:

1. **Cấu hình trần Calo & Đạm (`TARGET_KCAL` & `TARGET_PROTEIN`):**
   * Chuyển từ mức duy trì sang mức **Siết mỡ Zero-Starch**: `TARGET_KCAL = 1450` (vùng an toàn `1.350 – 1.500 kcal`).
   * Đẩy mục tiêu đạm lên cao để giữ cơ khi cắt tinh bột: `TARGET_PROTEIN = 145` (`145g/ngày`).
   * Mục tiêu nước & điện giải: `TARGET_WATER = 3000` (`3.000 ml/ngày`).

2. **Bộ Preset thực đơn Zero-Starch (0% Cơm - 0% Đường):**
   * `Americano đá nguyên chất (0 đường)`: `15 kcal` | `0g đạm`
   * `3 Trứng gà luộc (2 nguyên + 1 lòng trắng)`: `195 kcal` | `16g đạm`
   * `250g Ức gà luộc/áp chảo không dầu + Rau`: `480 kcal` | `62g đạm`
   * `1 Hũ sữa chua Hy Lạp không đường`: `130 kcal` | `10g đạm`
   * `4 Trứng luộc + 100g Chả lụa chay + Dưa leo`: `480 kcal` | `55g đạm`
   * `Nước chanh muối loãng bù điện giải`: `10 kcal` | `0g đạm`

3. **Lịch trình vận động cố định sau giờ làm (`18h15 – 19h15`):**
   * `18:15 - Đẩy con lăn 4 bánh`: 3 hiệp × 6–8 cái (siết cơ lõi, không võng lưng).
   * `18:25 - Gập bụng trên tường`: 3 hiệp × 20 cái (bụng trên - bụng bên - nâng hông).
   * `18:35 - Cardio đốt mỡ ngắt quãng`: 40 phút (3 phút đi bộ cực nhanh + 1 phút chạy bộ/leo cầu thang, đốt ~400 kcal).

---

## PHẦN 2: QUY TRÌNH BUILD FILE `.IPA` KHÔNG CẦN MÁY MAC

Bạn có thể sử dụng **Antigravity** (để sinh code tự động từ file `FitTrack70_BRD_Spec.md`) hoặc chạy trực tiếp trên PC Windows theo 2 phương án xuất file `.ipa` dưới đây:

### Phương án A: Xuất `.ipa` bằng GitHub Actions (Miễn phí 100%, không cần Apple Developer $99)

Đây là cách tối ưu nhất để tạo file `.ipa` (unsigned) nạp thẳng vào **iPaside** mà không bị hỏi tài khoản Apple Developer trả phí.

1. Đẩy toàn bộ mã nguồn dự án `FitTrack70` lên một repository trên **GitHub**.
2. Trong thư mục gốc dự án, tạo đường dẫn file: `.github/workflows/build-ios-ipa.yml` với nội dung sau:

```yaml
name: Build Unsigned iOS IPA for iPaside

on:
  workflow_dispatch:

jobs:
  build-ipa:
    runs-on: macos-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm install

      - name: Generate iOS Native Project (Expo Prebuild)
        run: npx expo prebuild --platform ios --clean

      - name: Build Unsigned Archive & Package IPA
        run: |
          cd ios
          xcodebuild -workspace FitTrack70.xcworkspace \
            -scheme FitTrack70 \
            -configuration Release \
            -sdk iphoneos \
            -archivePath build/FitTrack70.xcarchive \
            archive CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO CODE_SIGNING_ALLOWED=NO

          mkdir -p build/Payload
          cp -r build/FitTrack70.xcarchive/Products/Applications/FitTrack70.app build/Payload/
          cd build
          zip -r FitTrack70_unsigned.ipa Payload

      - name: Upload IPA Artifact
        uses: actions/upload-artifact@v4
        with:
          name: FitTrack70-IPA
          path: ios/build/FitTrack70_unsigned.ipa
```

3. Truy cập tab **Actions** trên GitHub repository của bạn → Chọn **Build Unsigned iOS IPA for iPaside** → Bấm **Run workflow**.
4. Chờ khoảng 8–12 phút để máy ảo macOS của GitHub build xong, tải file `FitTrack70-IPA.zip` về và giải nén lấy file `FitTrack70_unsigned.ipa`.

### Phương án B: Xuất `.ipa` qua Expo EAS Cloud (Nếu đã có tài khoản Apple Developer)

1. Mở Terminal tại thư mục dự án trên Windows:
   ```bash
   npm install -g eas-cli
   eas login
   eas build -p ios --profile preview
   ```
2. Đăng nhập tài khoản Apple Developer khi được hỏi để EAS tự động ký Ad-Hoc và trả về link tải file `.ipa`.

---

## PHẦN 3: CÀI ĐẶT LÊN IPHONE QUA IPASIDE & VẬN HÀNH

1. **Ký chứng chỉ trên iPaside:**
   * Mở trang/ứng dụng **iPaside** của bạn trên iPhone hoặc trình duyệt PC.
   * Upload file `FitTrack70_unsigned.ipa` vừa tải về.
   * Chọn chứng chỉ cá nhân (P12 + MobileProvision) của bạn và bấm **Sign App** (Ký ứng dụng).
   * Bấm **Install** (Cài đặt trực tiếp qua OTA) hoặc tải file `.ipa` đã ký về cài vào iPhone.

2. **Tin cậy ứng dụng (Nếu cài lần đầu):**
   * Trên iPhone, vào **Cài đặt (Settings) → Cài đặt chung (General) → Quản lý VPN & Thiết bị (VPN & Device Management)** → Chọn chứng chỉ doanh nghiệp/cá nhân của bạn và bấm **Tin cậy (Trust)**.

3. **Checklist vận hành ngày đầu tiên trên App:**
   * **06:30 sáng:** Bước lên cân, nhập chính xác số cân buổi sáng vào thẻ **Cân nặng** trên app.
   * **07:15 sáng:** Bấm chọn nhanh `3 Trứng gà luộc` + `Americano đá` và `+500ml` nước lọc.
   * **18:15 tối:** Mở mục **Kế hoạch vận động**, bấm chạy bộ đếm giờ 40 phút cho buổi tập bụng + Cardio và tick hoàn thành từng mục.
   * **22:00 tối:** Kiểm tra lại thanh tiến độ Calo đảm bảo nằm trong vùng xanh (`≤ 1.450 kcal`), bấm **Chốt ngày** trước khi đi ngủ lúc 22h30.