import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '../hooks/useAppContext';
import { Transaction, TransactionType, TransactionNature, Category } from '../types';
import { PencilIcon, TrashIcon, CameraIcon, ImageIcon } from '../constants';
import { formatCurrencyInput, parseCurrencyInput } from '../utils';
import { compressImage } from '../utils/imageUtils';

interface TransactionsPageProps {
    type: TransactionType;
    nature?: TransactionNature; // Optional, defaults to Money
}

const TransactionsPage: React.FC<TransactionsPageProps> = ({ type, nature = TransactionNature.Money }) => {
    const { transactions, categories, addTransaction, updateTransaction, deleteTransaction, currentUser, globalSearchTerm, showConfirm, showAlert } = useAppContext();
    const location = useLocation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
    const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
    const [isCompressing, setIsCompressing] = useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState('');
    
    const [formState, setFormState] = useState({
        date: new Date().toISOString().split('T')[0],
        category: '',
        description: '',
        amount: '',
        attachmentUrl: '',
    });
    
    useEffect(() => {
        closeModal();
    }, [location.pathname, location.search]);

    const pageTitle = type === TransactionType.Income ? 'Pemasukan Uang' : 'Pengeluaran';
    const availableCategories = useMemo(() => categories.filter(c => c.type === type), [categories, type]);

    const filteredTransactions = useMemo(() => {
        return transactions
            .filter(t => t.type === type && t.nature === nature)
            .filter(t => {
                if (globalSearchTerm) {
                    const s = globalSearchTerm.toLowerCase();
                    return t.description.toLowerCase().includes(s) || t.category.toLowerCase().includes(s);
                }
                return true;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, type, nature, globalSearchTerm]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsCompressing(true);
        try {
            const compressed = await compressImage(file);
            setAttachmentPreview(compressed);
            setFormState(prev => ({ ...prev, attachmentUrl: compressed }));
        } catch (error) {
            console.error("Compression failed", error);
            showAlert("Error", "Gagal memproses gambar.", "danger");
        } finally {
            setIsCompressing(false);
            e.target.value = '';
        }
    };

    const openModal = (transaction: Transaction | null = null) => {
        setCurrentTransaction(transaction);
        const initialCategory = transaction?.category || (availableCategories.length > 0 ? availableCategories[0].name : '');
        setFormState({
            date: transaction ? transaction.date.split('T')[0] : new Date().toISOString().split('T')[0],
            category: initialCategory,
            description: transaction ? transaction.description : '',
            amount: transaction ? formatCurrencyInput(transaction.amount.toString()) : '',
            attachmentUrl: transaction?.attachmentUrl || '',
        });
        setAttachmentPreview(transaction?.attachmentUrl || null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentTransaction(null);
        setAttachmentPreview(null);
        setFormState({
            date: new Date().toISOString().split('T')[0],
            category: availableCategories.length > 0 ? availableCategories[0].name : '',
            description: '',
            amount: '',
            attachmentUrl: '',
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'amount') {
            setFormState(prev => ({ ...prev, [name]: formatCurrencyInput(value) }));
        } else {
            setFormState(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseCurrencyInput(formState.amount);
        if (!formState.category || !formState.description || numericAmount <= 0) {
            showAlert("Peringatan", 'Harap isi semua kolom dengan benar.', "danger");
            return;
        }

        const transactionData = {
            date: new Date(formState.date).toISOString(),
            branchId: currentUser!.branchId,
            category: formState.category,
            description: formState.description,
            amount: numericAmount,
            type: type,
            nature: nature,
            attachmentUrl: formState.attachmentUrl || undefined
        };

        if (currentTransaction) {
            await updateTransaction({ ...currentTransaction, ...transactionData });
        } else {
            await addTransaction(transactionData);
        }
        closeModal();
    };
    
    const handleDelete = async (id: string) => {
        showConfirm(
            'Hapus Transaksi?', 
            'Apakah Anda yakin ingin menghapus transaksi ini? Data yang dihapus tidak dapat dikembalikan.',
            async () => {
                await deleteTransaction(id);
            },
            'danger'
        );
    };

    const openImageModal = (url: string) => {
        setSelectedImageUrl(url);
        setIsImageModalOpen(true);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{pageTitle}</h1>
                    <p className="text-slate-400 text-sm font-medium mt-0.5">Kelola data {type === TransactionType.Income ? 'pemasukan' : 'pengeluaran'} kas cabang.</p>
                </div>
                <button onClick={() => openModal()} className="px-6 py-2.5 bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-500/20 hover:bg-emerald-600 transition-all">
                    Tambah {type === TransactionType.Income ? 'Pemasukan' : 'Pengeluaran'}
                </button>
            </div>
            
             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                         <thead className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50/50">
                            <tr>
                                <th className="px-6 py-4 font-bold">Tanggal</th>
                                <th className="px-6 py-4 font-bold">Kategori</th>
                                <th className="px-6 py-4 font-bold">Deskripsi</th>
                                <th className="px-6 py-4 font-bold">Nota</th>
                                <th className="px-6 py-4 font-bold text-right">Jumlah</th>
                                <th className="px-6 py-4 font-bold text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredTransactions.map(t => (
                                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 text-slate-500 font-medium">{new Date(t.date).toLocaleDateString('id-ID')}</td>
                                    <td className="px-6 py-4 text-slate-500 font-medium">{t.category}</td>
                                    <td className="px-6 py-4 font-bold text-slate-800">{t.description}</td>
                                    <td className="px-6 py-4">
                                        {t.attachmentUrl ? (
                                            <button 
                                                onClick={() => openImageModal(t.attachmentUrl!)}
                                                className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 hover:border-emerald-500 transition-all"
                                            >
                                                <img src={t.attachmentUrl} alt="Nota" className="w-full h-full object-cover" />
                                            </button>
                                        ) : (
                                            <span className="text-slate-300 text-[10px] font-bold uppercase tracking-widest">Tidak ada</span>
                                        )}
                                    </td>
                                    <td className={`px-6 py-4 text-right font-bold ${type === TransactionType.Income ? 'text-emerald-500' : 'text-red-500'}`}>
                                        Rp{t.amount.toLocaleString('id-ID')}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button 
                                                onClick={() => openModal(t)} 
                                                className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                                                title="Edit"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(t.id)} 
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title="Hapus"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                 <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex justify-center items-center p-4">
                    <div className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">{currentTransaction ? 'Edit' : 'Tambah'} {pageTitle}</h2>
                        <p className="text-slate-400 text-sm mb-8">Lengkapi detail transaksi di bawah ini.</p>
                        
                        <form onSubmit={handleSubmit} className="space-y-5">
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="date" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Tanggal</label>
                                    <input id="date" name="date" type="date" value={formState.date} onChange={handleInputChange} className="mt-2 w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-700" required />
                                </div>
                                <div>
                                    <label htmlFor="category" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Kategori</label>
                                    <select id="category" name="category" value={formState.category} onChange={handleInputChange} className="mt-2 w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-700" required>
                                        <option value="" disabled>Pilih Kategori</option>
                                        {availableCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="description" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Deskripsi</label>
                                <input id="description" name="description" type="text" placeholder="Misal: Pembayaran listrik" value={formState.description} onChange={handleInputChange} className="mt-2 w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-700" required />
                            </div>
                            <div>
                                <label htmlFor="amount" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Jumlah (Rp)</label>
                                <div className="relative mt-2">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                                    <input id="amount" name="amount" type="text" placeholder="0" value={formState.amount} onChange={handleInputChange} className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-slate-800 text-lg" required />
                                </div>
                            </div>

                            {/* Receipt Photo Section */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Foto Nota (Opsional) <span className="normal-case font-normal text-slate-400 text-[10px] ml-1">(max 200kb)</span></label>
                                <div className="mt-2 space-y-4">
                                    <div className="flex gap-3">
                                        <button 
                                            type="button"
                                            onClick={() => cameraInputRef.current?.click()}
                                            className="flex-1 py-3 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all"
                                        >
                                            <CameraIcon className="w-4 h-4" />
                                            Buka Kamera
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex-1 py-3 bg-slate-50 text-slate-600 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-100 transition-all"
                                        >
                                            <ImageIcon className="w-4 h-4" />
                                            Pilih File
                                        </button>
                                    </div>
                                    
                                    <div className="h-40 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group bg-slate-50/50">
                                        {attachmentPreview ? (
                                            <img src={attachmentPreview} alt="Preview" className="w-full h-full object-contain" />
                                        ) : isCompressing ? (
                                            <div className="animate-spin h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full" />
                                        ) : (
                                            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Belum ada foto</p>
                                        )}
                                        {attachmentPreview && (
                                            <button 
                                                type="button"
                                                onClick={() => { setAttachmentPreview(null); setFormState(prev => ({ ...prev, attachmentUrl: '' })); }} 
                                                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                </div>
                            </div>

                             <div className="flex justify-end gap-3 pt-6 border-t border-slate-50 mt-4">
                                <button type="button" onClick={closeModal} className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">Batal</button>
                                <button type="submit" disabled={isCompressing} className="px-10 py-3 bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 hover:scale-[1.02] transition-all disabled:opacity-50">Simpan Transaksi</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Image Detail Modal */}
            {isImageModalOpen && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex justify-center items-center p-4 md:p-10" onClick={() => setIsImageModalOpen(false)}>
                    <div className="relative max-w-4xl w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        <img src={selectedImageUrl} alt="Nota Full" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
                        <button 
                            onClick={() => setIsImageModalOpen(false)}
                            className="absolute top-0 right-0 md:-top-10 md:-right-10 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransactionsPage;