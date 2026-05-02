import React from 'react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info' | 'success';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Ya, Hapus',
    cancelText = 'Batal',
    type = 'danger'
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 text-center">
                    <div className={`w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center ${
                        type === 'danger' ? 'bg-red-50 text-red-500' : 
                        type === 'info' ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'
                    }`}>
                        {type === 'danger' ? (
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        ) : (
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                    </div>
                    
                    <h3 className="text-2xl font-black text-slate-800 mb-2">{title}</h3>
                    <p className="text-slate-500 font-medium leading-relaxed">{message}</p>
                </div>
                
                <div className="flex gap-4 p-8 pt-0">
                    <button 
                        onClick={onCancel}
                        className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                    >
                        {cancelText}
                    </button>
                    <button 
                        onClick={onConfirm}
                        className={`flex-1 py-4 text-white font-bold rounded-2xl shadow-lg transition-all ${
                            type === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 
                            type === 'info' ? 'bg-blue-50 hover:bg-blue-600 shadow-blue-200' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'
                        }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
