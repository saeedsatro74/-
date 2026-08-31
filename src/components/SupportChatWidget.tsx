import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Paperclip, 
  User, 
  ShieldCheck, 
  CheckCheck, 
  Headphones, 
  Image as ImageIcon,
  Circle
} from 'lucide-react';
import { Person, AuthSession, ChatMessage } from '../types';
import { getStoredChatMessages, saveChatMessages, addChatMessage } from '../utils/storage';
import { getPersianFullDate } from '../utils/persianDate';

interface SupportChatWidgetProps {
  session?: AuthSession | null;
  authSession?: AuthSession | null;
  people: Person[];
}

export const SupportChatWidget: React.FC<SupportChatWidgetProps> = ({
  session,
  authSession,
  people,
}) => {
  const currentSession = session || authSession;
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentSession) return null;

  const isClient = currentSession.role === 'client';
  const currentPersonId = currentSession.personId || (isClient ? currentSession.personId : null);

  // Load chat messages on mount & listen to storage changes
  useEffect(() => {
    const loadMessages = () => {
      const stored = getStoredChatMessages();
      setMessages(stored);
    };

    loadMessages();
    const interval = setInterval(loadMessages, 1500); // 1.5s refresh for real-time chat feel

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'waateh_chat_messages_v1') {
        loadMessages();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Set initial selected person for Admin/Staff
  useEffect(() => {
    if (!isClient && people.length > 0 && !selectedPersonId) {
      setSelectedPersonId(people[0].id);
    }
  }, [isClient, people, selectedPersonId]);

  // Active chat client ID
  const activeChatPersonId = isClient ? currentPersonId : selectedPersonId;

  // Filter messages for active chat thread
  const activeThread = messages.filter((m) => m.personId === activeChatPersonId);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, activeChatPersonId]);

  // Calculate unread badge count
  const unreadCount = isClient
    ? messages.filter((m) => m.personId === currentPersonId && m.senderRole !== 'client' && !m.isReadByClient).length
    : messages.filter((m) => m.senderRole === 'client' && !m.isReadByAdmin).length;

  // Mark active messages as read when opening chat
  useEffect(() => {
    if (isOpen && activeChatPersonId) {
      const allMsgs = getStoredChatMessages();
      let hasChanges = false;
      const updated = allMsgs.map((m) => {
        if (m.personId === activeChatPersonId) {
          if (isClient && m.senderRole !== 'client' && !m.isReadByClient) {
            hasChanges = true;
            return { ...m, isReadByClient: true };
          }
          if (!isClient && m.senderRole === 'client' && !m.isReadByAdmin) {
            hasChanges = true;
            return { ...m, isReadByAdmin: true };
          }
        }
        return m;
      });

      if (hasChanges) {
        saveChatMessages(updated);
        setMessages(updated);
      }
    }
  }, [isOpen, activeChatPersonId, isClient]);

  // Handle Image Upload File
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('حجم تصویر نباید بیشتر از ۵ مگابایت باشد.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Send Message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !attachedImage) return;
    if (!activeChatPersonId) return;

    const senderName = isClient
      ? currentSession.username || 'مشتری'
      : currentSession.role === 'admin'
      ? 'مدیرعامل'
      : 'حسابدار مس';

    const newMsg: ChatMessage = {
      id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      personId: activeChatPersonId,
      senderRole: currentSession.role,
      senderName,
      text: inputText.trim(),
      createdAt: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      imageUrl: attachedImage || undefined,
      isReadByAdmin: !isClient,
      isReadByClient: isClient,
    };

    const updated = addChatMessage(newMsg);
    setMessages(updated);
    setInputText('');
    setAttachedImage(null);
  };

  const activePersonName = people.find((p) => p.id === activeChatPersonId)?.name || 'مشتری';

  return (
    <div className="fixed bottom-5 left-5 z-50 dir-rtl font-sans">
      {/* Expanded Floating Chat Box */}
      {isOpen && (
        <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-[92vw] sm:w-[420px] h-[520px] mb-4 flex flex-col overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 text-white px-4 py-3.5 flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
                <Headphones className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold flex items-center gap-1.5">
                  <span>{isClient ? 'پشتیبانی و ارتباط با مدیرعامل' : 'چت پشتیبانی مشتریان'}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </h3>
                <p className="text-[11px] text-stone-300">
                  {isClient ? 'پاسخگویی مستقیم توسط مدیریت و حسابداری' : `گفتگو با ${activePersonName}`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/10 rounded-xl text-stone-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Admin / Staff Client Selector Tab (If Manager) */}
          {!isClient && people.length > 0 && (
            <div className="bg-stone-100 border-b border-stone-200 p-2 flex gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
              {people.map((p) => {
                const clientUnread = messages.filter(
                  (m) => m.personId === p.id && m.senderRole === 'client' && !m.isReadByAdmin
                ).length;
                const isSelected = p.id === selectedPersonId;

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPersonId(p.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
                    }`}
                  >
                    <span>{p.name}</span>
                    {clientUnread > 0 && (
                      <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                        {clientUnread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Chat Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-stone-50/70">
            {activeThread.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 space-y-2">
                <MessageSquare className="w-10 h-10 text-stone-300 stroke-1" />
                <p className="text-xs font-bold text-stone-600">هنوز پیامی ثبت نشده است.</p>
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  {isClient
                    ? 'سوال یا درخواستی درباره واریزی، خرید مس یا فاکتورها دارید؟ پیام بگذارید تا مدیر پاسخ دهد.'
                    : `پیامی برای ${activePersonName} ارسال کنید.`}
                </p>
              </div>
            ) : (
              activeThread.map((msg) => {
                const isMyMessage = msg.senderRole === currentSession.role;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMyMessage ? 'items-start' : 'items-end'}`}
                  >
                    {/* Sender Name & Role */}
                    <span className="text-[10px] font-bold text-stone-400 mb-1 px-1 flex items-center gap-1">
                      {msg.senderRole === 'admin' ? (
                        <span className="text-amber-600 font-extrabold flex items-center gap-0.5">
                          <ShieldCheck className="w-3 h-3" /> مدیرعامل
                        </span>
                      ) : msg.senderRole === 'staff' ? (
                        <span className="text-blue-600 font-bold">حسابدار مس</span>
                      ) : (
                        <span className="text-stone-700">{msg.senderName}</span>
                      )}
                      <span>• {msg.createdAt}</span>
                    </span>

                    {/* Message Bubble */}
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-2xs ${
                        isMyMessage
                          ? 'bg-amber-600 text-white rounded-tr-xs'
                          : 'bg-white border border-stone-200 text-stone-900 rounded-tl-xs'
                      }`}
                    >
                      {msg.imageUrl && (
                        <div className="mb-2 rounded-xl overflow-hidden border border-black/10">
                          <img
                            src={msg.imageUrl}
                            alt="تصویر ضمیمه"
                            className="w-full max-h-48 object-cover cursor-pointer"
                            onClick={() => window.open(msg.imageUrl, '_blank')}
                          />
                        </div>
                      )}
                      {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Attached Image Preview */}
          {attachedImage && (
            <div className="bg-stone-100 border-t border-stone-200 p-2 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <img src={attachedImage} alt="Preview" className="w-9 h-9 rounded-lg object-cover border border-stone-300" />
                <span className="text-[11px] text-stone-600 font-bold">تصویر آماده ارسال</span>
              </div>
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Chat Input Form */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-stone-200 shrink-0 flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageSelect}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="ارسال تصویر"
              className="p-2 text-stone-500 hover:text-amber-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="پیام خود را بنویسید..."
              className="flex-1 px-3 py-2 bg-stone-100 focus:bg-white rounded-xl text-xs border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-900 font-semibold"
            />

            <button
              type="submit"
              disabled={!inputText.trim() && !attachedImage}
              className="p-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-xl transition-colors shadow-xs cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Trigger Button with Hover / Click Effect */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group relative bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white p-3.5 sm:px-4 sm:py-3.5 rounded-full sm:rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center gap-2.5 border border-amber-400/30 cursor-pointer"
      >
        <div className="relative">
          <MessageSquare className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="hidden sm:flex flex-col items-start text-right">
          <span className="text-xs font-extrabold leading-tight">پشتیبانی و چت آنلاین</span>
          <span className="text-[10px] text-amber-200 font-medium">ارتباط مستقیم با مدیر</span>
        </div>
      </button>
    </div>
  );
};
