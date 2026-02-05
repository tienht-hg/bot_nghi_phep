const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkleaves')
    .setDescription('Kiểm tra và gửi thông báo người nghỉ phép hôm nay (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      // Defer reply since this might take a moment
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Get the daily notification service
      const dailyService = interaction.client.dailyNotificationService;

      if (!dailyService) {
        return await interaction.editReply({
          content: '❌ Dịch vụ thông báo chưa được khởi tạo.',
        });
      }

      // Trigger manual check
      await dailyService.triggerManualCheck();

      await interaction.editReply({
        content: '✅ Đã kiểm tra và gửi thông báo (nếu có người nghỉ phép hôm nay).',
      });

    } catch (error) {
      console.error('Error in checkleaves command:', error);

      if (interaction.deferred) {
        await interaction.editReply({
          content: '❌ Có lỗi xảy ra khi kiểm tra danh sách nghỉ phép.',
        });
      } else {
        await interaction.reply({
          content: '❌ Có lỗi xảy ra khi kiểm tra danh sách nghỉ phép.',
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
};
