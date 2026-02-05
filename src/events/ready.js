const GoogleCalendarService = require('../services/googleCalendar');
const pendingRequestsStore = require('../utils/pendingRequestsStore');

module.exports = {
  name: 'clientReady',
  once: true,

  async execute(client) {
    console.log('🤖 Bot đã sẵn sàng!');
    console.log(`📊 Đăng nhập với tài khoản: ${client.user.tag}`);
    console.log(`🏢 Đang hoạt động trên ${client.guilds.cache.size} server(s)`);

    // Test Google Calendar connection
    console.log('🔗 Đang kiểm tra kết nối Google Calendar...');
    try {
      const isConnected = await GoogleCalendarService.testConnection();
      if (isConnected) {
        console.log('✅ Kết nối Google Calendar thành công');
      } else {
        console.log('❌ Không thể kết nối Google Calendar');
      }
    } catch (error) {
      console.error('❌ Lỗi kết nối Google Calendar:', error.message);
    }

    // Initialize temporary data storage
    if (!client.tempFormData) {
      client.tempFormData = new Map();
    }

    // Load pending requests from file (persistent storage)
    client.pendingRequests = pendingRequestsStore.load();

    // Clean up expired data every hour
    setInterval(() => {
      cleanupExpiredData(client);
    }, 60 * 60 * 1000); // 1 hour

    // Start daily notification service
    if (client.dailyNotificationService) {
      client.dailyNotificationService.start();
    }

    console.log('🚀 Bot hoàn toàn sẵn sàng để xử lý yêu cầu nghỉ phép!');
  }
};

function cleanupExpiredData(client) {
  const now = Date.now();
  const expireTime = 30 * 60 * 1000; // 30 minutes

  // Clean up expired form data
  if (client.tempFormData) {
    for (const [userId, data] of client.tempFormData.entries()) {
      if (data.timestamp && (now - data.timestamp) > expireTime) {
        client.tempFormData.delete(userId);
        console.log(`🧹 Cleaned up expired form data for user ${userId}`);
      }
    }
  }

  // Clean up expired pending requests (older than 24 hours)
  const requestExpireTime = 24 * 60 * 60 * 1000; // 24 hours
  let cleanedRequests = 0;
  if (client.pendingRequests) {
    for (const [requestKey, request] of client.pendingRequests.entries()) {
      if (request.timestamp && (now - request.timestamp) > requestExpireTime) {
        client.pendingRequests.delete(requestKey);
        cleanedRequests++;
        console.log(`🧹 Cleaned up expired pending request ${requestKey}`);
      }
    }
    // Save to file if any requests were cleaned up
    if (cleanedRequests > 0) {
      pendingRequestsStore.save(client.pendingRequests);
    }
  }

  console.log('🧹 Cleanup completed');
}
