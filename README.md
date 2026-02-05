# Discord Bot Xin Nghỉ Phép

Bot Discord chuyên nghiệp để quản lý yêu cầu nghỉ phép nội bộ công ty, tích hợp với Google Calendar.

## 🎯 Tính năng chính

- **Form xin nghỉ phép**: Nhân viên gửi yêu cầu qua DM với bot
- **Duyệt tự động**: Trưởng phòng nhận thông báo và duyệt/từ chối đơn
- **Lưu trữ dữ liệu**: Tự động tạo sự kiện trong Google Calendar
- **Quản lý tập trung**: HR xem tất cả đơn nghỉ phép trực tiếp trên Google Calendar
- **Thông báo hàng ngày**: Bot tự động gửi thông báo vào channel về danh sách người nghỉ phép mỗi ngày lúc 7:00 sáng
- **Bảo mật**: Xác thực quyền hạn và validation dữ liệu

## 🚀 Cài đặt

### 1. Yêu cầu hệ thống
- Node.js 16.9.0 trở lên
- npm hoặc yarn
- Discord Bot Token
- Google Service Account

### 2. Clone repository
```bash
git clone <repository-url>
cd discord-bot-nghi-phep
```

### 3. Cài đặt dependencies
```bash
npm install
```

### 4. Cấu hình môi trường
Sao chép `.env.example` thành `.env` và điền thông tin:

```bash
cp .env.example .env
```

Chỉnh sửa file `.env`:
```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_bot_client_id_here
NOTIFICATION_CHANNEL_ID=your_channel_id_here

# Google Calendar Configuration  
GOOGLE_CALENDAR_ID=primary
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----"
```

**Lưu ý**: 
- Tất cả đơn nghỉ phép được lưu trực tiếp vào Google Calendar
- HR không nhận thông báo qua Discord channel nữa, thay vào đó xem trực tiếp trên Calendar
- Bot sẽ tự động gửi thông báo danh sách người nghỉ phép hàng ngày vào channel được chỉ định (NOTIFICATION_CHANNEL_ID)

### 5. Cấu hình danh sách quản lý

Chỉnh sửa file `managers.json` để thêm danh sách quản lý và Discord User ID của họ:

```json
{
  "managers": [
    {
      "id": 1,
      "fullName": "Nguyễn Văn A",
      "position": "Department Manager",
      "discordId": "123456789012345678"
    },
    {
      "id": 2,
      "fullName": "Trần Thị B",
      "position": "Leader Marketing",
      "discordId": "234567890123456789"
    },
    {
      "id": 3,
      "fullName": "Lê Văn C",
      "position": "Leader Designer",
      "discordId": "345678901234567890"
    }
  ]
}
```

**Cách lấy Discord User ID:**
1. Bật **Developer Mode** trong Discord: `User Settings > App Settings > Advanced > Developer Mode`
2. Click chuột phải vào tên người dùng > **Copy User ID**

**⚠️ Lưu ý quan trọng:**
- Tên trong file JSON (trường `fullName`) phải khớp **CHÍNH XÁC** (bao gồm hoa/thường, dấu) với tên mà nhân viên nhập vào form
- Khi nhân viên điền form, họ sẽ nhập tên quản lý trực tiếp, bot sẽ tự động tìm Discord ID tương ứng từ file này

### 6. Deploy commands
```bash
node src/deploy-commands.js
```

### 7. Khởi chạy bot
```bash
npm start
```

Hoặc chế độ development:
```bash
npm run dev
```

## 📋 Hướng dẫn sử dụng

### Cho nhân viên:
1. Gửi tin nhắn riêng (DM) với bot
2. Sử dụng lệnh `/form` để mở form xin nghỉ phép
3. Điền đầy đủ thông tin trong form
4. Chờ trưởng phòng duyệt

### Cho trưởng phòng:
1. Nhận thông báo DM từ bot khi có đơn mới
2. Nhấn nút "✅ Duyệt" hoặc "❌ Từ chối"
3. Hệ thống tự động xử lý và thông báo

### Cho HR:
1. Xem tất cả đơn nghỉ phép trực tiếp trên Google Calendar
2. Mỗi đơn được duyệt tự động tạo event với đầy đủ thông tin
3. Dễ dàng theo dõi lịch nghỉ của toàn bộ nhân viên
4. Nhận thông báo tự động mỗi ngày lúc 7:00 sáng về danh sách người nghỉ phép trong ngày

## 🔧 Cấu hình

### Phòng ban

Danh sách phòng ban được sử dụng trong form dropdown. Chỉnh sửa trong `src/config/config.js`:

```javascript
departments: [
  'Nhân sự',
  'Kế toán', 
  'Kinh doanh',
  'Kỹ thuật',
  'Marketing'
],
```

**⚠️ Lưu ý:** Phòng ban chỉ dùng để hiển thị thông tin, **KHÔNG** dùng để xác định người duyệt đơn.

### Quản lý và người duyệt đơn

Danh sách quản lý được quản lý trong file `managers.json`:

```json
{
  "managers": [
    {
      "id": 1,
      "fullName": "Phạm Tuấn Anh",
      "position": "Department Manager",
      "discordId": "1353938845812654150"
    },
    {
      "id": 2,
      "fullName": "Bùi Phương Linh",
      "position": "Department Manager",
      "discordId": "1399621564240232508"
    },
    {
      "id": 3,
      "fullName": "Võ Hoài Nam",
      "position": "Leader Marketing",
      "discordId": "1355009413878120540"
    }
  ]
}
```

**Cách hoạt động:**
1. Nhân viên nhập tên "Quản lý trực tiếp" vào form (ví dụ: "Phạm Tuấn Anh")
2. Bot tự động tìm Discord ID tương ứng trong file `managers.json`
3. Bot gửi thông báo duyệt đơn đến Discord ID đó

**⚠️ Quan trọng:** Tên phải khớp **CHÍNH XÁC** (hoa/thường, dấu) giữa form và file JSON

### Google Calendar
- Mỗi đơn nghỉ phép tạo một event trong calendar
- Event title: 🏖️ Nghỉ phép: [Tên nhân viên]
- Event time: Theo ngày và thời gian nghỉ
- Event description: Đầy đủ thông tin đơn nghỉ phép
- Event color: Xanh (duyệt) / Đỏ (từ chối)
- Xem chi tiết cấu hình trong `CALENDAR_SETUP.md`

## 🛡️ Bảo mật

- Validation dữ liệu đầu vào
- Xác thực quyền hạn trưởng phòng
- Sanitize input để tránh injection
- Rate limiting tự nhiên qua Discord API

## 📊 Logging

Bot ghi log các hoạt động quan trọng:
- Gửi/nhận form
- Duyệt/từ chối đơn
- Cập nhật Google Sheets
- Lỗi hệ thống

## 🔍 Troubleshooting

### Bot không phản hồi
- Kiểm tra token Discord
- Đảm bảo bot có quyền gửi DM
- Kiểm tra intents trong Developer Portal

### Lỗi Google Calendar
- Xác minh Service Account credentials
- Kiểm tra quyền truy cập calendar
- Đảm bảo Google Calendar API được bật
- Xem chi tiết trong `CALENDAR_SETUP.md`

### Lỗi permissions
- Service Account cần quyền truy cập Google Calendar API
- Đảm bảo calendar đã được share với service account (nếu dùng calendar riêng)

## 📝 API Reference

### Commands
- `/form` - Mở form xin nghỉ phép (chỉ DM)
- `/checkleaves` - Kiểm tra và gửi thông báo người nghỉ phép hôm nay (chỉ Admin)

### Events
- `ready` - Bot khởi động
- `interactionCreate` - Xử lý slash commands, modals, buttons

### Services
- `GoogleCalendarService` - Quản lý tương tác Google Calendar
- `DailyNotificationService` - Quản lý thông báo hàng ngày về danh sách người nghỉ phép
- `EmbedUtils` - Tạo Discord embeds
- `Validators` - Validation dữ liệu

## 🤝 Đóng góp

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Tạo Pull Request

## 📄 License

MIT License - xem file LICENSE để biết chi tiết.

## 🔔 Tính năng thông báo hàng ngày

Bot tự động gửi thông báo vào channel chỉ định mỗi ngày lúc 7:00 sáng (giờ Việt Nam) nếu có người nghỉ phép trong ngày đó.

### Cấu hình:
1. Thêm `NOTIFICATION_CHANNEL_ID` vào file `.env`
2. Bot sẽ tự động kiểm tra và gửi thông báo
3. Nếu không có ai nghỉ, bot sẽ không gửi thông báo

### Test thủ công:
Sử dụng lệnh `/checkleaves` để test ngay lập tức (chỉ Admin)

**Xem chi tiết trong file `DAILY_NOTIFICATION.md`**

## 📞 Hỗ trợ

Nếu gặp vấn đề, vui lòng tạo issue trên GitHub hoặc liên hệ team phát triển.
