import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Transaction, TransactionType, Branch, TransactionNature } from '../../types';

interface ChartProps {
  transactions: Transaction[];
  branches: Branch[];
}

const BranchComparisonChart: React.FC<ChartProps> = ({ transactions, branches }) => {
  const chartData = useMemo(() => {
    const branchStats: Record<string, { name: string; net: number; income: number; expense: number }> = {};
    
    // Initialize with all branches
    branches.forEach(b => {
        branchStats[b.id] = { name: b.name, net: 0, income: 0, expense: 0 };
    });

    transactions
      .filter(t => t.nature === TransactionNature.Money)
      .forEach(t => {
        if (branchStats[t.branchId]) {
          if (t.type === TransactionType.Income) {
              branchStats[t.branchId].income += t.amount;
              branchStats[t.branchId].net += t.amount;
          } else {
              branchStats[t.branchId].expense += t.amount;
              branchStats[t.branchId].net -= t.amount;
          }
        }
      });

    return Object.values(branchStats).sort((a, b) => b.net - a.net);
  }, [transactions, branches]);

  return (
    <div className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
        <XAxis type="number" hide />
        <YAxis 
          dataKey="name" 
          type="category" 
          tick={{ fill: '#64748B', fontSize: 9, fontWeight: 'bold' }} 
          axisLine={false} 
          tickLine={false}
          width={90}
        />
        <Tooltip 
          cursor={{fill: 'rgba(226, 232, 240, 0.4)'}}
          contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
          formatter={(value: number) => `Rp${value.toLocaleString('id-ID')}`}
        />
        <Bar dataKey="net" name="Saldo Bersih" radius={[0, 4, 4, 0]} barSize={14}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.net >= 0 ? '#10B981' : '#EF4444'} />
          ))}
        </Bar>
      </BarChart>
        </ResponsiveContainer>
    </div>
  );
};

export default BranchComparisonChart;
