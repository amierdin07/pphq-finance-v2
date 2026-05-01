import React, { useState, useMemo } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { Announcement, Role } from '../types';

interface AnnouncementsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AnnouncementsModal: React.FC<AnnouncementsModalProps> = ({ isOpen, onClose }) => {
    const { announcements, markAnnouncementRead, deleteAnnouncement, currentUser } = useAppContext();

    const handleRead = async (a: Announcement) => {
        if (!a.isRead) {
            await markAnnouncementRead(a.id);
        }
    };

    const [selected, setSelected] = useState<Announcement | null>(null);

    const handleOpen = (a: Announcement) => {
        setSelected(a);
        handleRead(a);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex justify-end">
            {/* Panel from right */}
            <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Notifikasi</h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {announcements.filter(a => !a.isRead).length} belum dibaca
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Selected message view */}
                {selected ? (
                    <div className="flex-1 flex flex-col p-6">
                        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 mb-6 transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                            Kembali
                        </button>
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 mb-4">
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Dari Admin PPHQ</p>
                            <h3 className="text-xl font-bold text-slate-800">{selected.title}</h3>
                            <p className="text-xs text-slate-400 mt-1">{new Date(selected.createdAt).toLocaleString('id-ID')}</p>
                        </div>
                        <div className="flex-1 bg-slate-50 rounded-2xl p-5">
                            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{selected.message}</p>
                        </div>
                    </div>
                ) : (
                    /* List view */
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                        {announcements.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center">
                                    <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                </div>
                                <p className="font-bold text-slate-400">Belum ada notifikasi</p>
                            </div>
                        ) : (
                            announcements.map(a => (
                                <div
                                    key={a.id}
                                    onClick={() => handleOpen(a)}
                                    className={`px-6 py-4 cursor-pointer hover:bg-slate-50 transition-all ${!a.isRead ? 'border-l-4 border-emerald-500' : 'border-l-4 border-transparent'}`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                {!a.isRead && <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />}
                                                <p className={`text-sm font-bold truncate ${!a.isRead ? 'text-slate-800' : 'text-slate-500'}`}>{a.title}</p>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-0.5 truncate">{a.message}</p>
                                            <p className="text-[10px] text-slate-300 mt-1">{new Date(a.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                        {currentUser?.role === Role.Admin && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteAnnouncement(a.id); }}
                                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Admin: compose button */}
                {currentUser?.role === Role.Admin && !selected && (
                    <div className="p-4 border-t border-slate-100">
                        <ComposeForm />
                    </div>
                )}
            </div>
        </div>
    );
};

const ComposeForm = () => {
    const { createAnnouncement } = useAppContext();
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!title.trim() || !message.trim()) {
            alert('Judul dan pesan tidak boleh kosong.');
            return;
        }
        setLoading(true);
        await createAnnouncement(title, message);
        setLoading(false);
        setTitle('');
        setMessage('');
        setOpen(false);
    };

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="w-full py-3 bg-emerald-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                Kirim Pesan ke semua unit
            </button>
        );
    }

    return (
        <div className="space-y-3">
            <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Judul pesan..."
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Isi pesan untuk semua unit..."
                rows={3}
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
            />
            <div className="flex gap-2">
                <button onClick={() => setOpen(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-200 transition-all">Batal</button>
                <button onClick={handleSend} disabled={loading} className="flex-1 py-2.5 bg-emerald-500 text-white font-bold text-sm rounded-xl hover:bg-emerald-600 transition-all disabled:opacity-50">
                    {loading ? 'Mengirim...' : 'Kirim Sekarang'}
                </button>
            </div>
        </div>
    );
};

export default AnnouncementsModal;
