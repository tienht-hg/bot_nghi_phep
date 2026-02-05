const { google } = require('googleapis');
const config = require('../config/config');

class GoogleCalendarService {
  constructor() {
    this.auth = null;
    this.calendar = null;
    this.initPromise = this.init();
  }

  async init() {
    try {
      // Create JWT authentication
      this.auth = new google.auth.JWT(
        config.googleCalendar.serviceAccountEmail,
        null,
        config.googleCalendar.privateKey,
        ['https://www.googleapis.com/auth/calendar']
      );

      // Authorize the client
      await this.auth.authorize();

      // Create calendar API instance
      this.calendar = google.calendar({ version: 'v3', auth: this.auth });

      console.log('✅ Google Calendar service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Google Calendar service:', error.message);
      throw error;
    }
  }

  async ensureInitialized() {
    await this.initPromise;
  }

  /**
   * Parse date string from Vietnamese format (dd/mm/yyyy) to ISO format
   * @param {string} dateStr - Date in format dd/mm/yyyy
   * @param {string} timeOption - 'Buổi sáng', 'Buổi chiều', or 'Cả ngày'
   * @returns {Object} { start: ISO string, end: ISO string }
   */
  parseDateAndTime(dateStr, timeOption) {
    const [day, month, year] = dateStr.split('/');
    const date = new Date(year, month - 1, day);

    let startHour, startMinute, endHour, endMinute;

    switch (timeOption) {
      case 'Buổi sáng':
        startHour = 8;
        startMinute = 30;
        endHour = 12;
        endMinute = 0;
        break;
      case 'Buổi chiều':
        startHour = 13;
        startMinute = 30;
        endHour = 17;
        endMinute = 30;
        break;
      case 'Cả ngày':
        startHour = 8;
        startMinute = 30;
        endHour = 17;
        endMinute = 30;
        break;
      default:
        startHour = 8;
        startMinute = 30;
        endHour = 17;
        endMinute = 30;
    }

    const startDate = new Date(date);
    startDate.setHours(startHour, startMinute, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(endHour, endMinute, 0, 0);

    return {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    };
  }

  /**
   * Add a new leave request to Google Calendar
   * @param {Object} requestData - Leave request data (supports date ranges via dates array)
   * @param {string} status - Request status ('Đã duyệt' or 'Từ chối')
   */
  async addLeaveRequest(requestData, status = 'Đã duyệt') {
    try {
      await this.ensureInitialized();

      if (!this.calendar) {
        throw new Error('Google Calendar service not initialized');
      }

      // Check if this is a date range request (has dates array)
      const datesToProcess = requestData.dates || [{
        date: requestData.leaveDate,
        time: requestData.leaveTime
      }];

      const createdEvents = [];

      for (const dateInfo of datesToProcess) {
        // Parse date and time for this day
        const { start, end } = this.parseDateAndTime(dateInfo.date, dateInfo.time);

        // Create event description with all details
        const displayText = requestData.leaveDateDisplay || requestData.leaveDate;
        const description = `
📋 Thông tin đơn nghỉ phép

👤 Nhân viên: ${requestData.fullName}
📅 Ngày nghỉ: ${displayText}
📆 Ngày hiện tại: ${dateInfo.date} (${dateInfo.time})
📝 Lý do: ${requestData.reason}
👔 Quản lý: ${requestData.directManager}
✅ Trạng thái: ${status}
        `.trim();

        // Determine event color based on leave time
        // Color codes: 9=blue (morning), 5=yellow (afternoon), 11=red (full day)
        let colorId;
        switch (dateInfo.time) {
          case 'Buổi sáng':
            colorId = '9'; // Blue
            break;
          case 'Buổi chiều':
            colorId = '5'; // Yellow
            break;
          case 'Cả ngày':
            colorId = '11'; // Red
            break;
          default:
            colorId = '9'; // Default blue
        }

        // Create summary - include day info if it's a range
        let summary = `${requestData.fullName}: ${requestData.reason}`;
        if (requestData.isRange) {
          summary = `${requestData.fullName} (${dateInfo.time}): ${requestData.reason}`;
        }

        // Create calendar event
        const event = {
          summary: summary,
          description: description,
          start: {
            dateTime: start,
            timeZone: 'Asia/Ho_Chi_Minh',
          },
          end: {
            dateTime: end,
            timeZone: 'Asia/Ho_Chi_Minh',
          },
          colorId: colorId,
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 }, // 1 day before
              { method: 'popup', minutes: 60 }, // 1 hour before
            ],
          },
        };

        const response = await this.calendar.events.insert({
          calendarId: config.googleCalendar.calendarId,
          resource: event,
        });

        createdEvents.push({
          date: dateInfo.date,
          time: dateInfo.time,
          eventId: response.data.id,
          eventLink: response.data.htmlLink
        });

        console.log(`✅ Leave request event added for ${dateInfo.date} (${dateInfo.time}):`, {
          eventId: response.data.id,
          eventLink: response.data.htmlLink,
          status: response.data.status
        });
      }

      console.log(`✅ Total ${createdEvents.length} event(s) created for leave request`);
      return createdEvents;
    } catch (error) {
      console.error('❌ Error adding to Google Calendar:', error.message);
      throw error;
    }
  }

  /**
   * Update an existing leave request event
   * @param {string} eventId - Calendar event ID
   * @param {string} status - New status ('Đã duyệt' or 'Từ chối')
   */
  async updateLeaveRequestStatus(eventId, status) {
    try {
      await this.ensureInitialized();

      if (!this.calendar) {
        throw new Error('Google Calendar service not initialized');
      }

      // Get existing event
      const event = await this.calendar.events.get({
        calendarId: config.googleCalendar.calendarId,
        eventId: eventId,
      });

      // Update description with new status
      const updatedDescription = event.data.description.replace(
        /✅ Trạng thái: .*/,
        `✅ Trạng thái: ${status}`
      );

      // Update color based on status
      const colorId = status === 'Đã duyệt' ? '10' : '11';

      // Update event
      const response = await this.calendar.events.update({
        calendarId: config.googleCalendar.calendarId,
        eventId: eventId,
        resource: {
          ...event.data,
          description: updatedDescription,
          colorId: colorId,
        },
      });

      console.log('✅ Leave request status updated in Google Calendar:', {
        eventId: response.data.id,
        newStatus: status
      });

      return response.data;
    } catch (error) {
      console.error('❌ Error updating Google Calendar event:', error.message);
      throw error;
    }
  }

  /**
   * Get leave requests for a specific date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   */
  async getLeaveRequests(startDate, endDate) {
    try {
      await this.ensureInitialized();

      if (!this.calendar) {
        throw new Error('Google Calendar service not initialized');
      }

      const response = await this.calendar.events.list({
        calendarId: config.googleCalendar.calendarId,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      console.log('✅ Retrieved leave requests from Google Calendar:', {
        count: response.data.items.length
      });

      return response.data.items;
    } catch (error) {
      console.error('❌ Error getting leave requests from Google Calendar:', error.message);
      throw error;
    }
  }

  /**
   * Test connection to Google Calendar
   */
  async testConnection() {
    try {
      await this.ensureInitialized();

      if (!this.calendar) {
        throw new Error('Google Calendar service not initialized');
      }

      const response = await this.calendar.calendars.get({
        calendarId: config.googleCalendar.calendarId
      });

      console.log('✅ Google Calendar connection test successful');
      console.log(`📅 Calendar: ${response.data.summary}`);
      return true;
    } catch (error) {
      console.error('❌ Google Calendar connection test failed:', error.message);
      return false;
    }
  }
}

module.exports = new GoogleCalendarService();
