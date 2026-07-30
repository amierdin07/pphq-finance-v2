import React, { useState, useEffect, useRef, useContext } from 'react';
import { Bot, Send, X, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppContext } from '../context/AppContext';

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: Date;
}

export default function GeminiChatbot() {
    const context = useContext(AppContext);
    if (!context) return null;
    const { currentUser } = context;

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const isPjc = currentUser?.email?.toLowerCase().endsWith('@pjc.com');

    const suggestions = [
        "Analisis transaksi bulan ini dong",
        "Apakah pengeluaran aman?",
        "Beri rekomendasi hemat",
        "Tolong buat ringkasan transaksi terbaru"
    ];

    // Listen to header click event
    useEffect(() => {
        const handleToggle = () => setIsOpen(prev => !prev);
        window.addEventListener('toggle-hq-ai', handleToggle);
        return () => window.removeEventListener('toggle-hq-ai', handleToggle);
    }, []);

    // Scroll to bottom whenever messages change
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isLoading]);

    // Send greeting on first open
    useEffect(() => {
        if (isOpen && messages.length === 0 && currentUser) {
            setMessages([
                {
                    id: 'welcome',
                    role: 'model',
                    text: `Halo ${currentUser.name}! Saya ${isPjc ? 'PJC AI' : 'HQAI'} (Asisten AI Hamalatul Qur'an). Ada yang bisa saya bantu analisis hari ini?`,
                    timestamp: new Date()
                }
            ]);
        }
    }, [isOpen, messages.length, currentUser]);

    const handleSend = async (textToSend: string) => {
        if (!textToSend.trim() || isLoading) return;

        const userMessage: Message = {
            id: Math.random().toString(36).substr(2, 9),
            role: 'user',
            text: textToSend,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            const domain = currentUser?.email ? currentUser.email.split('@')[1] : '';
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (domain) {
                headers['x-tenant-domain'] = domain;
            }

            // Map current chat history for backend (excluding welcome message for cleaner context)
            const chatHistory = messages
                .filter(m => m.id !== 'welcome')
                .map(m => ({
                    role: m.role,
                    text: m.text
                }));

            const response = await fetch('/api/gemini-chat', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    message: textToSend,
                    history: chatHistory,
                    user: currentUser
                })
            });

            const result = await response.json();

            if (result.status === 'error') {
                throw new Error(result.message);
            }

            const modelMessage: Message = {
                id: Math.random().toString(36).substr(2, 9),
                role: 'model',
                text: result.data,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, modelMessage]);
        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan saat menghubungi asisten AI.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        if (currentUser) {
            setMessages([
                {
                    id: 'welcome',
                    role: 'model',
                    text: `Halo ${currentUser.name}! Obrolan telah disetel ulang. Ada analisis keuangan lain yang ingin ditanyakan?`,
                    timestamp: new Date()
                }
            ]);
            setError(null);
        }
    };

    return (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50 font-sans">
            <AnimatePresence>
                {/* Chat window */}
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        transition={{ duration: 0.25 }}
                        className="bg-white border border-slate-100 shadow-2xl rounded-2xl w-[90vw] sm:w-[380px] h-[500px] flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 p-4 text-white flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-white/20 rounded-lg">
                                    <Sparkles className="w-5 h-5 text-emerald-100 animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm leading-tight">{isPjc ? 'PJC AI' : 'HQAI'}</h3>
                                    <p className="text-[10px] text-emerald-100">Bertenaga Gemini 1.5 Flash</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button 
                                    onClick={handleReset}
                                    title="Reset percakapan"
                                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Messages container */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-sm whitespace-pre-line ${
                                            msg.role === 'user'
                                                ? 'bg-emerald-600 text-white rounded-br-none'
                                                : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                                        }`}
                                    >
                                        {msg.text}
                                    </div>
                                </div>
                            ))}

                            {/* Typing indicator */}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-none px-4 py-3 text-xs shadow-sm flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></span>
                                    </div>
                                </div>
                            )}

                            {/* Error Message */}
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex gap-2 text-red-600 text-xs items-start">
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <div>{error}</div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Suggestions */}
                        {messages.length <= 1 && !isLoading && (
                            <div className="px-4 py-2 bg-slate-50/30 overflow-x-auto flex gap-1.5 no-scrollbar border-t border-slate-100">
                                {suggestions.map((s, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSend(s)}
                                        className="shrink-0 text-[10px] bg-white border border-slate-200 text-slate-600 hover:border-emerald-500 hover:text-emerald-600 rounded-full px-2.5 py-1 transition-all"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Input Area & Disclaimer */}
                        <div className="p-3 bg-white border-t border-slate-100 flex flex-col gap-1.5">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSend(input);
                                }}
                                className="flex gap-2 items-center"
                            >
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Tanyakan kondisi keuangan Anda..."
                                    disabled={isLoading}
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-all disabled:opacity-50"
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading || !input.trim()}
                                    className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white rounded-xl transition-all shadow-md shrink-0"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </form>
                            <p className="text-[9px] text-slate-400 text-center leading-none">
                                AI dapat membuat kesalahan. Harap periksa kembali data penting Anda.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

