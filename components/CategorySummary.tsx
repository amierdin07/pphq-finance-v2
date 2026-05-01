import React, { useMemo } from 'react';
import { Transaction, TransactionNature, TransactionType } from '../types';
import { IncomeIcon, ExpenseIcon } from '../constants';

interface CategorySummaryProps {
    transactions: Transaction[];
}

const formatCurrency = (value: number) => {
    return value.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });
};

const CategorySummary: React.FC<CategorySummaryProps> = ({ transactions }) => {
    const { incomeData, expenseData, totalIncome, totalExpense } = useMemo(() => {
        const incomeSummary: { [key: string]: { total: number; count: number } } = {};
        const expenseSummary: { [key: string]: { total: number; count: number } } = {};
        let totalIncome = 0;
        let totalExpense = 0;

        transactions
            .filter(t => t.nature === TransactionNature.Money)
            .forEach(t => {
                if (t.type === TransactionType.Income) {
                    if (!incomeSummary[t.category]) {
                        incomeSummary[t.category] = { total: 0, count: 0 };
                    }
                    incomeSummary[t.category].total += t.amount;
                    incomeSummary[t.category].count++;
                    totalIncome += t.amount;
                } else {
                    if (!expenseSummary[t.category]) {
                        expenseSummary[t.category] = { total: 0, count: 0 };
                    }
                    expenseSummary[t.category].total += t.amount;
                    expenseSummary[t.category].count++;
                    totalExpense += t.amount;
                }
            });

        const incomeData = Object.entries(incomeSummary)
            .map(([category, data]) => ({ category, ...data }))
            .sort((a, b) => b.total - a.total);
            
        const expenseData = Object.entries(expenseSummary)
            .map(([category, data]) => ({ category, ...data }))
            .sort((a, b) => b.total - a.total);

        return { incomeData, expenseData, totalIncome, totalExpense };
    }, [transactions]);
    
    const renderSummaryList = (data: typeof incomeData, total: number, type: TransactionType) => {
        if (data.length === 0) {
            return <p className="text-sm text-text-secondary text-center py-8">Tidak ada data {type === TransactionType.Income ? 'pemasukan' : 'pengeluaran'}.</p>;
        }

        return (
            <div className="space-y-4">
                {data.map(item => {
                    const percentage = total > 0 ? (item.total / total) * 100 : 0;
                    return (
                        <div key={item.category}>
                            <div className="flex justify-between items-center mb-1 text-sm">
                                <span className="font-medium text-text-primary">{item.category}</span>
                                <span className="font-semibold">{formatCurrency(item.total)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-text-secondary">
                                <span>{item.count} transaksi</span>
                                <span>{percentage.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1.5">
                                <div
                                    className={`${type === TransactionType.Income ? 'bg-green-500' : 'bg-red-500'} h-1.5 rounded-full`}
                                    style={{ width: `${percentage}%` }}
                                ></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div>
            <h2 className="text-xl font-bold text-text-primary mb-4">Ringkasan per Kategori</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Income Summary Card */}
                <div className="bg-card p-4 sm:p-6 rounded-xl border border-border shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-green-100 rounded-full">
                            <IncomeIcon className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-text-primary">Pemasukan</h3>
                            <p className="text-xs text-text-secondary">Total: {formatCurrency(totalIncome)}</p>
                        </div>
                    </div>
                    {renderSummaryList(incomeData, totalIncome, TransactionType.Income)}
                </div>

                {/* Expense Summary Card */}
                <div className="bg-card p-4 sm:p-6 rounded-xl border border-border shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-red-100 rounded-full">
                            <ExpenseIcon className="w-5 h-5 text-red-600" />
                        </div>
                         <div>
                            <h3 className="font-semibold text-text-primary">Pengeluaran</h3>
                            <p className="text-xs text-text-secondary">Total: {formatCurrency(totalExpense)}</p>
                        </div>
                    </div>
                    {renderSummaryList(expenseData, totalExpense, TransactionType.Expense)}
                </div>
            </div>
        </div>
    );
};

export default CategorySummary;