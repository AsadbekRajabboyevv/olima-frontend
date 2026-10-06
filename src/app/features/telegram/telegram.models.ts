export interface TelegramBotConfig {
  organizationId: string;
  botUsername: string;
  maskedToken: string;
  webhookUrl: string;
  enabled: boolean;
  notificationChatId?: number | null;
}
