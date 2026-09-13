import { ChatMessage, AuthSession } from '../types';
import { supabase } from './supabase';
import { soundManager } from '../utils/soundNotifications';
import { getStoredChatMessages, saveChatMessages } from '../utils/storage';

const CHAT_STORAGE_KEY = 'waateh_chat_messages_v1';
const CHAT_CHANNEL_NAME = 'waateh_live_chat_channel';
const CLOUD_SETTING_KEY = 'chat_history_v1';

type MessageListener = (messages: ChatMessage[], newIncoming?: ChatMessage | null) => void;

class ChatService {
  private listeners: Set<MessageListener> = new Set();
  private knownMessageIds: Set<string> = new Set();
  private isInitialized = false;
  private currentSession: AuthSession | null = null;
  private channel: ReturnType<typeof supabase.channel> | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private pollInterval: number | null = null;
  private titleOriginal: string = typeof document !== 'undefined' ? document.title : 'پلتفرم مس واته';
  private titleFlashTimer: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        if ('BroadcastChannel' in window) {
          this.broadcastChannel = new BroadcastChannel('waateh_chat_bc');
          this.broadcastChannel.onmessage = (event) => {
            if (event.data && event.data.type === 'NEW_MESSAGE') {
              this.handleIncomingMessage(event.data.message);
            } else if (event.data && event.data.type === 'SYNC_ALL') {
              this.syncMessages(event.data.messages, false);
            }
          };
        }
      } catch (e) {
        console.warn('BroadcastChannel not supported or error:', e);
      }

      window.addEventListener('storage', (e) => {
        if (e.key === CHAT_STORAGE_KEY && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            if (Array.isArray(parsed)) {
              this.syncMessages(parsed, false);
            }
          } catch (err) {
            console.warn('Error parsing storage event for chat:', err);
          }
        }
      });

      // Clear title flashing on focus
      window.addEventListener('focus', () => {
        this.stopTitleFlash();
      });
    }
  }

  public init(session: AuthSession | null): void {
    this.currentSession = session;

    // Load initial from local storage
    const initial = getStoredChatMessages();
    initial.forEach((m) => this.knownMessageIds.add(m.id));

    if (!this.isInitialized) {
      this.isInitialized = true;
      this.setupSupabaseRealtime();
      this.fetchCloudHistory();

      // Poll cloud history every 4 seconds as a reliable background sync fallback
      if (typeof window !== 'undefined') {
        this.pollInterval = window.setInterval(() => {
          this.fetchCloudHistory();
        }, 4000);
      }
    }
  }

  public updateSession(session: AuthSession | null): void {
    this.currentSession = session;
  }

  public subscribe(listener: MessageListener): () => void {
    this.listeners.add(listener);
    // Emit current messages immediately
    listener(getStoredChatMessages(), null);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setupSupabaseRealtime(): void {
    try {
      this.channel = supabase.channel(CHAT_CHANNEL_NAME);

      this.channel
        .on('broadcast', { event: 'new_message' }, ({ payload }) => {
          if (payload && payload.id) {
            this.handleIncomingMessage(payload as ChatMessage);
          }
        })
        .on('broadcast', { event: 'messages_read' }, ({ payload }) => {
          if (payload && payload.messages) {
            this.syncMessages(payload.messages, false);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Supabase Live Chat Realtime connected.');
          }
        });
    } catch (err) {
      console.warn('Failed to initialize Supabase chat channel:', err);
    }
  }

  public async fetchCloudHistory(): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('key', CLOUD_SETTING_KEY)
        .maybeSingle();

      if (error) {
        return getStoredChatMessages();
      }

      if (data && data.value) {
        let cloudMsgs: ChatMessage[] = [];
        if (typeof data.value === 'string') {
          try {
            cloudMsgs = JSON.parse(data.value);
          } catch {
            cloudMsgs = [];
          }
        } else if (Array.isArray(data.value)) {
          cloudMsgs = data.value;
        }

        if (Array.isArray(cloudMsgs) && cloudMsgs.length > 0) {
          this.syncMessages(cloudMsgs, true);
          return getStoredChatMessages();
        }
      }
    } catch (err) {
      console.warn('Notice in fetchCloudHistory:', err);
    }
    return getStoredChatMessages();
  }

  private handleIncomingMessage(msg: ChatMessage): void {
    if (!msg || !msg.id) return;

    const isAlreadyKnown = this.knownMessageIds.has(msg.id);
    this.knownMessageIds.add(msg.id);

    const currentList = getStoredChatMessages();
    const existingIndex = currentList.findIndex((m) => m.id === msg.id);

    let updatedList: ChatMessage[];
    if (existingIndex >= 0) {
      updatedList = [...currentList];
      updatedList[existingIndex] = { ...updatedList[existingIndex], ...msg };
    } else {
      updatedList = [...currentList, msg];
    }

    saveChatMessages(updatedList);

    // If new message from counterpart, play audio beep and notify!
    const isFromMe = this.currentSession
      ? this.currentSession.role === msg.senderRole
      : false;

    if (!isAlreadyKnown && !isFromMe) {
      // Beep sound alert
      soundManager.playChatMessageAlert();
      this.flashTitle(`🔔 پیام جدید از ${msg.senderName}`);
    }

    this.notifyListeners(updatedList, !isFromMe && !isAlreadyKnown ? msg : null);
  }

  private syncMessages(incomingList: ChatMessage[], checkAlerts: boolean): void {
    if (!Array.isArray(incomingList)) return;

    const currentList = getStoredChatMessages();
    const currentMap = new Map<string, ChatMessage>();
    currentList.forEach((m) => currentMap.set(m.id, m));

    let hasNewUnreadForMe = false;
    let newestIncoming: ChatMessage | null = null;

    incomingList.forEach((incoming) => {
      const existing = currentMap.get(incoming.id);
      if (!existing) {
        currentMap.set(incoming.id, incoming);
        if (!this.knownMessageIds.has(incoming.id)) {
          this.knownMessageIds.add(incoming.id);
          const isFromMe = this.currentSession
            ? this.currentSession.role === incoming.senderRole
            : false;
          if (!isFromMe) {
            hasNewUnreadForMe = true;
            newestIncoming = incoming;
          }
        }
      } else {
        // Merge read flags
        currentMap.set(incoming.id, {
          ...existing,
          ...incoming,
          isReadByAdmin: existing.isReadByAdmin || incoming.isReadByAdmin,
          isReadByClient: existing.isReadByClient || incoming.isReadByClient,
        });
      }
    });

    const merged = Array.from(currentMap.values()).sort((a, b) => {
      return a.id.localeCompare(b.id);
    });

    saveChatMessages(merged);

    if (checkAlerts && hasNewUnreadForMe && newestIncoming) {
      soundManager.playChatMessageAlert();
      this.flashTitle(`🔔 پیام جدید از ${newestIncoming.senderName}`);
    }

    this.notifyListeners(merged, hasNewUnreadForMe ? newestIncoming : null);
  }

  public async sendMessage(msg: ChatMessage): Promise<ChatMessage[]> {
    this.knownMessageIds.add(msg.id);
    const currentList = getStoredChatMessages();
    const updated = [...currentList, msg];

    // 1. Save locally
    saveChatMessages(updated);
    this.notifyListeners(updated, null);

    // 2. Play tactile outgoing sound
    soundManager.playMessageSentSound();

    // 3. Broadcast to local tabs
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: 'NEW_MESSAGE', message: msg });
      } catch (e) {
        console.warn('BroadcastChannel postMessage error:', e);
      }
    }

    // 4. Broadcast via Supabase Realtime to all clients & admins worldwide
    if (this.channel) {
      try {
        await this.channel.send({
          type: 'broadcast',
          event: 'new_message',
          payload: msg,
        });
      } catch (e) {
        console.warn('Supabase realtime broadcast error:', e);
      }
    }

    // 5. Persist full history to Supabase Cloud
    this.persistCloudHistory(updated);

    return updated;
  }

  public markAsRead(personId: string, role: 'client' | 'admin' | 'staff' | 'warehouse'): void {
    const currentList = getStoredChatMessages();
    let hasChanges = false;

    const updated = currentList.map((m) => {
      if (m.personId === personId) {
        if (role === 'client' && m.senderRole !== 'client' && !m.isReadByClient) {
          hasChanges = true;
          return { ...m, isReadByClient: true };
        }
        if (role !== 'client' && m.senderRole === 'client' && !m.isReadByAdmin) {
          hasChanges = true;
          return { ...m, isReadByAdmin: true };
        }
      }
      return m;
    });

    if (hasChanges) {
      saveChatMessages(updated);
      this.notifyListeners(updated, null);

      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ type: 'SYNC_ALL', messages: updated });
      }

      if (this.channel) {
        this.channel.send({
          type: 'broadcast',
          event: 'messages_read',
          payload: { messages: updated },
        }).catch(() => {});
      }

      this.persistCloudHistory(updated);
    }
  }

  private async persistCloudHistory(messages: ChatMessage[]): Promise<void> {
    try {
      // Keep last 300 messages to prevent oversized payloads
      const trimmed = messages.slice(-300);
      const jsonStr = JSON.stringify(trimmed);

      await supabase
        .from('app_settings')
        .upsert({ key: CLOUD_SETTING_KEY, value: jsonStr }, { onConflict: 'key' });
    } catch (err) {
      console.warn('Notice saving chat history to Supabase:', err);
    }
  }

  private notifyListeners(messages: ChatMessage[], incoming: ChatMessage | null): void {
    this.listeners.forEach((listener) => {
      try {
        listener(messages, incoming);
      } catch (e) {
        console.error('Error in chat message listener:', e);
      }
    });
  }

  private flashTitle(message: string): void {
    if (typeof document === 'undefined') return;
    if (document.hasFocus && document.hasFocus()) return;

    this.stopTitleFlash();
    let isOriginal = false;
    document.title = message;

    this.titleFlashTimer = window.setInterval(() => {
      document.title = isOriginal ? message : this.titleOriginal;
      isOriginal = !isOriginal;
    }, 1000);
  }

  private stopTitleFlash(): void {
    if (this.titleFlashTimer !== null) {
      clearInterval(this.titleFlashTimer);
      this.titleFlashTimer = null;
    }
    if (typeof document !== 'undefined') {
      document.title = this.titleOriginal;
    }
  }

  public cleanup(): void {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.channel) {
      supabase.removeChannel(this.channel).catch(() => {});
      this.channel = null;
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    this.stopTitleFlash();
  }
}

export const chatService = new ChatService();
