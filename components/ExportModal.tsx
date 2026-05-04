import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, TransactionType, Branch, Student } from '../types';
import { useAppContext } from '../hooks/useAppContext';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactions: Transaction[];
    branches: Branch[];
    title: string;
    branchName?: string;
    mode?: 'detailed' | 'summary' | 'syahriyah';
    students?: Student[];
    selectedYear?: number;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, transactions, branches, title, branchName, mode = 'detailed', students = [], selectedYear = new Date().getFullYear() }) => {
    const { settings, showAlert, currentUser } = useAppContext();
    const [startDate, setStartDate] = useState(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    );
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    if (!isOpen) return null;

    const getFiltered = () =>
        transactions
            .filter(t => {
                const date = t.date.split('T')[0];
                return date >= startDate && date <= endDate && t.nature === 'Money';
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const getOpeningBalance = () => {
        const before = transactions.filter(t => {
            const date = t.date.split('T')[0];
            return date < startDate && t.nature === 'Money';
        });
        const income = before.filter(t => t.type === TransactionType.Income).reduce((s, t) => s + t.amount, 0);
        const expense = before.filter(t => t.type === TransactionType.Expense).reduce((s, t) => s + t.amount, 0);
        return income - expense;
    };

    const displayBranch = branchName || 'semua unit';

    const getBranchSummary = (filtered: Transaction[]) => {
        const summary: Record<string, { income: number, expense: number }> = {};
        branches.forEach(b => {
            summary[b.id] = { income: 0, expense: 0 };
        });

        filtered.forEach(t => {
            if (summary[t.branchId]) {
                if (t.type === TransactionType.Income) summary[t.branchId].income += t.amount;
                else summary[t.branchId].expense += t.amount;
            }
        });

        return branches.map(b => ({
            name: b.name,
            income: summary[b.id].income,
            expense: summary[b.id].expense,
            balance: summary[b.id].income - summary[b.id].expense
        }));
    };

    // ── Real PDF download using jsPDF ─────────────────────────────
    const getImageDimensions = (url: string): Promise<{ w: number, h: number }> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ w: img.width, h: img.height });
            img.onerror = () => resolve({ w: 1, h: 1 });
            img.src = url;
        });
    };

    const handleExportPDF = async (action: 'download' | 'print') => {
        const filtered = getFiltered();
        if (filtered.length === 0) {
            showAlert("Data Kosong", 'Tidak ada data pada rentang tanggal tersebut.', "success");
            return;
        }

        const doc = new jsPDF({ 
            orientation: mode === 'syahriyah' ? 'landscape' : 'portrait', 
            unit: 'mm', 
            format: 'a4' 
        });
        
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        const renderHeader = (isAppendix: boolean = false, appendixTitle: string = '') => {
            // — Header bar
            doc.setFillColor(16, 185, 129); // emerald-500
            doc.rect(0, 0, pageW, isAppendix ? 20 : 32, 'F');

            if (!isAppendix) {
                const headerTitle = mode === 'syahriyah' ? 'LAPORAN INFAQ BULANAN PPHQ' : 'E-STATEMENT PPHQ FINANCE';
                if (settings.appLogoUrl) {
                    try {
                        doc.addImage(settings.appLogoUrl, 'JPEG', 14, 6, 20, 20, undefined, 'FAST');
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(16);
                        doc.setTextColor(255, 255, 255);
                        doc.text(headerTitle, 38, 13);
                        doc.setFontSize(10);
                        doc.text(mode === 'summary' ? 'LAPORAN RINGKASAN UNIT' : displayBranch.toUpperCase(), 38, 20);
                        doc.setFontSize(8);
                        doc.setFont('helvetica', 'normal');
                        doc.text(mode === 'summary' ? 'Summary Performance Per Cabang' : mode === 'syahriyah' ? `Tahun Buku ${selectedYear}` : 'Laporan Pemasukan & Pengeluaran Kas', 38, 26);
                    } catch (e) {
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(18);
                        doc.setTextColor(255, 255, 255);
                        doc.text(headerTitle, pageW / 2, 13, { align: 'center' });
                    }
                } else {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(18);
                    doc.setTextColor(255, 255, 255);
                    doc.text(headerTitle, pageW / 2, 13, { align: 'center' });
                }
            } else {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.setTextColor(255, 255, 255);
                doc.text(appendixTitle, 14, 13);
                
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.text(`${displayBranch.toUpperCase()} | ${new Date(startDate).toLocaleDateString('id-ID')} - ${new Date(endDate).toLocaleDateString('id-ID')}`, pageW - 14, 13, { align: 'right' });
            }
        };

        renderHeader();

        // — Meta info box (Only on first page)
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(9);
        const periodText = mode === 'syahriyah' ? `Unit: ${displayBranch}` : `Periode: ${new Date(startDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })} – ${new Date(endDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`;
        const printedText = `Dicetak: ${new Date().toLocaleString('id-ID')}`;
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 36, pageW - 28, 12, 3, 3, 'F');
        doc.text(periodText, 19, 43);
        doc.text(printedText, pageW - 19, 43, { align: 'right' });

        // — Watermark Logo
        if (settings.appLogoUrl) {
            try {
                const opacity = 0.1;
                const imgW = 80;
                const imgH = 80;
                const x = (pageW - imgW) / 2;
                const y = (pageH - imgH) / 2;
                // @ts-ignore
                doc.saveGraphicsState();
                // @ts-ignore
                doc.setGState(new (doc as any).GState({ opacity }));
                doc.addImage(settings.appLogoUrl, 'JPEG', x, y, imgW, imgH, undefined, 'FAST');
                // @ts-ignore
                doc.restoreGraphicsState();
            } catch (e) {}
        }

        // — Data Rendering
        if (mode === 'summary') {
            const summaryData = getBranchSummary(filtered);
            autoTable(doc, {
                startY: 52,
                head: [['No', 'Nama unit', 'Pemasukan', 'Pengeluaran', 'Saldo Bersih']],
                body: summaryData.map((s, i) => [i + 1, s.name, 'Rp' + s.income.toLocaleString('id-ID'), 'Rp' + s.expense.toLocaleString('id-ID'), 'Rp' + s.balance.toLocaleString('id-ID')]),
                theme: 'striped',
                headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
                columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' } },
            });
        } else if (mode === 'syahriyah') {
            const rows = students.map((s, i) => {
                const rowData: any[] = [i + 1, s.name];
                months.forEach((_, mIdx) => {
                    const p = transactions.find(t => {
                        const date = new Date(t.date);
                        const isCorrectPeriod = t.description.includes(months[mIdx]) && date.getFullYear() === selectedYear;
                        if (t.item === s.id) return isCorrectPeriod;
                        return isCorrectPeriod && t.description.includes(s.name);
                    });
                    rowData.push(p ? p.amount.toLocaleString('id-ID') : '-');
                });
                return rowData;
            });
            autoTable(doc, {
                startY: 52,
                head: [['No', 'Nama Santri', ...months.map(m => m.substring(0, 3))]],
                body: rows,
                theme: 'grid',
                headStyles: { fillColor: [16, 185, 129], fontSize: 8 },
                bodyStyles: { fontSize: 7 },
                didDrawCell: (data) => {
                    if (data.column.index > 1 && data.section === 'body' && data.cell.text[0] !== '-') {
                        doc.setTextColor(16, 185, 129);
                        doc.setFont('helvetica', 'bold');
                    }
                }
            });
        } else {
            autoTable(doc, {
                startY: 52,
                head: [['No', 'Tanggal', 'Deskripsi', 'Kategori', 'Tipe', 'Jumlah (Rp)']],
                body: filtered.map((t, i) => [i + 1, new Date(t.date).toLocaleDateString('id-ID'), t.description, t.category, t.type === TransactionType.Income ? 'Masuk' : 'Keluar', (t.type === TransactionType.Income ? '+' : '-') + 'Rp' + t.amount.toLocaleString('id-ID')]),
                theme: 'striped',
                headStyles: { fillColor: [16, 185, 129] },
                columnStyles: { 5: { halign: 'right', fontStyle: 'bold' } },
                didDrawCell: (data) => {
                    if (data.column.index === 5 && data.section === 'body') {
                        const txt = data.cell.text[0] || '';
                        doc.setTextColor(txt.startsWith('+') ? 16 : 239, txt.startsWith('+') ? 185 : 68, txt.startsWith('+') ? 129 : 68);
                    }
                },
            });
        }

        // — Summary & Signatures
        if (mode !== 'syahriyah') {
            const openingBalance = getOpeningBalance();
            const totalIncome = filtered.filter(t => t.type === TransactionType.Income).reduce((s, t) => s + t.amount, 0);
            const totalExpense = filtered.filter(t => t.type === TransactionType.Expense).reduce((s, t) => s + t.amount, 0);
            const finalBalance = openingBalance + (totalIncome - totalExpense);
            const lastY = (doc as any).lastAutoTable.finalY || 52;
            const finalY = lastY + 8;
            const sumX = pageW - 85;

            doc.setFillColor(248, 250, 252);
            doc.roundedRect(sumX - 4, finalY - 4, 75, 38, 3, 3, 'F');
            doc.setFontSize(9);
            doc.setTextColor(71, 85, 105);
            doc.text('Saldo Awal:', sumX, finalY + 3);
            doc.setTextColor(30, 41, 59);
            doc.text('Rp' + openingBalance.toLocaleString('id-ID'), pageW - 18, finalY + 3, { align: 'right' });
            
            doc.setTextColor(71, 85, 105);
            doc.text('Total Masuk:', sumX, finalY + 10);
            doc.setTextColor(16, 185, 129);
            doc.text('Rp' + totalIncome.toLocaleString('id-ID'), pageW - 18, finalY + 10, { align: 'right' });

            doc.setTextColor(71, 85, 105);
            doc.text('Total Keluar:', sumX, finalY + 17);
            doc.setTextColor(239, 68, 68);
            doc.text('Rp' + totalExpense.toLocaleString('id-ID'), pageW - 18, finalY + 17, { align: 'right' });

            doc.setFont('helvetica', 'bold');
            doc.text('SALDO AKHIR:', sumX, finalY + 28);
            doc.setTextColor(finalBalance >= 0 ? 16 : 239, finalBalance >= 0 ? 185 : 68, finalBalance >= 0 ? 129 : 68);
            doc.text('Rp' + finalBalance.toLocaleString('id-ID'), pageW - 18, finalY + 28, { align: 'right' });

            const sigY = finalY + 50;
            const col1 = 30;
            const col2 = pageW - 30;
            doc.setTextColor(30, 41, 59);

            if (mode === 'summary') {
                doc.text('Bendahara PPHQ,', col1, sigY);
                doc.line(col1, sigY + 18, col1 + 50, sigY + 18);
                doc.text('Ibu Nyai H. Nur Kholidah', col1, sigY + 23);
                doc.text('Pengasuh PPHQ,', col2, sigY, { align: 'right' });
                doc.line(col2 - 50, sigY + 18, col2, sigY + 18);
                doc.text('KH. Ainul Yakin, SQ', col2, sigY + 23, { align: 'right' });
            } else {
                doc.text('Pimpinan Unit,', col1, sigY);
                doc.line(col1, sigY + 18, col1 + 50, sigY + 18);
                doc.text(currentUser?.unitHeadName || '( ............................ )', col1, sigY + 23);
                doc.text('Bendahara Unit,', col2, sigY, { align: 'right' });
                doc.line(col2 - 50, sigY + 18, col2, sigY + 18);
                doc.text(currentUser?.unitTreasurerName || '( ............................ )', col2, sigY + 23, { align: 'right' });

                const sigY2 = sigY + 40;
                doc.text('Pengasuh PPHQ,', col1, sigY2);
                doc.line(col1, sigY2 + 18, col1 + 50, sigY2 + 18);
                doc.text('KH. Ainul Yakin, SQ', col1, sigY2 + 23);
                doc.text('Bendahara PPHQ,', col2, sigY2, { align: 'right' });
                doc.line(col2 - 50, sigY2 + 18, col2, sigY2 + 18);
                doc.text('Ibu Nyai H. Nur Kholidah', col2, sigY2 + 23, { align: 'right' });
            }
        } else {
            const lastY = (doc as any).lastAutoTable.finalY || 52;
            const sigY = lastY + 25;
            const col1 = 30;
            const col2 = pageW - 30;
            doc.setFont('helvetica', 'bold');
            doc.text('Pimpinan Unit,', col1, sigY);
            doc.line(col1, sigY + 18, col1 + 50, sigY + 18);
            doc.text(currentUser?.unitHeadName || '( ............................ )', col1, sigY + 23);
            doc.text('Bendahara Unit,', col2, sigY, { align: 'right' });
            doc.line(col2 - 50, sigY + 18, col2, sigY + 18);
            doc.text(currentUser?.unitTreasurerName || '( ............................ )', col2, sigY + 23, { align: 'right' });
        }

        // — Appendix Section (Notas)
        if (mode === 'detailed') {
            const transactionsWithPhotos = filtered
                .map((t, index) => ({ ...t, originalIndex: index + 1 }))
                .filter(t => t.attachmentUrl);

            const incomePhotos = transactionsWithPhotos.filter(t => t.type === TransactionType.Income);
            const expensePhotos = transactionsWithPhotos.filter(t => t.type === TransactionType.Expense);

            const renderPhotos = async (photos: any[], sectionTitle: string) => {
                if (photos.length === 0) return;

                let currentY = 30;
                let col = 0;
                const margin = 14;
                const gap = 10;
                const photoW = (pageW - (margin * 2) - gap) / 2;
                const photoH = 75; // Fixed area height

                doc.addPage();
                renderHeader(true, sectionTitle);

                for (const t of photos) {
                    if (currentY + photoH + 20 > pageH) {
                        doc.addPage();
                        renderHeader(true, sectionTitle);
                        currentY = 30;
                        col = 0;
                    }

                    const xPos = margin + (col * (photoW + gap));
                    
                    // Label
                    doc.setFillColor(t.type === TransactionType.Income ? 16 : 239, t.type === TransactionType.Income ? 185 : 68, t.type === TransactionType.Income ? 129 : 68);
                    doc.roundedRect(xPos, currentY, 35, 7, 2, 2, 'F');
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8);
                    doc.setTextColor(255, 255, 255);
                    doc.text(`NOTA NO. ${t.originalIndex}`, xPos + 17.5, currentY + 5, { align: 'center' });

                    // Internal Link to first page
                    doc.link(xPos, currentY, 35, 7, { pageNumber: 1 });

                    // Image Smart Scaling
                    try {
                        const dims = await getImageDimensions(t.attachmentUrl);
                        const ratio = dims.w / dims.h;
                        
                        let drawW = photoW;
                        let drawH = photoW / ratio;
                        
                        if (drawH > photoH) {
                            drawH = photoH;
                            drawW = photoH * ratio;
                        }
                        
                        const xOffset = (photoW - drawW) / 2;
                        const yOffset = (photoH - drawH) / 2;
                        
                        doc.addImage(t.attachmentUrl, 'JPEG', xPos + xOffset, currentY + 10 + yOffset, drawW, drawH, undefined, 'FAST');
                    } catch (e) {
                        doc.setFontSize(8);
                        doc.setTextColor(150, 150, 150);
                        doc.text("[Gagal memuat gambar]", xPos + photoW/2, currentY + 10 + photoH/2, { align: 'center' });
                    }

                    if (col === 1) {
                        col = 0;
                        currentY += photoH + 25;
                    } else {
                        col = 1;
                    }
                }
            };

            await renderPhotos(incomePhotos, "LAMPIRAN NOTA PEMASUKAN");
            await renderPhotos(expensePhotos, "LAMPIRAN NOTA PENGELUARAN");
        }

        // — Footer
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('Dokumen ini dihasilkan otomatis oleh Sistem Keuangan PPHQ', pageW / 2, pageH - 10, { align: 'center' });

        if (action === 'download') {
            const filename = `${mode === 'syahriyah' ? 'Infaq_Bulanan' : mode === 'summary' ? 'Summary' : 'E-Statement'}_${displayBranch.replace(/\s/g, '_')}_${mode === 'syahriyah' ? selectedYear : startDate + '_sd_' + endDate}.pdf`;
            doc.save(filename);
        } else {
            doc.autoPrint();
            window.open(doc.output('bloburl'), '_blank');
        }
        onClose();
    };

    const handleDownloadPDF = () => handleExportPDF('download');
    const handlePrint = () => handleExportPDF('print');

    const handleExportCSV = () => {
        const filtered = getFiltered();
        if (filtered.length === 0) { showAlert("Data Kosong", 'Tidak ada data pada rentang tanggal tersebut.', "info"); return; }

        const openingBalance = getOpeningBalance();
        const totalIncome = filtered.filter(t => t.type === TransactionType.Income).reduce((s, t) => s + t.amount, 0);
        const totalExpense = filtered.filter(t => t.type === TransactionType.Expense).reduce((s, t) => s + t.amount, 0);
        const finalBalance = openingBalance + (totalIncome - totalExpense);

        let csv = '';
        const months = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];

        if (mode === 'summary') {
            const summary = getBranchSummary(filtered);
            csv = [
                `"E-STATEMENT PPHQ FINANCE - LAPORAN RINGKASAN UNIT"`,
                `"Periode: ${startDate} s/d ${endDate}"`,
                `"Dicetak: ${new Date().toLocaleString('id-ID')}"`,
                '',
                ['"No"', '"Nama unit"', '"Pemasukan"', '"Pengeluaran"', '"Saldo Bersih"'].join(','),
                ...summary.map((s, i) => [i + 1, `"${s.name}"`, s.income, s.expense, s.balance].join(',')),
                '',
                ['', '', '"TOTAL PEMASUKAN"', '"TOTAL PENGELUARAN"', '"SALDO BERSIH"'].join(','),
                ['', '', totalIncome, totalExpense, totalIncome - totalExpense].join(','),
            ].join('\n');
        } else if (mode === 'syahriyah') {
            csv = [
                `\"LAPORAN INFAQ BULANAN PPHQ - ${displayBranch.toUpperCase()}\"`,
                `"Tahun Buku: ${selectedYear}"`,
                `"Dicetak: ${new Date().toLocaleString('id-ID')}"`,
                '',
                ['"No"', '"Nama Santri"', ...months.map(m => `"${m}"`)].join(','),
                ...students.map((s, i) => {
                    const row = [i + 1, `"${s.name}"`];
                    months.forEach((_, mIdx) => {
                        const p = transactions.find(t => {
                            const date = new Date(t.date);
                            const isCorrectPeriod = t.description.includes(months[mIdx]) && date.getFullYear() === selectedYear;
                            if (t.item === s.id) return isCorrectPeriod;
                            return isCorrectPeriod && t.description.includes(s.name);
                        });
                        row.push(p ? `"Rp${p.amount.toLocaleString('id-ID')}"` : '"-"');
                    });
                    return row.join(',');
                })
            ].join('\n');
        } else {
            csv = [
                `"E-STATEMENT PPHQ FINANCE - ${displayBranch.toUpperCase()}"`,
                `"Periode: ${startDate} s/d ${endDate}"`,
                `"Dicetak: ${new Date().toLocaleString('id-ID')}"`,
                '',
                ['"No"', '"Tanggal"', '"Deskripsi"', '"Kategori"', '"Tipe"', '"Jumlah (Rp)"'].join(','),
                ...filtered.map((t, i) => [i + 1, `"${new Date(t.date).toLocaleDateString('id-ID')}"`, `"${t.description}"`, `"${t.category}"`, `"${t.type === TransactionType.Income ? 'Masuk' : 'Keluar'}"`, `"Rp${t.amount.toLocaleString('id-ID')}"`].join(',')),
                '',
                ['', '', '', '', '"SALDO AWAL (SEBELUMNYA)"', `"Rp${openingBalance.toLocaleString('id-ID')}"`].join(','),
                ['', '', '', '', '"TOTAL PEMASUKAN PERIODE"', `"Rp${totalIncome.toLocaleString('id-ID')}"`].join(','),
                ['', '', '', '', '"TOTAL PENGELUARAN PERIODE"', `"Rp${totalExpense.toLocaleString('id-ID')}"`].join(','),
                ['', '', '', '', '"SALDO AKHIR"', `"Rp${finalBalance.toLocaleString('id-ID')}"`].join(','),
            ].join('\n');
        }

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${mode === 'syahriyah' ? 'Infaq_Bulanan' : mode === 'summary' ? 'Summary' : 'E-Statement'}_${displayBranch.replace(/\s/g, '_')}_${mode === 'syahriyah' ? selectedYear : startDate + '_sd_' + endDate}.csv`;
        link.click();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
            <div className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-300">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 bg-emerald-50 rounded-xl">
                        <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 leading-none">{title}</h2>
                        <p className="text-emerald-600 text-xs font-bold mt-1">{mode === 'summary' ? 'Ringkasan semua unit' : displayBranch}</p>
                    </div>
                </div>
                <p className="text-slate-400 text-sm mb-8 ml-1">
                    {mode === 'summary' ? 'Export ringkasan pemasukan/pengeluaran tiap cabang.' : 'Pilih rentang tanggal untuk mengekspor laporan e-statement.'}
                </p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Dari Tanggal</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-2 w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-700" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Sampai Tanggal</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-2 w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-700" />
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <button onClick={handleDownloadPDF} className="w-full py-3.5 bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2.5">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                        Download PDF
                    </button>
                    <button onClick={handlePrint} className="w-full py-3.5 bg-slate-700 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2.5">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        Cetak
                    </button>
                    <button onClick={handleExportCSV} className="w-full py-3.5 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2.5">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Download CSV / Excel
                    </button>
                    <button onClick={onClose} className="mt-1 py-2 text-slate-400 font-bold text-sm hover:text-slate-600 transition-all">Batal</button>
                </div>
            </div>
        </div>
    );
};

export default ExportModal;
