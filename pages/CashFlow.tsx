import React, { useMemo } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { Transaction, TransactionType, TransactionNature } from '../types';

const CashFlow = () => {
    const { transactions } = useAppContext();

    const monthlySummary = useMemo(() => {
        const summary: { [key: string]: { income: number, expense: number, balance: number } } = {};
        
        const monthMap: { [key: string]: number } = {
            'Januari': 0, 'Februari': 1, 'Maret': 2, 'April': 3, 'Mei': 4, 'Juni': 5,
            'Juli': 6, 'Agustus': 7, 'September': 8, 'Oktober': 9, 'November': 10, 'Desember': 11
        };

        transactions
            .filter(t => t.nature === TransactionNature.Money)
            .forEach(t => {
                const date = new Date(t.date);
                const monthYear = date.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
                if (!summary[monthYear]) {
                    summary[monthYear] = { income: 0, expense: 0, balance: 0 };
                }
                if (t.type === TransactionType.Income) {
                    summary[monthYear].income += t.amount;
                } else {
                    summary[monthYear].expense += t.amount;
                }
                summary[monthYear].balance = summary[monthYear].income - summary[monthYear].expense;
            });

        return Object.entries(summary).sort(([a], [b]) => {
            const [monthA, yearA] = a.split(' ');
            const [monthB, yearB] = b.split(' ');

            const dateA = new Date(Number(yearA), monthMap[monthA]);
            const dateB = new Date(Number(yearB), monthMap[monthB]);

            return dateB.getTime() - dateA.getTime();
        });
    }, [transactions]);
    
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-text-primary">Ringkasan Arus Kas</h1>
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
                <h2 className="text-xl font-semibold text-text-primary mb-4">Ringkasan Bulanan</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-text-secondary">
                        <thead className="text-xs text-text-secondary uppercase bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Bulan</th>
                                <th scope="col" className="px-6 py-3 text-right">Total Pemasukan</th>
                                <th scope="col" className="px-6 py-3 text-right">Total Pengeluaran</th>
                                <th scope="col" className="px-6 py-3 text-right">Saldo Bersih</th>
                            </tr>
                        </thead>
                        <tbody>
                            {monthlySummary.map(([monthYear, data]) => (
                                <tr key={monthYear} className="bg-white border-b border-border hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-text-primary">{monthYear}</td>
                                    <td className="px-6 py-4 text-right text-green-600 font-semibold">Rp{data.income.toLocaleString('id-ID')}</td>
                                    <td className="px-6 py-4 text-right text-red-600 font-semibold">Rp{data.expense.toLocaleString('id-ID')}</td>
                                    <td className={`px-6 py-4 text-right font-bold ${data.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                        Rp{data.balance.toLocaleString('id-ID')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CashFlow;