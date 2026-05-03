import React, { useState, useMemo, useRef } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { Transaction, TransactionType, TransactionNature, Role } from '../types';
import { PencilIcon, TrashIcon, GiftIcon, BranchIcon, CameraIcon, SearchIcon } from '../constants';
import { compressImage } from '../utils/imageUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const NonMoneyTransactionsPage = () => {
    const { transactions, allTransactions, addTransaction, updateTransaction, deleteTransaction, currentUser, branches, globalSearchTerm, settings, showConfirm, showAlert } = useAppContext();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportDates, setExportDates] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
    const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
    const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
    const [isCompressing, setIsCompressing] = useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState('');

    const [formState, setFormState] = useState({
        date: new Date().toISOString().split('T')[0],
        category: '',    // Sumber (sebelumnya keterangan)
        description: '', // Nama Barang
        item: '',        // Jumlah / Satuan (sebelumnya Sumber)
        attachmentUrl: '',
    });

    const isAdmin = currentUser?.role === Role.Admin;

    const branchName = useMemo(() => {
        if (isAdmin) {
            if (selectedBranchId === 'all') return 'Semua Cabang';
            return branches.find(b => b.id === selectedBranchId)?.name || '';
        }
        return branches.find(b => b.id === currentUser?.branchId)?.name || '';
    }, [currentUser, branches, selectedBranchId, isAdmin]);

    const dataPool = isAdmin ? allTransactions : transactions;

    const getBranchName = (branchId: string) =>
        branches.find(b => b.id === branchId)?.name || branchId;

    const filteredTransactions = useMemo(() => {
        return dataPool
            .filter(t => {
                if (t.nature !== TransactionNature.NonMoney) return false;
                if (isAdmin && selectedBranchId !== 'all') return t.branchId === selectedBranchId;
                
                if (globalSearchTerm) {
                    const search = globalSearchTerm.toLowerCase();
                    return t.description.toLowerCase().includes(search) || 
                           t.item?.toLowerCase().includes(search) || 
                           t.category?.toLowerCase().includes(search) ||
                           getBranchName(t.branchId).toLowerCase().includes(search);
                }
                return true;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [dataPool, selectedBranchId, isAdmin, globalSearchTerm, branches]);

    const handleDownloadPDF = () => {
        const toExport = filteredTransactions.filter(t => {
            const d = t.date.split('T')[0];
            return d >= exportDates.start && d <= exportDates.end;
        });

        if (toExport.length === 0) {
            showAlert("Data Kosong", "Tidak ada data untuk periode ini.", "info");
            return;
        }

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();

        // — Header bar (Match ExportModal)
        doc.setFillColor(16, 185, 129); // emerald-500
        doc.rect(0, 0, pageW, 32, 'F');

        // — Title & Logo (Kop)
        const displayTitle = 'LAPORAN TRANSAKSI NON UANG';
        const displaySubtitle = `Unit: ${branchName.toUpperCase()} | Periode: ${exportDates.start} s/d ${exportDates.end}`;

        const logoUrl = settings.appLogoUrl;

        if (logoUrl) {
            try {
                doc.addImage(logoUrl, 'PNG', 14, 6, 20, 20);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(16);
                doc.setTextColor(255, 255, 255);
                doc.text(displayTitle, 38, 13);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(displaySubtitle, 38, 20);
            } catch (e) {
                doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(255, 255, 255);
                doc.text(displayTitle, pageW / 2, 13, { align: 'center' });
            }
        } else {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.setTextColor(255, 255, 255);
            doc.text(displayTitle, pageW / 2, 13, { align: 'center' });
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(displaySubtitle, pageW / 2, 21, { align: 'center' });
        }

        const rows = toExport.map((t, i) => [
            i + 1,
            new Date(t.date).toLocaleDateString('id-ID'),
            getBranchName(t.branchId),
            t.description,
            t.amount,
            t.item || '-',
            t.category || '-'
        ]);

        autoTable(doc, {
            startY: 40,
            head: [['No', 'Tanggal', 'Unit', 'Nama Barang', 'Jumlah', 'Sumber']],
            body: rows,
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129], fontStyle: 'bold' }
        });

        doc.save(`NonUang_${branchName.replace(/\s/g, '_')}_${exportDates.start}_${exportDates.end}.pdf`);
        setIsExportModalOpen(false);
    };

    const handlePrint = () => {
        const toExport = filteredTransactions.filter(t => {
            const d = t.date.split('T')[0];
            return d >= exportDates.start && d <= exportDates.end;
        });

        if (toExport.length === 0) {
            showAlert("Data Kosong", "Tidak ada data untuk periode ini.", "info");
            return;
        }

        const logoUrl = settings.appLogoUrl;
        const displayTitle = 'LAPORAN TRANSAKSI NON UANG';
        const displaySubtitle = `UNIT: ${branchName.toUpperCase()} | PERIODE: ${exportDates.start} s/d ${exportDates.end}`;

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Cetak Non Uang</title>
        <style>
            body{font-family:'Segoe UI',Arial,sans-serif;padding:40px;color:#1e293b;line-height:1.5}
            .header-bar{background:#10b981;color:#fff;padding:25px;margin:-40px -40px 30px -40px;display:flex;align-items:center;justify-content:center;gap:20px}
            .header-bar img{width:60px;height:60px;object-fit:contain}
            .header-text{text-align:left}
            h1{font-size:22px;margin:0;letter-spacing:1px}
            .sub-title{font-size:12px;font-weight:700;margin-top:5px;opacity:0.9}
            table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:30px}
            th{background:#10b981;color:#fff;padding:12px;text-align:left;text-transform:uppercase}
            td{padding:10px 12px;border-bottom:1px solid #f1f5f9}
            tr:nth-child(even) td{background:#fcfdfe}
            .footer{clear:both;margin-top:50px;text-align:center;font-size:9px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:20px}
            @media print { 
                .header-bar { -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
                th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                tr:nth-child(even) td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
        </style></head><body>
        <div class="header-bar">
            ${logoUrl ? `<img src="${logoUrl}">` : ''}
            <div class="header-text">
                <h1>${displayTitle}</h1>
                <div class="sub-title">${displaySubtitle}</div>
            </div>
        </div>
        <table><thead><tr><th>No</th><th>Tanggal</th><th>Unit</th><th>Nama Barang</th><th>Jumlah</th><th>Sumber</th></tr></thead>
        <tbody>${toExport.map((t,i)=>`<tr><td>${i+1}</td><td>${new Date(t.date).toLocaleDateString('id-ID')}</td><td>${getBranchName(t.branchId)}</td><td>${t.description}</td><td>${t.item || '-'}</td><td>${t.category || '-'}</td></tr>`).join('')}</tbody></table>
        <div class="footer">Dokumen ini dihasilkan otomatis oleh Sistem Keuangan PPHQ</div>
        <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),800)}<\/script>
        </body></html>`;

        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(html);
        win.document.close();
        setIsExportModalOpen(false);
    };

    const handleExportCSV = () => {
        const toExport = filteredTransactions.filter(t => {
            const d = t.date.split('T')[0];
            return d >= exportDates.start && d <= exportDates.end;
        });

        if (toExport.length === 0) {
            showAlert("Data Kosong", "Tidak ada data untuk periode ini.", "info");
            return;
        }

        let csv = '"No","Tanggal","Unit","Nama Barang","Jumlah","Sumber","Keterangan"\n';
        toExport.forEach((t, i) => {
            csv += `"${i+1}","${new Date(t.date).toLocaleDateString('id-ID')}","${getBranchName(t.branchId)}","${t.description}","${t.amount}","${t.item || '-'}","${t.category || '-'}"\n`;
        });

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `NonUang_${branchName.replace(/\s/g, '_')}_${exportDates.start}_${exportDates.end}.csv`;
        link.click();
        setIsExportModalOpen(false);
    };


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
        }
    };

    const openModal = (transaction: Transaction | null = null) => {
        setCurrentTransaction(transaction);
        setFormState({
            date: transaction ? transaction.date.split('T')[0] : new Date().toISOString().split('T')[0],
            category: transaction ? transaction.category : '',
            description: transaction ? transaction.description : '',
            item: transaction ? transaction.item || '' : '',
            attachmentUrl: transaction?.attachmentUrl || '',
        });
        setAttachmentPreview(transaction?.attachmentUrl || null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentTransaction(null);
        setAttachmentPreview(null);
        setFormState({ date: new Date().toISOString().split('T')[0], category: '', description: '', item: '', attachmentUrl: '' });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState.description) {
            showAlert("Peringatan", 'Harap isi Nama Barang.', "danger");
            return;
        }
        const transactionData = {
            date: new Date(formState.date).toISOString(),
            branchId: currentUser!.branchId,
            category: formState.category, // Sumber
            description: formState.description, // Nama Barang
            item: formState.item, // Jumlah (String)
            amount: 0,
            type: TransactionType.Income,
            nature: TransactionNature.NonMoney,
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
            'Apakah Anda yakin ingin menghapus transaksi non-uang ini?',
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
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Transaksi Non Uang</h1>
                    <p className="text-emerald-600 text-sm font-bold mt-0.5">{branchName}</p>
                    <p className="text-slate-400 text-xs mt-0.5">Catatan barang atau jasa yang diterima tanpa uang tunai.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setIsExportModalOpen(true)}
                        className="px-4 py-2.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Export
                    </button>
                    {isAdmin && (
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <BranchIcon className="w-4 h-4 text-slate-400" />
                            </div>
                            <select
                                value={selectedBranchId}
                                onChange={e => setSelectedBranchId(e.target.value)}
                                className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none shadow-sm appearance-none cursor-pointer"
                            >
                                <option value="all">Semua unit</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {!isAdmin && (
                        <button
                            onClick={() => openModal()}
                            className="px-6 py-2.5 bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
                        >
                            + Tambah Transaksi
                        </button>
                    )}
                </div>
            </div>

            {/* Unified Table View (Responsive) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse min-w-[700px] md:min-w-full">
                        <thead className="text-[10px] text-slate-800 uppercase tracking-wider bg-emerald-500/10">
                            <tr className="border-b border-emerald-500/20">
                                <th className="px-3 py-3 font-bold border-r border-emerald-500/20 text-center w-10">No</th>
                                <th className="px-4 py-3 font-bold border-r border-emerald-500/20">Tanggal</th>
                                {isAdmin && <th className="px-4 py-3 font-bold border-r border-emerald-500/20">unit</th>}
                                <th className="px-4 py-3 font-bold border-r border-emerald-500/20">Nama Barang</th>
                                <th className="px-4 py-3 font-bold border-r border-emerald-500/20 text-center w-32">Jumlah</th>
                                <th className="px-4 py-3 font-bold border-r border-emerald-500/20 text-center">Nota</th>
                                <th className="px-4 py-3 font-bold border-r border-emerald-500/20">Sumber</th>
                                {!isAdmin && <th className="px-4 py-3 font-bold text-center w-20">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTransactions.map((t, index) => (
                                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors text-xs">
                                    <td className="px-3 py-2.5 text-slate-500 font-medium text-center border-r border-slate-100">{index + 1}</td>
                                    <td className="px-4 py-2.5 text-slate-500 font-medium border-r border-slate-100">{new Date(t.date).toLocaleDateString('id-ID')}</td>
                                    {isAdmin && (
                                        <td className="px-4 py-2.5 border-r border-slate-100">
                                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg font-bold text-[10px] border border-emerald-100 uppercase">
                                                {getBranchName(t.branchId)}
                                            </span>
                                        </td>
                                    )}
                                    <td className="px-4 py-2.5 font-bold text-slate-800 border-r border-slate-100">{t.description}</td>
                                    <td className="px-4 py-2.5 font-bold text-emerald-600 border-r border-slate-100 text-center italic">{t.item || '-'}</td>
                                    <td className="px-4 py-2.5 border-r border-slate-100 text-center">
                                        {t.attachmentUrl ? (
                                            <button 
                                                onClick={() => openImageModal(t.attachmentUrl!)}
                                                className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 hover:border-emerald-500 transition-all mx-auto"
                                            >
                                                <img src={t.attachmentUrl} alt="Nota" className="w-full h-full object-cover" />
                                            </button>
                                        ) : (
                                            <span className="text-slate-300 text-[9px] font-bold uppercase tracking-widest">N/A</span>
                                        )}
                                    </td>
                                    <td className={`px-4 py-2.5 border-r border-slate-100 font-bold text-slate-600 ${!isAdmin ? 'border-r border-slate-100' : ''}`}>
                                        {t.category || '-'}
                                    </td>
                                    {!isAdmin && (
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button onClick={() => openModal(t)} className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all" title="Edit">
                                                    <PencilIcon className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => handleDelete(t.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Hapus">
                                                    <TrashIcon className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredTransactions.length === 0 && (
                    <div className="text-center py-10 bg-slate-50 border-t border-slate-100">
                        <GiftIcon className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                        <p className="text-slate-400 text-xs font-medium">Belum ada transaksi non uang.</p>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex justify-center items-center p-4">
                    <div className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-slate-800 mb-1">{currentTransaction ? 'Edit' : 'Tambah'} Transaksi</h2>
                        <p className="text-slate-400 text-sm mb-8">Lengkapi detail transaksi non-uang di bawah ini.</p>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Tanggal Transaksi</label>
                                <input name="date" type="date" value={formState.date} onChange={handleInputChange} className="mt-2 w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-700" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Nama Barang</label>
                                    <input name="description" type="text" placeholder="Misal: Beras" value={formState.description} onChange={handleInputChange} className="mt-2 w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-700" required />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                                        Jumlah <span className="normal-case font-normal text-slate-400">(Opsional)</span>
                                    </label>
                                    <input name="item" type="text" placeholder="Misal: 10 Karung" value={formState.item} onChange={handleInputChange} className="mt-2 w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-700" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                                    Sumber <span className="normal-case font-normal text-slate-400">(Donatur / Pihak Ke-3)</span>
                                </label>
                                <input name="category" type="text" placeholder="Misal: Hibah, Donasi, Nama Orang" value={formState.category} onChange={handleInputChange} className="mt-2 w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-700" />
                            </div>

                            {/* Photo Section */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Foto Barang/Nota (Opsional)</label>
                                <div className="mt-2 flex items-center gap-4">
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-24 h-24 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all overflow-hidden group"
                                    >
                                        {attachmentPreview ? (
                                            <img src={attachmentPreview} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <>
                                                <CameraIcon className="w-6 h-6 text-slate-300 group-hover:text-emerald-500" />
                                                <span className="text-[10px] font-bold text-slate-400 mt-1">Upload</span>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex-grow space-y-2">
                                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />
                                        <p className="text-[10px] text-slate-400 font-medium">Klik kotak untuk foto barang/nota. Gambar dikompres (max 200kb).</p>
                                        {isCompressing && <p className="text-[10px] text-emerald-600 font-bold animate-pulse">Sedang mengompres...</p>}
                                        {attachmentPreview && (
                                            <button type="button" onClick={() => { setAttachmentPreview(null); setFormState(prev => ({ ...prev, attachmentUrl: '' })); }} className="text-[10px] font-bold text-red-500 hover:underline">Hapus Foto</button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-50 mt-4">
                                <button type="button" onClick={closeModal} className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">Batal</button>
                                <button type="submit" disabled={isCompressing} className="px-10 py-3 bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 hover:scale-[1.02] transition-all disabled:opacity-50">Simpan</button>
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
                        <button onClick={() => setIsImageModalOpen(false)} className="absolute top-0 right-0 md:-top-10 md:-right-10 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>
            )}
            {/* Export Modal */}
            {isExportModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70] flex justify-center items-center p-4">
                    <div className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-300">
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Export Data Non Uang</h2>
                        <p className="text-slate-400 text-sm mb-6 font-medium">Pilih rentang tanggal laporan.</p>
                        
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Dari</label>
                                <input 
                                    type="date" 
                                    value={exportDates.start} 
                                    onChange={e => setExportDates(prev => ({...prev, start: e.target.value}))} 
                                    className="mt-2 w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold text-slate-700" 
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Sampai</label>
                                <input 
                                    type="date" 
                                    value={exportDates.end} 
                                    onChange={e => setExportDates(prev => ({...prev, end: e.target.value}))} 
                                    className="mt-2 w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold text-slate-700" 
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button onClick={handleDownloadPDF} className="w-full py-3.5 bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                                Download PDF
                            </button>
                            <button onClick={handlePrint} className="w-full py-3.5 bg-slate-700 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                Cetak
                            </button>
                            <button onClick={handleExportCSV} className="w-full py-3.5 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Download CSV / Excel
                            </button>
                            <button onClick={() => setIsExportModalOpen(false)} className="mt-2 py-2 text-slate-400 font-bold text-xs hover:text-slate-600 transition-all">Batal</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NonMoneyTransactionsPage;