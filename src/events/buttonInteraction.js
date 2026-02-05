const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags
} = require('discord.js');
const EmbedUtils = require('../utils/embeds');
const GoogleCalendarService = require('../services/googleCalendar');
const config = require('../config/config');
const pendingRequestsStore = require('../utils/pendingRequestsStore');

module.exports = {
  name: 'interactionCreate',

  async execute(interaction) {
    if (!interaction.isButton()) return;

    try {
      const customId = interaction.customId;

      if (customId.startsWith('approve_') || customId.startsWith('reject_')) {
        await handleApprovalDecision(interaction);
      } else if (customId.startsWith('continue_form_')) {
        await handleContinueForm(interaction);
      } else if (customId.startsWith('cancel_form_')) {
        await handleCancelForm(interaction);
      } else if (customId.startsWith('retry_form_part2_')) {
        await handleRetryFormPart2(interaction);
      } else if (customId.startsWith('retry_form_')) {
        await handleRetryForm(interaction);
      }
    } catch (error) {
      console.error('Error handling button interaction:', error);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Có lỗi xảy ra khi xử lý yêu cầu. Vui lòng thử lại sau.',
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
};

async function handleApprovalDecision(interaction) {
  const customId = interaction.customId;
  const isApproval = customId.startsWith('approve_');
  const requestKey = customId.replace(/^(approve_|reject_)/, '');
  const originalMessage = interaction.message;

  // Get pending request data
  const pendingRequest = interaction.client.pendingRequests?.get(requestKey);
  if (!pendingRequest) {
    return await interaction.reply({
      content: '❌ Yêu cầu này đã hết hạn hoặc không tồn tại.',
      flags: MessageFlags.Ephemeral
    });
  }

  // Check if user is authorized to make this decision (must be one of the managers)
  const managerIds = pendingRequest.managerIds || [pendingRequest.managerId];
  if (!managerIds.includes(interaction.user.id)) {
    return await interaction.reply({
      content: '❌ Bạn không có quyền xử lý yêu cầu này.',
      flags: MessageFlags.Ephemeral
    });
  }

  const { requestData, employeeId } = pendingRequest;
  const action = isApproval ? 'approved' : 'rejected';
  const status = isApproval ? 'Đã duyệt' : 'Từ chối';

  try {
    // Defer the reply to give us more time for processing
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Get employee user
    const employee = await interaction.client.users.fetch(employeeId);

    if (isApproval) {
      // If approved, add to Google Calendar
      try {
        await GoogleCalendarService.addLeaveRequest(requestData, status);
        console.log('✅ Leave request added to Google Calendar successfully');
      } catch (calendarError) {
        console.error('❌ Error adding to Google Calendar:', calendarError);
        // Continue with the process even if Google Calendar fails
      }

      // HR notification removed - all leave requests are now stored in Google Calendar
      // HR can view the calendar directly instead of receiving channel notifications
    }

    // Send notification to employee
    const employeeEmbed = EmbedUtils.createEmployeeNotificationEmbed(
      requestData,
      action,
      interaction.user
    );

    try {
      await employee.send({ embeds: [employeeEmbed] });
      console.log(`✅ Employee notification sent to ${employee.tag}`);
    } catch (employeeError) {
      console.error('❌ Error sending employee notification:', employeeError);
    }

    // Send confirmation to manager
    const confirmationEmbed = EmbedUtils.createApprovalConfirmationEmbed(requestData, action);
    await interaction.editReply({ embeds: [confirmationEmbed] });

    // Disable the buttons in the original message
    const disabledApproveButton = {
      type: 2, // BUTTON
      style: 3, // SUCCESS (Green)
      label: '✅ Duyệt',
      custom_id: `approve_${requestKey}`,
      disabled: true
    };

    const disabledRejectButton = {
      type: 2, // BUTTON
      style: 4, // DANGER (Red)
      label: '❌ Từ chối',
      custom_id: `reject_${requestKey}`,
      disabled: true
    };

    const disabledComponents = [{
      type: 1, // ACTION_ROW
      components: [disabledApproveButton, disabledRejectButton]
    }];

    // Update the current manager's message to show it's been processed
    // Fetch the channel and message to avoid ChannelNotCached error
    try {
      const dmChannel = await interaction.user.createDM();
      const fetchedMessage = await dmChannel.messages.fetch(originalMessage.id);

      const processedEmbed = {
        ...fetchedMessage.embeds[0]?.data || originalMessage.embeds[0],
        color: isApproval ? 0x00ff00 : 0xff0000, // Green for approved, red for rejected
        title: isApproval ? `✅ Đã duyệt đơn nghỉ phép của ${requestData.fullName}` : `❌ Đã từ chối đơn nghỉ phép của ${requestData.fullName}`
      };

      await fetchedMessage.edit({
        embeds: [processedEmbed],
        components: disabledComponents
      });
    } catch (editError) {
      console.error('⚠️ Could not edit original message:', editError.message);
      // Continue even if we can't edit the message
    }

    // Update messages for other managers to show it's been processed
    const managerMessages = pendingRequest.managerMessages || [];
    for (const msgInfo of managerMessages) {
      // Skip the current manager's message (already edited above)
      if (msgInfo.managerId === interaction.user.id) {
        continue;
      }

      try {
        const otherManager = await interaction.client.users.fetch(msgInfo.managerId);
        const dmChannel = await otherManager.createDM();
        const message = await dmChannel.messages.fetch(msgInfo.messageId);

        // Create notification embed showing who processed the request
        const notificationEmbed = {
          ...message.embeds[0],
          color: isApproval ? 0x00ff00 : 0xff0000, // Green for approved, red for rejected
          title: isApproval
            ? `✅ Đơn của ${requestData.fullName} đã được duyệt bởi ${interaction.user.displayName || interaction.user.username}`
            : `❌ Đơn của ${requestData.fullName} đã bị từ chối bởi ${interaction.user.displayName || interaction.user.username}`,
          footer: {
            text: `Xử lý bởi ${interaction.user.tag} lúc ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`
          }
        };

        // Update the message with disabled buttons
        await message.edit({
          embeds: [notificationEmbed],
          components: disabledComponents
        });

        console.log(`✅ Updated approval request message for manager ${otherManager.tag}`);
      } catch (error) {
        console.error(`❌ Error updating message for manager ${msgInfo.managerId}:`, error.message);
        // Continue even if we can't update some messages
      }
    }

    // Clean up pending request (remove from file too)
    pendingRequestsStore.remove(requestKey, interaction.client.pendingRequests);

    console.log(`✅ Leave request ${action} by ${interaction.user.tag} for employee ${employee.tag}`);

  } catch (error) {
    console.error('Error processing approval decision:', error);

    await interaction.editReply({
      content: '❌ Có lỗi xảy ra khi xử lý quyết định. Vui lòng thử lại sau.',
    });
  }
}

async function handleContinueForm(interaction) {
  // This handler is no longer needed since we combined everything into one modal
  return await interaction.reply({
    content: '❌ Chức năng này đã được cập nhật. Vui lòng sử dụng lệnh `/form` để bắt đầu lại.',
    flags: MessageFlags.Ephemeral
  });
}

async function handleCancelForm(interaction) {
  const userId = interaction.customId.replace('cancel_form_', '');

  // Check if user is authorized
  if (interaction.user.id !== userId) {
    return await interaction.reply({
      content: '❌ Bạn không có quyền thực hiện hành động này.',
      flags: MessageFlags.Ephemeral
    });
  }

  // Clean up temporary data
  if (interaction.client.tempFormData) {
    interaction.client.tempFormData.delete(userId);
  }
  if (interaction.client.draftFormData) {
    interaction.client.draftFormData.delete(userId);
  }
  if (interaction.client.draftFormDataPart2) {
    interaction.client.draftFormDataPart2.delete(userId);
  }

  await interaction.reply({
    content: '❌ Form đã được hủy. Sử dụng lệnh `/form` để bắt đầu lại nếu cần.',
    flags: MessageFlags.Ephemeral
  });
}

async function handleRetryForm(interaction) {
  const userId = interaction.customId.replace('retry_form_', '');

  if (interaction.user.id !== userId) {
    return await interaction.reply({
      content: '❌ Bạn không có quyền thực hiện hành động này.',
      flags: MessageFlags.Ephemeral
    });
  }

  const draftData = interaction.client.draftFormData?.get(userId);
  if (!draftData) {
    return await interaction.reply({
      content: '❌ Không tìm thấy dữ liệu trước đó. Vui lòng sử dụng lệnh `/form` để bắt đầu lại.',
      flags: MessageFlags.Ephemeral
    });
  }

  const modal = new ModalBuilder()
    .setCustomId('leave_request_form')
    .setTitle('📝 Form Xin Nghỉ Phép');

  const fullNameInput = new TextInputBuilder()
    .setCustomId('full_name')
    .setLabel('Họ và tên')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('vd: Nguyễn Văn A')
    .setRequired(true)
    .setMaxLength(100);

  if (draftData.fullName) {
    fullNameInput.setValue(draftData.fullName);
  }

  const leaveDateInput = new TextInputBuilder()
    .setCustomId('leave_date')
    .setLabel('Ngày nghỉ và thời gian')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('VD: 15/01/2026 hoặc 15/01/2026 - 17/01/2026')
    .setRequired(true)
    .setMaxLength(100);

  if (draftData.rawLeaveDateTime) {
    leaveDateInput.setValue(draftData.rawLeaveDateTime);
  } else if (draftData.leaveDate) {
    // Fallback for old format
    leaveDateInput.setValue(draftData.leaveDate);
  }

  const reasonInput = new TextInputBuilder()
    .setCustomId('reason')
    .setLabel('Lý do nghỉ')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Mô tả lý do xin nghỉ phép...')
    .setRequired(true)
    .setMaxLength(500);

  if (draftData.reason) {
    reasonInput.setValue(draftData.reason);
  }

  const firstActionRow = new ActionRowBuilder().addComponents(fullNameInput);
  const secondActionRow = new ActionRowBuilder().addComponents(leaveDateInput);
  const thirdActionRow = new ActionRowBuilder().addComponents(reasonInput);

  modal.addComponents(
    firstActionRow,
    secondActionRow,
    thirdActionRow
  );

  await interaction.showModal(modal);
}

async function handleRetryFormPart2(interaction) {
  // This handler is no longer needed since we combined everything into one modal
  return await interaction.reply({
    content: '❌ Chức năng này đã được cập nhật. Vui lòng sử dụng lệnh `/form` để bắt đầu lại.',
    flags: MessageFlags.Ephemeral
  });
}
