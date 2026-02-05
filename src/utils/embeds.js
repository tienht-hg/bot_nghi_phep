const { EmbedBuilder } = require('discord.js');

class EmbedUtils {
  /**
   * Create embed for leave request form submission confirmation
   */
  static createFormSubmissionEmbed(requestData) {
    // Use displayText for date ranges, fallback to leaveDate for single days
    const dateDisplay = requestData.leaveDateDisplay || requestData.leaveDate;
    const timeDisplay = requestData.isRange ? '' : requestData.leaveTime;

    const fields = [
      { name: '👤 Họ và tên', value: requestData.fullName, inline: true },
      { name: '📅 Ngày nghỉ', value: dateDisplay, inline: true }
    ];

    // Only show time field for single day requests
    if (!requestData.isRange) {
      fields.push({ name: '⏰ Thời gian nghỉ', value: timeDisplay, inline: true });
    }

    fields.push(
      { name: '📝 Lý do nghỉ', value: requestData.reason, inline: false },
      { name: '👨‍💼 Quản lý trực tiếp', value: requestData.directManager, inline: false }
    );

    return new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✅ Đơn xin nghỉ phép đã được gửi')
      .setDescription('Đơn của bạn đã được gửi đến trưởng phòng để xem xét.')
      .addFields(fields)
      .setTimestamp()
      .setFooter({ text: 'Hệ thống quản lý nghỉ phép' });
  }

  /**
   * Create embed for manager approval request
   */
  static createManagerApprovalEmbed(requestData, employeeUser) {
    const dateDisplay = requestData.leaveDateDisplay || requestData.leaveDate;

    const fields = [
      { name: '👤 Họ và tên', value: requestData.fullName, inline: true },
      { name: '📅 Ngày nghỉ', value: dateDisplay, inline: true }
    ];

    if (!requestData.isRange) {
      fields.push({ name: '⏰ Thời gian nghỉ', value: requestData.leaveTime, inline: true });
    }

    fields.push({ name: '📝 Lý do nghỉ', value: requestData.reason, inline: false });

    return new EmbedBuilder()
      .setColor('#ffaa00')
      .setTitle('📋 Yêu cầu nghỉ phép mới')
      .setDescription(`Nhân viên **${requestData.fullName}** đã gửi đơn xin nghỉ phép cần được duyệt.`)
      .addFields(fields)
      .setThumbnail(employeeUser?.displayAvatarURL() || null)
      .setTimestamp()
      .setFooter({ text: 'Vui lòng chọn Duyệt hoặc Từ chối bên dưới' });
  }

  /**
   * Create embed for HR notification (approved requests)
   */
  static createHRNotificationEmbed(requestData, managerUser) {
    const dateDisplay = requestData.leaveDateDisplay || requestData.leaveDate;

    const fields = [
      { name: '👤 Họ và tên', value: requestData.fullName, inline: true },
      { name: '📅 Ngày nghỉ', value: dateDisplay, inline: true }
    ];

    if (!requestData.isRange) {
      fields.push({ name: '⏰ Thời gian nghỉ', value: requestData.leaveTime, inline: true });
    }

    fields.push(
      { name: '📝 Lý do nghỉ', value: requestData.reason, inline: false },
      { name: '✅ Được duyệt bởi', value: managerUser?.displayName || 'Trưởng phòng', inline: false }
    );

    return new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✅ Đơn nghỉ phép được duyệt')
      .setDescription(`Đơn nghỉ phép của **${requestData.fullName}** đã được duyệt bởi trưởng phòng.`)
      .addFields(fields)
      .setTimestamp()
      .setFooter({ text: 'Dữ liệu đã được cập nhật vào Google Calendar' });
  }

  /**
   * Create embed for approval confirmation to manager
   */
  static createApprovalConfirmationEmbed(requestData, action) {
    const color = action === 'approved' ? '#00ff00' : '#ff0000';
    const title = action === 'approved' ? '✅ Đã duyệt đơn nghỉ phép' : '❌ Đã từ chối đơn nghỉ phép';
    const description = action === 'approved'
      ? `Bạn đã duyệt đơn nghỉ phép của **${requestData.fullName}**. Dữ liệu đã được lưu vào Google Calendar.`
      : `Bạn đã từ chối đơn nghỉ phép của **${requestData.fullName}**. Nhân viên đã được thông báo.`;

    const dateDisplay = requestData.leaveDateDisplay || requestData.leaveDate;

    const fields = [
      { name: '👤 Nhân viên', value: requestData.fullName, inline: true },
      { name: '📅 Ngày nghỉ', value: dateDisplay, inline: true }
    ];

    if (!requestData.isRange) {
      fields.push({ name: '⏰ Thời gian', value: requestData.leaveTime, inline: true });
    }

    return new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description)
      .addFields(fields)
      .setTimestamp();
  }

  /**
   * Create embed for employee notification (approved/rejected)
   */
  static createEmployeeNotificationEmbed(requestData, action, managerUser) {
    const color = action === 'approved' ? '#00ff00' : '#ff0000';
    const title = action === 'approved' ? '✅ Đơn nghỉ phép được duyệt' : '❌ Đơn nghỉ phép bị từ chối';
    const description = action === 'approved'
      ? 'Chúc mừng! Đơn xin nghỉ phép của bạn đã được duyệt.'
      : 'Đơn xin nghỉ phép của bạn đã bị từ chối. Vui lòng liên hệ trưởng phòng để biết thêm chi tiết.';

    const dateDisplay = requestData.leaveDateDisplay || requestData.leaveDate;

    const fields = [
      { name: '📅 Ngày nghỉ', value: dateDisplay, inline: true }
    ];

    if (!requestData.isRange) {
      fields.push({ name: '⏰ Thời gian nghỉ', value: requestData.leaveTime, inline: true });
    }

    fields.push(
      { name: '📝 Lý do nghỉ', value: requestData.reason, inline: false },
      { name: '👨‍💼 Xử lý bởi', value: managerUser?.displayName || 'Trưởng phòng', inline: false }
    );

    return new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description)
      .addFields(fields)
      .setTimestamp();
  }

  /**
   * Create error embed
   */
  static createErrorEmbed(title, description) {
    return new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle(`❌ ${title}`)
      .setDescription(description)
      .setTimestamp();
  }

  /**
   * Create success embed
   */
  static createSuccessEmbed(title, description) {
    return new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle(`✅ ${title}`)
      .setDescription(description)
      .setTimestamp();
  }
}

module.exports = EmbedUtils;
