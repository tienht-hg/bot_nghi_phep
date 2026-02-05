const {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
  MessageFlags
} = require('discord.js');
const config = require('../config/config');
const Validators = require('../utils/validators');
const EmbedUtils = require('../utils/embeds');
const pendingRequestsStore = require('../utils/pendingRequestsStore');

module.exports = {
  name: 'interactionCreate',

  async execute(interaction) {
    if (!interaction.isModalSubmit()) return;

    try {
      if (interaction.customId === 'leave_request_form') {
        await handleLeaveRequestForm(interaction);
      } else if (interaction.customId === 'leave_request_form_part2') {
        await handleLeaveRequestFormPart2(interaction);
      }
    } catch (error) {
      console.error('Error handling modal submit:', error);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Có lỗi xảy ra khi xử lý form. Vui lòng thử lại sau.',
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
};

async function handleLeaveRequestForm(interaction) {
  // Get ALL form data first (before any validation)
  const fullName = Validators.sanitizeInput(interaction.fields.getTextInputValue('full_name'));
  const rawLeaveDateTime = Validators.sanitizeInput(interaction.fields.getTextInputValue('leave_date'));
  const reason = Validators.sanitizeInput(interaction.fields.getTextInputValue('reason'));

  // Parse combined date and time (supports date ranges)
  const parsedDateTime = Validators.parseLeaveDateTimeRange(rawLeaveDateTime);

  if (!parsedDateTime.isValid) {
    // Store draft data even when date parsing fails
    storeDraftFormData(interaction, {
      fullName,
      rawLeaveDateTime,
      reason
    });

    const retryButton = new ButtonBuilder()
      .setCustomId(`retry_form_${interaction.user.id}`)
      .setLabel('🔄 Điền lại')
      .setStyle(ButtonStyle.Primary);

    const actionRow = new ActionRowBuilder().addComponents(retryButton);

    return await interaction.reply({
      content: `❌ ${parsedDateTime.error}\n\n💡 **Ví dụ hợp lệ:**\n• Nghỉ một ngày: \`25/01/2026\`\n• Nghỉ buổi sáng: \`Buổi sáng, 25/01/2026\`\n• Nghỉ nhiều ngày: \`20/01/2026 - 22/01/2026\`\n• Nghỉ từ sáng đến chiều: \`Buổi sáng, 20/01/2026 - Buổi chiều, 22/01/2026\``,
      components: [actionRow],
      flags: MessageFlags.Ephemeral
    });
  }

  // Build form data with date range support
  const formData = {
    fullName,
    // For backward compatibility, use first date as leaveDate
    leaveDate: parsedDateTime.dates[0].date,
    leaveTime: parsedDateTime.dates[0].time,
    reason,
    rawLeaveDateTime,
    // New fields for date range support
    isRange: parsedDateTime.isRange,
    leaveDateDisplay: parsedDateTime.displayText,
    dates: parsedDateTime.dates,  // Array of { date, time } for each day
    totalDays: parsedDateTime.totalDays
  };

  // Validate basic form data
  const basicValidation = validateBasicFormData(formData);
  if (!basicValidation.isValid) {
    storeDraftFormData(interaction, formData);

    const retryButton = new ButtonBuilder()
      .setCustomId(`retry_form_${interaction.user.id}`)
      .setLabel('🔄 Điền lại')
      .setStyle(ButtonStyle.Primary);

    const actionRow = new ActionRowBuilder().addComponents(retryButton);

    return await interaction.reply({
      content: `❌ Dữ liệu không hợp lệ:\n${basicValidation.errors.map(error => `• ${error}`).join('\n')}`,
      components: [actionRow],
      flags: MessageFlags.Ephemeral
    });
  }

  if (interaction.client.draftFormData) {
    interaction.client.draftFormData.delete(interaction.user.id);
  }

  // Get manager automatically from managers.json (first manager for now)
  const managerMapping = require('../utils/managerMapping');
  const allManagers = managerMapping.getAllManagerNames();

  if (allManagers.length === 0) {
    return await interaction.reply({
      content: '❌ Không tìm thấy quản lý trong hệ thống. Vui lòng liên hệ HR.',
      flags: MessageFlags.Ephemeral
    });
  }

  // Use first manager (you can add more complex logic later)
  const directManager = allManagers[0];
  const managerIds = managerMapping.getManagerIdsByName(directManager);

  if (!managerIds || managerIds.length === 0) {
    return await interaction.reply({
      content: '❌ Không thể xác định quản lý. Vui lòng liên hệ HR.',
      flags: MessageFlags.Ephemeral
    });
  }

  // Add manager info to formData
  const completeFormData = {
    ...formData,
    directManager: directManager
  };

  // Validate complete form data
  const validation = Validators.validateLeaveRequestData(completeFormData);
  if (!validation.isValid) {
    storeDraftFormData(interaction, completeFormData);

    const retryButton = new ButtonBuilder()
      .setCustomId(`retry_form_${interaction.user.id}`)
      .setLabel('🔄 Điền lại')
      .setStyle(ButtonStyle.Primary);

    const actionRow = new ActionRowBuilder().addComponents(retryButton);

    return await interaction.reply({
      content: `❌ Dữ liệu form không hợp lệ:\n${validation.errors.map(error => `• ${error}`).join('\n')}`,
      components: [actionRow],
      flags: MessageFlags.Ephemeral
    });
  }

  // Send confirmation to employee
  const confirmationEmbed = EmbedUtils.createFormSubmissionEmbed(completeFormData);
  await interaction.reply({ embeds: [confirmationEmbed], flags: MessageFlags.Ephemeral });

  try {
    // Create approval embed and buttons
    const approvalEmbed = EmbedUtils.createManagerApprovalEmbed(completeFormData, interaction.user);

    const requestKey = `${interaction.user.id}_${Date.now()}`;

    const approveButton = new ButtonBuilder()
      .setCustomId(`approve_${requestKey}`)
      .setLabel('✅ Duyệt')
      .setStyle(ButtonStyle.Success);

    const rejectButton = new ButtonBuilder()
      .setCustomId(`reject_${requestKey}`)
      .setLabel('❌ Từ chối')
      .setStyle(ButtonStyle.Danger);

    const actionRow = new ActionRowBuilder().addComponents(approveButton, rejectButton);

    // Store request data for later use in button interactions
    if (!interaction.client.pendingRequests) {
      interaction.client.pendingRequests = new Map();
    }

    // Send DM to all managers and store message info
    const managerMessages = [];
    let sentCount = 0;
    let errorMessages = [];

    for (const managerId of managerIds) {
      try {
        const manager = await interaction.client.users.fetch(managerId);

        // Send DM to manager
        const sentMessage = await manager.send({
          embeds: [approvalEmbed],
          components: [actionRow]
        });

        managerMessages.push({
          managerId: managerId,
          messageId: sentMessage.id,
          channelId: sentMessage.channel.id
        });

        sentCount++;
        console.log(`✅ Leave request sent to manager ${manager.tag}`);
      } catch (error) {
        console.error(`❌ Error sending to manager ${managerId}:`, error);
        errorMessages.push(`Không thể gửi đến manager ID: ${managerId}`);
      }
    }

    if (sentCount === 0) {
      throw new Error('Không thể gửi yêu cầu đến bất kỳ quản lý nào.');
    }

    // Store request with all manager message info (persistent storage)
    const requestData = {
      requestData: completeFormData,
      employeeId: interaction.user.id,
      managerIds: managerIds,
      managerMessages: managerMessages,
      timestamp: Date.now()
    };
    pendingRequestsStore.add(requestKey, requestData, interaction.client.pendingRequests);

    console.log(`✅ Leave request sent to ${sentCount} manager(s) for employee ${interaction.user.tag}`);

    if (errorMessages.length > 0) {
      await interaction.followUp({
        content: `⚠️ Một số thông báo không được gửi:\n${errorMessages.join('\n')}`,
        flags: MessageFlags.Ephemeral
      });
    }

  } catch (error) {
    console.error('Error sending request to managers:', error);

    let errorMessage = '❌ Không thể gửi yêu cầu đến trưởng phòng. Vui lòng liên hệ HR.';

    // Handle specific Discord API errors
    if (error.code === 10013) {
      errorMessage = `❌ Không tìm thấy người dùng Discord với ID quản lý. Vui lòng liên hệ HR.`;
    } else if (error.code === 50013) {
      errorMessage = '❌ Bot không có quyền gửi tin nhắn đến trưởng phòng. Vui lòng liên hệ admin.';
    }

    await interaction.followUp({
      content: errorMessage,
      flags: MessageFlags.Ephemeral
    });
  }
}

// This function is no longer needed since we combined everything into one modal
async function handleLeaveRequestFormPart2(interaction) {
  // This handler is kept for backward compatibility but should not be called
  return await interaction.reply({
    content: '❌ Chức năng này đã được cập nhật. Vui lòng sử dụng lệnh `/form` để bắt đầu lại.',
    flags: MessageFlags.Ephemeral
  });
}

// Helper function to validate basic form data
function validateBasicFormData(formData) {
  const errors = [];

  // Full name validation
  if (!Validators.isValidFullName(formData.fullName)) {
    errors.push('Họ và tên phải có ít nhất 2 từ');
  }

  // Date validation
  if (!Validators.isValidDate(formData.leaveDate)) {
    errors.push('Ngày nghỉ không hợp lệ (định dạng: dd/mm/yyyy)');
  }

  // Reason validation
  if (!Validators.isValidReason(formData.reason)) {
    errors.push('Lý do nghỉ phải có ít nhất 5 ký tự và không quá 500 ký tự');
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

function storeDraftFormData(interaction, formData) {
  if (!interaction.client.draftFormData) {
    interaction.client.draftFormData = new Map();
  }

  interaction.client.draftFormData.set(interaction.user.id, {
    ...formData,
    timestamp: Date.now()
  });
}

function storeDraftFormDataPart2(interaction, formData) {
  if (!interaction.client.draftFormDataPart2) {
    interaction.client.draftFormDataPart2 = new Map();
  }

  interaction.client.draftFormDataPart2.set(interaction.user.id, {
    ...formData,
    timestamp: Date.now()
  });
}
