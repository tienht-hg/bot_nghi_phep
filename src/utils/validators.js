class Validators {
  /**
   * Validate email format
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate employee ID format (customize as needed)
   */
  static isValidEmployeeId(employeeId) {
    // Example: Employee ID should be alphanumeric, 3-10 characters
    const employeeIdRegex = /^[A-Za-z0-9]{3,10}$/;
    return employeeIdRegex.test(employeeId);
  }

  /**
   * Validate date format (dd/mm/yyyy)
   */
  static isValidDate(dateString) {
    const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match = dateString.match(dateRegex);

    if (!match) return false;

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    // Basic date validation
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    if (year < 2020 || year > 2030) return false;

    // Create date object to validate
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day;
  }

  /**
   * Validate that date is not in the past
   */
  static isDateInFuture(dateString) {
    if (!this.isValidDate(dateString)) return false;

    const [day, month, year] = dateString.split('/').map(Number);
    const inputDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day

    return inputDate >= today;
  }

  /**
   * Validate full name (should contain at least first and last name)
   */
  static isValidFullName(fullName) {
    if (!fullName || fullName.trim().length < 2) return false;

    // Should contain at least 2 words
    const words = fullName.trim().split(/\s+/);
    return words.length >= 2 && words.every(word => word.length > 0);
  }

  /**
   * Validate reason (should not be empty and have reasonable length)
   */
  static isValidReason(reason) {
    if (!reason || reason.trim().length < 5) return false;
    if (reason.trim().length > 500) return false;
    return true;
  }

  /**
   * Sanitize input to prevent injection attacks
   */
  static sanitizeInput(input) {
    if (typeof input !== 'string') return '';

    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .substring(0, 1000); // Limit length
  }

  /**
   * Validate all form data
   */
  static validateLeaveRequestData(data) {
    const errors = [];

    // Full name validation
    if (!this.isValidFullName(data.fullName)) {
      errors.push('Họ và tên phải có ít nhất 2 từ');
    }

    // Date validation
    if (!this.isValidDate(data.leaveDate)) {
      errors.push('Ngày nghỉ không hợp lệ (định dạng: dd/mm/yyyy)');
    }

    // Reason validation
    if (!this.isValidReason(data.reason)) {
      errors.push('Lý do nghỉ phải có ít nhất 5 ký tự và không quá 500 ký tự');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Format date to dd/mm/yyyy
   */
  static formatDate(date) {
    if (date instanceof Date) {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return date;
  }

  /**
   * Parse combined leave date and time input
   * Formats accepted:
   * - "14/01/2026" -> { date: "14/01/2026", time: "Cả ngày" }
   * - "Buổi sáng, 14/01/2026" -> { date: "14/01/2026", time: "Buổi sáng" }
   * - "Buổi chiều, 14/01/2026" -> { date: "14/01/2026", time: "Buổi chiều" }
   * @param {string} input - Combined date and time string
   * @returns {Object|null} { date: string, time: string, isValid: boolean, error?: string }
   */
  static parseLeaveDateTime(input) {
    if (!input || typeof input !== 'string') {
      return { isValid: false, error: 'Vui lòng nhập ngày nghỉ' };
    }

    const trimmedInput = input.trim();

    // Check if input contains time prefix (case-insensitive)
    // Support both comma and space as separator: "Buổi sáng, 17/01" or "Buổi sáng 17/01"
    const morningMatch = trimmedInput.match(/^buổi\s+sáng[\s,]+(.+)$/i);
    const afternoonMatch = trimmedInput.match(/^buổi\s+chiều[\s,]+(.+)$/i);

    let date, time;

    if (morningMatch) {
      date = morningMatch[1].trim();
      time = 'Buổi sáng';
    } else if (afternoonMatch) {
      date = afternoonMatch[1].trim();
      time = 'Buổi chiều';
    } else {
      // No time prefix, assume full day
      date = trimmedInput;
      time = 'Cả ngày';
    }

    // Validate the extracted date
    if (!this.isValidDate(date)) {
      return {
        isValid: false,
        error: 'Ngày không hợp lệ. Định dạng đúng: dd/mm/yyyy hoặc Buổi sáng/chiều, dd/mm/yyyy'
      };
    }

    return {
      isValid: true,
      date: date,
      time: time
    };
  }

  /**
   * Parse time prefix from a date string
   * @param {string} input - e.g., "Buổi sáng, 15/01/2026" or "Buổi sáng 15/01/2026" or "15/01/2026"
   * @returns {Object} { date: string, time: string }
   */
  static parseTimeAndDate(input) {
    const trimmed = input.trim();

    // Support both comma and space as separator: "Buổi sáng, 17/01" or "Buổi sáng 17/01"
    const morningMatch = trimmed.match(/^buổi\s+sáng[\s,]+(.+)$/i);
    const afternoonMatch = trimmed.match(/^buổi\s+chiều[\s,]+(.+)$/i);

    if (morningMatch) {
      return { date: morningMatch[1].trim(), time: 'Buổi sáng' };
    } else if (afternoonMatch) {
      return { date: afternoonMatch[1].trim(), time: 'Buổi chiều' };
    } else {
      return { date: trimmed, time: 'Cả ngày' };
    }
  }

  /**
   * Parse combined leave date/time input with optional range
   * Formats accepted:
   * - "14/01/2026" -> single day, full day
   * - "Buổi sáng, 14/01/2026" -> single day, morning
   * - "14/01/2026 - 16/01/2026" -> date range, full day each
   * - "Buổi sáng, 14/01/2026 - Buổi chiều, 16/01/2026" -> date range with different times
   * @param {string} input - Combined date and time string
   * @returns {Object} { isValid, dates: [{ date, time }], isRange, displayText, error? }
   */
  static parseLeaveDateTimeRange(input) {
    if (!input || typeof input !== 'string') {
      return { isValid: false, error: 'Vui lòng nhập ngày nghỉ' };
    }

    const trimmedInput = input.trim();

    // Check for date range separator " - " or "-"
    // Be careful to not match the "-" in the date itself
    const rangeMatch = trimmedInput.match(/^(.+?)\s*-\s*(.+)$/);

    // Validate if this looks like a range (has 2 parts with dates)
    if (rangeMatch) {
      const part1 = rangeMatch[1].trim();
      const part2 = rangeMatch[2].trim();

      // Parse both parts
      const startParsed = this.parseTimeAndDate(part1);
      const endParsed = this.parseTimeAndDate(part2);

      // Check if both dates are valid
      if (this.isValidDate(startParsed.date) && this.isValidDate(endParsed.date)) {
        // This is a valid date range
        const startDate = this.parseToDateObject(startParsed.date);
        const endDate = this.parseToDateObject(endParsed.date);

        // Validate start date is not in the past
        if (!this.isDateInFuture(startParsed.date)) {
          return {
            isValid: false,
            error: 'Ngày bắt đầu không thể là ngày trong quá khứ'
          };
        }

        // Validate end date is not before start date
        if (endDate < startDate) {
          return {
            isValid: false,
            error: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu'
          };
        }

        // Validate range is not too long (max 30 days)
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        if (daysDiff > 30) {
          return {
            isValid: false,
            error: 'Khoảng nghỉ tối đa 30 ngày'
          };
        }

        // Expand date range into individual days
        const dates = [];
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
          const dateStr = this.formatDate(currentDate);
          let time;

          if (currentDate.getTime() === startDate.getTime()) {
            // First day: use start time
            time = startParsed.time;
          } else if (currentDate.getTime() === endDate.getTime()) {
            // Last day: use end time
            time = endParsed.time;
          } else {
            // Middle days: full day
            time = 'Cả ngày';
          }

          dates.push({ date: dateStr, time: time });
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Create display text
        let displayText;
        if (startParsed.time === 'Cả ngày' && endParsed.time === 'Cả ngày') {
          displayText = `${startParsed.date} → ${endParsed.date} (${dates.length} ngày)`;
        } else {
          displayText = `${startParsed.time}, ${startParsed.date} → ${endParsed.time}, ${endParsed.date} (${dates.length} ngày)`;
        }

        return {
          isValid: true,
          isRange: true,
          dates: dates,
          displayText: displayText,
          startDate: startParsed.date,
          endDate: endParsed.date,
          startTime: startParsed.time,
          endTime: endParsed.time,
          totalDays: dates.length
        };
      }
    }

    // Not a range, try single date
    const singleResult = this.parseLeaveDateTime(trimmedInput);

    if (!singleResult.isValid) {
      return {
        isValid: false,
        error: singleResult.error || 'Định dạng không hợp lệ. VD: 15/01/2026 hoặc 15/01/2026 - 17/01/2026'
      };
    }

    // Validate single date is not in the past
    if (!this.isDateInFuture(singleResult.date)) {
      return {
        isValid: false,
        error: 'Ngày nghỉ không thể là ngày trong quá khứ'
      };
    }

    return {
      isValid: true,
      isRange: false,
      dates: [{ date: singleResult.date, time: singleResult.time }],
      displayText: singleResult.date,
      totalDays: 1
    };
  }

  /**
   * Parse date string (dd/mm/yyyy) to Date object
   */
  static parseToDateObject(dateStr) {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  }
}

module.exports = Validators;
