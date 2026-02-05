require('dotenv').config();

module.exports = {
  // Discord Configuration
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    notificationChannelId: process.env.NOTIFICATION_CHANNEL_ID || '1460557304259674124'
    // hrChannelId removed - HR notifications disabled
  },

  // Google Sheets Configuration (kept for backup/reference)
  googleSheets: {
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    sheetName: process.env.GOOGLE_SHEET_NAME || 'Sheet1',
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    range: 'A:J' // Columns A to J (timestamp to status)
  },

  // Google Calendar Configuration
  googleCalendar: {
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  },

  // Available departments for the form
  departments: [
    'Nhân sự',
    'Kế toán',
    'Kinh doanh',
    'Kỹ thuật',
    'Marketing'
  ],

  // Time options for leave requests
  timeOptions: [
    'Buổi sáng',
    'Buổi chiều',
    'Cả ngày'
  ],

  // Google Gemini Configuration
  gemini: {
    apiKey: process.env.GOOGLE_GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-3-flash-preview'
  }
};
