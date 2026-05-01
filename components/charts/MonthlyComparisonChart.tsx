import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Transaction, TransactionType, TransactionNature } from '../../types';

interface ChartProps {
  transactions: Transaction[];
}

const MonthlyComparisonChart: React.FC<ChartProps> = ({ transactions }) => {
  const chartData = useMemo(() => {
    const monthlyData: { [key: string]: { name: string; income: number; expense: number } } = {};

    transactions
      .filter(t => t.nature === TransactionNature.Money)
      .forEach(t => {
        const month = new Date(t.date).toLocaleString('default', { month: 'short' });
        if (!monthlyData[month]) {
          monthlyData[month] = { name: month, income: 0, expense: 0 };
        }
        if (t.type === TransactionType.Income) {
          monthlyData[month].income += t.amount;
        } else {
          monthlyData[month].expense += t.amount;
        }
      });

    const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    return Object.values(monthlyData).sort((a, b) => monthOrder.indexOf(a.name) - monthOrder.indexOf(b.name));
  }, [transactions]);

  return (
    <div className="bg-card p-6 rounded-xl border border-border h-96">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Pemasukan vs Pengeluaran</h3>
        <ResponsiveContainer width="100%" height="90%">
            <BarChart
                data={chartData}
                margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={(value) => `Rp${Number(value) / 1000}k`} tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false}/>
                <Tooltip 
                    cursor={{fill: 'rgba(22, 163, 74, 0.1)'}}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: number) => `Rp${value.toLocaleString('id-ID')}`}
                />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="income" fill="#22C55E" name="Pemasukan" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#EF4444" name="Pengeluaran" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    </div>
  );
};

export default MonthlyComparisonChart;