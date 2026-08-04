import React, { useState, useRef, useEffect } from 'react';
import { SparklesIcon } from '../constants';
import { useAppContext } from '../hooks/useAppContext';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

interface HQAIModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HQAIModal: React.FC<HQAIModalProps> = ({ isOpen, onClose }) => {
  const { settings, currentUser } = useAppContext();
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Halo! Saya **HQAI**, asisten AI khusus PPHQ Finance v2.\n\nAda yang bisa saya bantu terkait laporan keuangan, saldo kas, infaq santri, atau statistik cabang hari ini?',
      timestamp: new Date(),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickPrompts = [
    'Berapa sisa kas bersih saat ini?',
    'Ringkasan pengeluaran bulan ini',
    'Cek status infaq bulanan santri',
    'Panduan penggunaan aplikasi PPHQ',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (promptToSend?: string) => {
    const text = (promptToSend || inputPrompt).trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!promptToSend) setInputPrompt('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/hqai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          currentUser: currentUser
            ? {
                id: currentUser.id,
                name: currentUser.name,
                role: currentUser.role,
                branchId: currentUser.branchId,
                unitHeadName: currentUser.unitHeadName,
                unitTreasurerName: currentUser.unitTreasurerName,
              }
            : null,
          chatHistory: messages
            .filter((m) => m.id !== 'welcome')
            .map((m) => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.text,
            })),
        }),
      });

      const data = await response.json();

      if (data.status === 'success' && data.data?.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'ai',
            text: data.data.reply,
            timestamp: new Date(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'ai',
            text: `⚠️ Error: ${data.message || 'Gagal tersambung ke HQAI.'}`,
            timestamp: new Date(),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: '⚠️ Terjadi kesalahan jaringan saat menghubungkan ke server HQAI.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'ai',
        text: 'Halo! Percakapan telah direset. Ada yang bisa saya bantu lagi seputar PPHQ Finance v2?',
        timestamp: new Date(),
      },
    ]);
  };

  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let formatted = line;
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        return (
          <li
            key={idx}
            className="ml-4 list-disc text-sm my-0.5"
            dangerouslySetInnerHTML={{ __html: formatted.replace(/^[\*\-]\s+/, '') }}
          />
        );
      }
      return (
        <p
          key={idx}
          className="text-sm my-1 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: formatted }}
        />
      );
    });
  };

  return (
    <>
      {/* Side Panel — no backdrop, sits above bottom nav on mobile */}
      <div
        className="fixed right-0 z-40 flex flex-col"
        style={{
          bottom: isMobile ? '64px' : '0px',
          width: isMobile ? '100vw' : 'min(420px, 100vw)',
          height: isOpen
            ? isMobile ? 'calc(100vh - 128px)' : 'min(600px, 90vh)'
            : '0px',
          transition: 'height 0.35s cubic-bezier(0.4,0,0.2,1)',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        <div
          className="flex flex-col h-full bg-white shadow-2xl overflow-hidden"
          style={{
            borderRadius: '20px 20px 0 0',
            border: '1px solid #e2e8f0',
            borderBottom: 'none',
            opacity: isOpen ? 1 : 0,
            transform: isOpen ? 'translateY(0)' : 'translateY(30px)',
            transition: 'opacity 0.3s ease, transform 0.35s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-4 py-3 text-white flex items-center justify-between flex-shrink-0"
            style={{ borderRadius: '20px 20px 0 0' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                <SparklesIcon className="w-5 h-5 text-emerald-200 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm tracking-wide">HQAI Assistant</h3>
                  <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase bg-emerald-400/30 text-emerald-100 rounded-full border border-emerald-300/40">
                    Online
                  </span>
                </div>
                <p className="text-xs text-emerald-100/80">
                  Asisten AI {settings.appName || 'PPHQ Finance'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleClearChat}
                className="px-2.5 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition-all font-semibold"
                title="Reset Chat"
              >
                Reset
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all"
                title="Tutup"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Chat Body */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50" style={{ scrollbarWidth: 'thin' }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                    <SparklesIcon className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] p-3 rounded-2xl text-slate-800 shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-none font-medium'
                      : 'bg-white border border-slate-100 rounded-tl-none'
                  }`}
                >
                  {msg.sender === 'user' ? (
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                    <div>{renderFormattedText(msg.text)}</div>
                  )}
                  <span
                    className={`text-[9px] mt-1 block text-right font-medium ${
                      msg.sender === 'user' ? 'text-emerald-100' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <SparklesIcon className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="bg-white border border-slate-100 px-3 py-2.5 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">HQAI sedang berpikir</span>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-2 bg-slate-100/70 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">
              Saran:
            </span>
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                disabled={isLoading}
                onClick={() => handleSendMessage(qp)}
                className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 px-2.5 py-1 rounded-full transition-all flex-shrink-0 whitespace-nowrap"
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-slate-100 flex-shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="Tanyakan sesuatu seputar PPHQ Finance..."
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                disabled={isLoading}
                className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm font-medium text-slate-800 transition-all placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={isLoading || !inputPrompt.trim()}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
              >
                <span>Kirim</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default HQAIModal;
