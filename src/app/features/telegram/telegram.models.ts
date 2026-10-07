/** WEBHOOK — Telegram serverga POST qiladi; LONG_POLLING — server o'zi getUpdates bilan so'raydi. */
export type TelegramUpdateMode = 'WEBHOOK' | 'LONG_POLLING';

export interface TelegramBotConfig {
  organizationId: string;
  botUsername: string;
  maskedToken: string;
  /** Faqat WEBHOOK rejimida */
  webhookUrl: string | null;
  enabled: boolean;
  notificationChatId?: number | null;
  updateMode: TelegramUpdateMode;
}
