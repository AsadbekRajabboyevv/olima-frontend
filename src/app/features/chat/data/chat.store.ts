import { Injectable, computed, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OrgContextService } from '../../../core/org/org-context.service';
import { ChatApiService } from './chat-api.service';
import { ChatStreamService } from './chat-stream.service';
import {
  ChatRequest,
  ChatResponse,
  ChatStreamEvent,
  Conversation,
  DisplayMessage,
  Message
} from '../chat.models';

const ACTIVE_CHAT_CONV_KEY = 'olima_active_chat_conv_id';
const ACTIVE_CHAT_MESSAGES_KEY = 'olima_active_chat_messages';
const DEBUG_MODE_KEY = 'olima_debug_mode';

@Injectable({
  providedIn: 'root'
})
export class ChatStore {
  private readonly orgContext = inject(OrgContextService);
  private readonly api = inject(ChatApiService);
  private readonly streamService = inject(ChatStreamService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _messages = signal<DisplayMessage[]>([]);
  private readonly _conversationId = signal<string | null>(null);
  private readonly _loading = signal<boolean>(false);
  private readonly _recentConversations = signal<Conversation[]>([]);
  private readonly _debugMode = signal<boolean>(localStorage.getItem(DEBUG_MODE_KEY) === 'true');
  private readonly _currentOrgName = signal<string>('');

  readonly messages = this._messages.asReadonly();
  readonly conversationId = this._conversationId.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly recentConversations = this._recentConversations.asReadonly();
  readonly debugMode = this._debugMode.asReadonly();
  readonly currentOrgName = this._currentOrgName.asReadonly();

  readonly hasMessages = computed(() => this._messages().length > 0);
  readonly debugTooltip = computed(() =>
    this._debugMode()
      ? 'Debug yoqilgan: Ishlatilgan vositalar parametrlari va natijalari ko\'rsatiladi'
      : 'Debug o\'chirilgan: Faqat yakuniy javob ko\'rsatiladi'
  );

  init(): void {
    const savedConvId = sessionStorage.getItem(ACTIVE_CHAT_CONV_KEY);
    const savedMessages = sessionStorage.getItem(ACTIVE_CHAT_MESSAGES_KEY);
    if (savedConvId && savedMessages) {
      try {
        this._conversationId.set(savedConvId);
        this._messages.set(JSON.parse(savedMessages));
      } catch (e) {
        console.error('Failed to parse saved chat session', e);
      }
    }

    this.loadCurrentOrg();
    this.loadRecent();
  }

  toggleDebug(): void {
    const nextVal = !this._debugMode();
    this._debugMode.set(nextVal);
    localStorage.setItem(DEBUG_MODE_KEY, String(nextVal));
  }

  newChat(): void {
    this._conversationId.set(null);
    this._messages.set([]);
    sessionStorage.removeItem(ACTIVE_CHAT_CONV_KEY);
    sessionStorage.removeItem(ACTIVE_CHAT_MESSAGES_KEY);
    this.loadRecent();
  }

  loadCurrentOrg(): void {
    const snapshotName = this.orgContext.snapshotName();
    if (snapshotName) {
      this._currentOrgName.set(snapshotName);
    }
    const orgId = this.orgContext.snapshotId();
    if (orgId) {
      this.api.getOrganization(orgId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (org) => {
            this._currentOrgName.set(org.name);
            this.orgContext.setOrgName(org.name);
          }
        });
    }
  }

  loadRecent(): void {
    const orgId = this.orgContext.snapshotId();
    if (!orgId) return;
    this.api.getConversations(orgId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (convs) => {
          this._recentConversations.set(convs || []);
        }
      });
  }

  openConversation(conv: Conversation): void {
    if (!conv || !conv.id) return;
    this._loading.set(true);
    this.api.getConversation(conv.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (fullConv) => {
          this._conversationId.set(fullConv.id);
          const mapped: DisplayMessage[] = (fullConv.messages || [])
            .filter((m: Message) => m.role === 'USER' || m.role === 'ASSISTANT')
            .map((m: Message) => ({
              role: m.role as 'USER' | 'ASSISTANT',
              content: m.content
            }));
          this._messages.set(mapped);
          this._loading.set(false);
          this.saveChatState();
        },
        error: (err) => {
          console.error('Failed to load conversation', err);
          this._loading.set(false);
        }
      });
  }

  send(messageText: string): void {
    const trimmed = messageText.trim();
    if (!trimmed || this._loading()) return;

    const orgId = this.orgContext.snapshotId();
    if (!orgId) {
      alert('Iltimos, avval yuqori paneldan tashkilotni tanlang.');
      return;
    }

    this._messages.update(msgs => [...msgs, { role: 'USER', content: trimmed }]);
    this._loading.set(true);
    this.saveChatState();
    this.streamReply(orgId, trimmed, true);
  }

  private streamReply(orgId: string, messageText: string, retryOnMissing: boolean): void {
    const request: ChatRequest = {
      organizationId: orgId,
      message: messageText,
      conversationId: this._conversationId() || undefined
    };

    let toolInfoMsg: DisplayMessage | null = null;
    let assistantMsgIndex = -1;

    this.streamService.stream(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (event: ChatStreamEvent) => {
        if (event.type === 'INIT') {
          if (event.conversationId) {
            this._conversationId.set(event.conversationId);
            this.saveChatState();
          }
        } else if (event.type === 'TOOL_CALL' && event.toolCall) {
          if (!toolInfoMsg) {
            toolInfoMsg = {
              role: 'TOOL_INFO',
              toolCalls: [event.toolCall]
            };
            this._messages.update(msgs => [...msgs, toolInfoMsg!]);
          } else {
            this._messages.update(msgs => {
              const copy = [...msgs];
              const idx = copy.indexOf(toolInfoMsg!);
              if (idx !== -1) {
                copy[idx] = {
                  ...copy[idx],
                  toolCalls: [...(copy[idx].toolCalls || []), event.toolCall!]
                };
                toolInfoMsg = copy[idx];
              }
              return copy;
            });
          }
        } else if (event.type === 'CONTENT' && event.content) {
          this._loading.set(false);
          if (assistantMsgIndex === -1) {
            const newAssistantMsg: DisplayMessage = {
              role: 'ASSISTANT',
              content: event.content,
              isStreaming: true
            };
            this._messages.update(msgs => {
              assistantMsgIndex = msgs.length;
              return [...msgs, newAssistantMsg];
            });
          } else {
            this._messages.update(msgs => {
              const copy = [...msgs];
              if (copy[assistantMsgIndex]) {
                copy[assistantMsgIndex] = {
                  ...copy[assistantMsgIndex],
                  content: (copy[assistantMsgIndex].content || '') + event.content
                };
              }
              return copy;
            });
          }
        } else if (event.type === 'COMPLETE') {
          this._loading.set(false);
          if (event.conversationId) {
            this._conversationId.set(event.conversationId);
          }
          if (assistantMsgIndex !== -1) {
            this._messages.update(msgs => {
              const copy = [...msgs];
              if (copy[assistantMsgIndex]) {
                copy[assistantMsgIndex] = {
                  ...copy[assistantMsgIndex],
                  isStreaming: false,
                  sources: event.sources,
                  confirmationRequired: event.confirmationRequired,
                  pendingComplaintId: event.pendingComplaintId
                };
              }
              return copy;
            });
          }
          this.saveChatState();
          this.loadRecent();
        } else if (event.type === 'ERROR') {
          this._loading.set(false);
          if (assistantMsgIndex !== -1) {
            this._messages.update(msgs => {
              const copy = [...msgs];
              if (copy[assistantMsgIndex]) {
                copy[assistantMsgIndex] = {
                  ...copy[assistantMsgIndex],
                  isStreaming: false
                };
              }
              return copy;
            });
          } else {
            this._messages.update(msgs => [
              ...msgs,
              {
                role: 'ASSISTANT',
                content: 'Kechirasiz, xatolik yuz berdi: ' + (event.content || 'Noma\'lum xatolik')
              }
            ]);
          }
          this.saveChatState();
        }
      },
      error: (err) => {
        if (err?.status === 404 && request.conversationId && retryOnMissing) {
          this._conversationId.set(null);
          this.streamReply(orgId, messageText, false);
          return;
        }
        console.error('Chat stream error', err);
        this._loading.set(false);
        if (assistantMsgIndex !== -1) {
          this._messages.update(msgs => {
            const copy = [...msgs];
            if (copy[assistantMsgIndex]) {
              copy[assistantMsgIndex] = {
                ...copy[assistantMsgIndex],
                isStreaming: false
              };
            }
            return copy;
          });
        } else {
          this._messages.update(msgs => [
            ...msgs,
            {
              role: 'ASSISTANT',
              content: 'Kechirasiz, aloqada xatolik yuz berdi: ' + (err.message || 'Server bilan bog\'lanishda muammo')
            }
          ]);
        }
        this.saveChatState();
      },
      complete: () => {
        this._loading.set(false);
        if (assistantMsgIndex !== -1) {
          this._messages.update(msgs => {
            const copy = [...msgs];
            if (copy[assistantMsgIndex]) {
              copy[assistantMsgIndex] = {
                ...copy[assistantMsgIndex],
                isStreaming: false
              };
            }
            return copy;
          });
        }
        this.saveChatState();
      }
    });
  }

  confirmAction(complaintId?: string): void {
    const convId = this._conversationId();
    if (!complaintId || !convId) return;

    this._loading.set(true);
    this.api.confirmAction(convId, complaintId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: ChatResponse) => {
        const toAdd: DisplayMessage[] = [{ role: 'USER', content: 'Amal tasdiqlandi.' }];
        if (response.toolCalls && response.toolCalls.length > 0) {
          toAdd.push({ role: 'TOOL_INFO', toolCalls: response.toolCalls });
        }
        toAdd.push({
          role: 'ASSISTANT',
          content: response.message,
          sources: response.sources
        });
        this._messages.update(msgs => [...msgs, ...toAdd]);
        this._loading.set(false);
        this.saveChatState();
      },
      error: (err) => {
        const reason = err?.error?.message ? ` (${err.error.message})` : '';
        this._messages.update(msgs => [
          ...msgs,
          {
            role: 'ASSISTANT',
            content: 'Amalni tasdiqlashda xatolik yuz berdi' + reason + '.'
          }
        ]);
        this._loading.set(false);
        this.saveChatState();
      }
    });
  }

  cancelConfirmation(): void {
    this._messages.update(msgs => [
      ...msgs,
      { role: 'USER', content: 'Amal bekor qilindi.' },
      { role: 'ASSISTANT', content: 'Amal bekor qilindi.' }
    ]);
    this.saveChatState();
  }

  clearSession(): void {
    sessionStorage.removeItem(ACTIVE_CHAT_CONV_KEY);
    sessionStorage.removeItem(ACTIVE_CHAT_MESSAGES_KEY);
  }

  saveChatState(): void {
    const convId = this._conversationId();
    if (convId) {
      sessionStorage.setItem(ACTIVE_CHAT_CONV_KEY, convId);
      sessionStorage.setItem(ACTIVE_CHAT_MESSAGES_KEY, JSON.stringify(this._messages()));
    }
  }
}
