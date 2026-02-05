const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags
} = require('discord.js');
const config = require('../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('form')
    .setDescription('Mở form xin nghỉ phép'),

  async execute(interaction) {
    try {
      // Check if command is used in DM
      if (interaction.guild) {
        return await interaction.reply({
          content: '❌ Lệnh này chỉ có thể sử dụng trong tin nhắn riêng (DM) với bot.',
          flags: MessageFlags.Ephemeral
        });
      }

      // Create modal for leave request form
      const modal = new ModalBuilder()
        .setCustomId('leave_request_form')
        .setTitle('📝 Form Xin Nghỉ Phép');

      // Full name input
      const fullNameInput = new TextInputBuilder()
        .setCustomId('full_name')
        .setLabel('Họ và tên')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('vd: Nguyễn Văn A')
        .setRequired(true)
        .setMaxLength(100);

      // Leave date and time combined input
      const leaveDateInput = new TextInputBuilder()
        .setCustomId('leave_date')
        .setLabel('Ngày nghỉ và thời gian')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('VD: 15/01/2026 hoặc 15/01/2026 - 17/01/2026')
        .setRequired(true)
        .setMaxLength(100);

      // Reason input
      const reasonInput = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Lý do nghỉ')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Mô tả lý do xin nghỉ phép...')
        .setRequired(true)
        .setMaxLength(500);

      // Create action rows for modal inputs
      const firstActionRow = new ActionRowBuilder().addComponents(fullNameInput);
      const secondActionRow = new ActionRowBuilder().addComponents(leaveDateInput);
      const thirdActionRow = new ActionRowBuilder().addComponents(reasonInput);

      // Add action rows to modal
      modal.addComponents(
        firstActionRow,
        secondActionRow,
        thirdActionRow
      );

      // Show modal to user
      await interaction.showModal(modal);

    } catch (error) {
      console.error('Error in form command:', error);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Có lỗi xảy ra khi mở form. Vui lòng thử lại sau.',
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
};
