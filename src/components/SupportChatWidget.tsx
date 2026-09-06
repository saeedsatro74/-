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
  Volume2,
  VolumeX,
  Sparkles,
  Check
} from 'lucide-react';
import { Person, AuthSession, ChatMessage } from '../types';
import { chatService } from '../services/chatService';
import { soundManager } from '../utils/soundNotifications';

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
  const [isSending, setIsSending] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentSession) return null;

  const isClient = currentSession.role === 'client';
  const currentPersonId = currentSession.personId || (isClient ? currentSession.personId : null);

  // Initialize Chat Service and Realtime Subscription
  useEffect(() => {
    chatService.init(currentSession);

    const unsubscribe = chatService.subscribe((allMessages) => {
      setMessages(allMessages);
    });

    return () => {
      unsubscribe();
    };
  }, [currentSession]);

  // Keep chatService session in sync
  useEffect(() => {
    chatService.updateSession(currentSession);
  }, [currentSession]);

  // Set initial selected person for Admin/Staff
  useEffect(() => {
    if (!isClient && people.length > 0 && !selectedPersonId) {
      // Find person with unread messages first, or default to first person
      const unreadPerson = people.find((p) =>
        messages.some((m) => m.personId === p.id && m.senderRole === 'client' && !m.isReadByAdmin)
      );
      setSelectedPersonId(unreadPerson ? unreadPerson.id : people[0].id);
    }
  }, [isClient, people, selectedPersonId, messages]);

  // Active chat client ID
  const activeChatPersonId = isClient ? currentPersonId : selectedPersonId;

  // Filter messages for active chat thread
  const activeThread = messages.filter((m) => m.personId === activeChatPersonId);

  // Auto-scroll to bottom of chat on new message or open
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, activeChatPersonId]);

  // Calculate unread badge count
  const unreadCount = isClient
    ? messages.filter((m) => m.personId === currentPersonId && m.senderRole !== 'client' && !m.isReadByClient).length
    : messages.filter((m) => m.senderRole === 'client' && !m.isReadByAdmin).length;

  // Mark active messages as read when opening chat or changing active thread
  useEffect(() => {
    if (isOpen && activeChatPersonId) {
      chatService.markAsRead(activeChatPersonId, currentSession.role);
    }
  }, [isOpen, activeChatPersonId, currentSession.role, messages.length]);

  // Test sound function
  const handleTestSound = () => {
    soundManager.unlockAudioContext();
    soundManager.playChatMessageAlert();
  };

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
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !attachedImage) return;
    if (!activeChatPersonId) return;

    soundManager.unlockAudioContext();
    setIsSending(true);

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

    try {
      await chatService.sendMessage(newMsg);
      setInputText('');
      setAttachedImage(null);
    } catch (err) {
      console.error('Error sending chat message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const activePersonName = people.find((p) => p.id === activeChatPersonId)?.name || 'مشتری';

  return (
    <>
      {/* Lightbox / Full Image Preview Modal */}
      {previewImageModal && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImageModal(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh] bg-stone-900 rounded-2xl overflow-hidden p-2 shadow-2xl">
            <button
              onClick={() => setPreviewImageModal(null)}
              className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={previewImageModal} 
              alt="بزرگنمایی تصویر" 
              className="max-h-[85vh] w-auto mx-auto rounded-xl object-contain" 
            />
          </div>
        </div>
      )}

      {/* Floating Chat Container */}
      <div className="fixed bottom-5 left-5 z-50 dir-rtl font-sans">
        {/* Expanded Floating Chat Box */}
        {isOpen && (
          <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-[94vw] sm:w-[420px] h-[540px] mb-4 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 text-white px-4 py-3.5 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
                  <Headphones className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold flex items-center gap-1.5">
                    <span>{isClient ? 'پشتیبانی و ارتباط با مدیرعامل' : 'مرکز گفتگوی آنلاین مشتریان'}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  </h3>
                  <p className="text-[11px] text-stone-300">
                    {isClient ? 'پاسخگویی مستقیم توسط مدیریت و حسابداری' : `گفتگو با ${activePersonName}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Sound Test / Alert Chime Button */}
                <button
                  type="button"
                  onClick={handleTestSound}
                  title="تست صدای زنگ و بوق اعلان"
                  className="p-1.5 hover:bg-white/10 rounded-xl text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-xl text-stone-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
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
                      onClick={() => {
                        setSelectedPersonId(p.id);
                        chatService.markAsRead(p.id, currentSession.role);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-amber-600 text-white shadow-xs'
                          : clientUnread > 0
                          ? 'bg-rose-50 text-rose-800 border border-rose-300 animate-pulse font-extrabold'
                          : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
                      }`}
                    >
                      <span>{p.name}</span>
                      {clientUnread > 0 && (
                        <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-bounce">
                          {clientUnread}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Chat Messages Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-stone-50/80">
              {activeThread.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-stone-200/70 flex items-center justify-center text-stone-400 mb-1">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-stone-700">هنوز پیامی ثبت نشده است</p>
                  <p className="text-[11px] text-stone-500 leading-relaxed max-w-xs">
                    {isClient
                      ? 'سوال یا درخواستی درباره واریزی، نرخ مس یا فاکتورها دارید؟ پیام خود را بنویسید تا مدیریت بلافاصله مطلع شود.'
                      : `پیامی برای ${activePersonName} ارسال کنید.`}
                  </p>
                  <div className="pt-2 flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <Sparkles className="w-3 h-3" />
                    <span>ارتباط زنده و بوق اعلان صوتی فعال است</span>
                  </div>
                </div>
              ) : (
                activeThread.map((msg) => {
                  const isMyMessage = msg.senderRole === currentSession.role;
                  const isRead = isMyMessage
                    ? msg.senderRole === 'client'
                      ? msg.isReadByAdmin
                      : msg.isReadByClient
                    : true;

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
                        className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs ${
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
                              className="w-full max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setPreviewImageModal(msg.imageUrl || null)}
                            />
                          </div>
                        )}
                        {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}

                        {/* Read Receipt Status */}
                        {isMyMessage && (
                          <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-amber-100">
                            {isRead ? (
                              <span className="flex items-center gap-0.5 text-emerald-200 font-medium">
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-200" />
                                <span>خوانده شد</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5 text-amber-200/80">
                                <Check className="w-3 h-3" />
                                <span>ارسال شد</span>
                              </span>
                            )}
                          </div>
                        )}
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
                  <span className="text-[11px] text-stone-600 font-bold">تصویر پیوست شد</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedImage(null)}
                  className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs cursor-pointer"
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
                title="ارسال فاکتور یا تصویر"
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
                disabled={(!inputText.trim() && !attachedImage) || isSending}
                className="p-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-xl transition-colors shadow-xs cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Floating Trigger Button with Pulsing Unread Badge */}
        <button
          type="button"
          onClick={() => {
            soundManager.unlockAudioContext();
            setIsOpen(!isOpen);
          }}
          className={`group relative bg-gradient-to-r ${
            unreadCount > 0
              ? 'from-rose-600 to-rose-700 ring-4 ring-rose-400/40 animate-pulse'
              : 'from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800'
          } text-white p-3.5 sm:px-4 sm:py-3.5 rounded-full sm:rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center gap-2.5 border border-amber-400/30 cursor-pointer`}
        >
          <div className="relative">
            <MessageSquare className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-md animate-bounce">
                {unreadCount}
              </span>
            )}
          </div>

          <div className="hidden sm:flex flex-col items-start text-right">
            <div className="flex items-center gap-1">
              <span className="text-xs font-extrabold leading-tight">پشتیبانی و چت آنلاین</span>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-bold">
                  {unreadCount} جدید
                </span>
              )}
            </div>
            <span className="text-[10px] text-amber-200 font-medium">ارتباط زنده با بوق اعلان</span>
          </div>
        </button>
      </div>
    </>
  );
};
