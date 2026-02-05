const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const googleCalendar = require('./googleCalendar');
const config = require('../config/config');

class DailyNotificationService {
  constructor(client) {
    this.client = client;
    this.cronJob = null;

    // Initialize Google Gemini client
    this.gemini = null;
    if (config.gemini?.apiKey?.trim()) {
      const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
      this.gemini = genAI.getGenerativeModel({ model: config.gemini.model });
      console.log(`✅ Google Gemini initialized (${config.gemini.model}) for motivational messages`);
    } else {
      console.log('⚠️ Google Gemini API key not configured, using fallback messages');
    }
  }

  start() {
    this.cronJob = cron.schedule('31 8 * * *', async () => {
      const now = new Date();
      console.log(`🔔 [${now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}] Running daily leave notification check...`);
      console.log(`⏰ Scheduled: 08:30 | Actual: ${now.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
      await this.checkAndNotifyTodayLeaves();
    }, {
      scheduled: true,
      timezone: 'Asia/Ho_Chi_Minh'
    });

    console.log('✅ Daily notification scheduler started (08:30 AM Vietnam time)');
  }
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('🛑 Daily notification scheduler stopped');
    }
  }
  async getTodayLeaves() {
    try {
      // Get today's date range (start and end of day)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const events = await googleCalendar.getLeaveRequests(today, tomorrow);
      return events.map(event => {
        const description = event.description || '';

        const nameMatch = description.match(/👤 Nhân viên: (.+)/);
        const dateMatch = description.match(/📅 Ngày nghỉ: (.+)/);
        // Time is now in format: 📆 Ngày hiện tại: 17/01/2026 (Cả ngày)
        const currentDayMatch = description.match(/📆 Ngày hiện tại: .+ \((.+)\)/);
        const reasonMatch = description.match(/📝 Lý do: (.+)/);

        return {
          name: nameMatch ? nameMatch[1].trim() : event.summary || 'N/A',
          date: dateMatch ? dateMatch[1].trim() : 'N/A',
          time: currentDayMatch ? currentDayMatch[1].trim() : 'N/A',
          reason: reasonMatch ? reasonMatch[1].trim() : 'N/A',
          summary: event.summary || ''
        };
      });
    } catch (error) {
      console.error('❌ Error getting today leaves:', error);
      throw error;
    }
  }

  /**
   * Format date for display
   */
  formatTodayDate() {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Get motivational message from Google Gemini
   */
  async getMotivationalMessage() {
    if (!this.gemini) {
      console.error('❌ Google Gemini not initialized. Please add GOOGLE_GEMINI_API_KEY to .env file');
      return '💪 Chúc anh em một ngày làm việc hiệu quả!';
    }

    try {
      const prompt = `Bạn là một trợ lý thân thiện. Tạo một câu động viên ngắn gọn (1 câu, tối đa 80 ký tự) cho nhân viên văn phòng Việt Nam bắt đầu ngày làm việc. 

Câu nói phải:
- Tích cực, gần gũi, thân thiện
- Có emoji phù hợp
- Phong cách Việt Nam, dùng từ "anh em", "team", "mọi người"
- Không lặp lại câu cũ

Ví dụ các câu hay:
- 💪 Chúc anh em một ngày làm việc hiệu quả!
- 🌟 Hôm nay cũng cố gắng hết mình nhé mọi người!
- 🚀 Chúc team một ngày làm việc thật tốt!
- 🎯 Chúc anh em đạt được nhiều thành tựu trong ngày hôm nay!
- 🌈 Hãy bắt đầu ngày mới với năng lượng tích cực nhé!
- 🔥 Cùng nhau tạo nên những thành công mới hôm nay!

Bây giờ hãy tạo một câu mới theo phong cách trên. Chỉ trả về câu động viên, không giải thích.`;

      const fallbackMessage = '💪 Chúc anh em một ngày làm việc hiệu quả!';

      const result = await this.gemini.generateContent(prompt);
      const response = await result.response;
      const message = response.text().trim();

      // Check if Gemini returned empty response
      if (!message) {
        console.warn('⚠️ Google Gemini returned empty response, using fallback');
        return fallbackMessage;
      }

      console.log('✅ Generated motivational message from Google Gemini:', message);
      return message;
    } catch (error) {
      console.error('⚠️ Google Gemini API error:', error.message);
      // Return a simple fallback if API fails
      return '💪 Chúc anh em một ngày làm việc hiệu quả!';
    }
  }

  /**
   * Create embed for leave notification
   */
  async createLeaveNotificationEmbed(leaves) {
    const todayDate = this.formatTodayDate();
    const motivationalMsg = await this.getMotivationalMessage();

    const embed = new EmbedBuilder()
      .setColor('#FF6B6B')
      .setTitle('📋 Danh Sách Nhân Viên Nghỉ Phép Hôm Nay')
      .setDescription(`Ngày: ${todayDate}\nTổng số người nghỉ: ${leaves.length} người`);

    // Only set footer if motivationalMsg is not empty
    if (motivationalMsg && motivationalMsg.trim()) {
      embed.setFooter({ text: motivationalMsg });
    }

    // Add each leave request as a field
    leaves.forEach((leave, index) => {
      const fieldValue = [
        `⏰ Thời gian: ${leave.time}`,
        `📝 Lý do: ${leave.reason}`
      ].join('\n');

      embed.addFields({
        name: `${index + 1}. ${leave.name}`,
        value: fieldValue,
        inline: false
      });
    });

    return embed;
  }

  /**
   * Check today's leaves and send notification if any
   */
  async checkAndNotifyTodayLeaves() {
    try {
      // Get today's leaves
      const leaves = await this.getTodayLeaves();

      // If no one is on leave, don't send notification
      if (leaves.length === 0) {
        console.log('✅ No leaves for today. No notification sent.');
        return;
      }

      // Get the notification channel
      const channelId = config.discord.notificationChannelId;
      const channel = await this.client.channels.fetch(channelId);

      if (!channel) {
        console.error('❌ Notification channel not found:', channelId);
        return;
      }

      // Create and send embed
      const embed = await this.createLeaveNotificationEmbed(leaves);
      await channel.send({ embeds: [embed] });

      console.log(`✅ Leave notification sent to channel ${channelId} (${leaves.length} person(s) on leave)`);
    } catch (error) {
      console.error('❌ Error in checkAndNotifyTodayLeaves:', error);
    }
  }

  /**
   * Manual trigger for testing (can be called via command)
   */
  async triggerManualCheck() {
    console.log('🔔 Manual notification check triggered...');
    await this.checkAndNotifyTodayLeaves();
  }
}

module.exports = DailyNotificationService;
