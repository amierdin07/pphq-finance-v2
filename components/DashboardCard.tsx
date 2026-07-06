import React from 'react';

interface DashboardCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconColorClass: string;
  subtitle?: string;
  isFeatured?: boolean;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, icon, iconColorClass, subtitle, isFeatured }) => {
  if (isFeatured) {
    return (
      <div className="bg-emerald-500 p-6 rounded-2xl border border-emerald-600 shadow-lg shadow-emerald-500/20 flex items-start gap-4 hover:shadow-xl hover:bg-emerald-600 transition-all duration-300">
        <div className="p-3 rounded-xl bg-white/20 text-white flex-shrink-0">
          {icon}
        </div>
        <div className="flex flex-col">
          <p className="text-xs font-bold text-emerald-100 uppercase tracking-widest mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          <div className="mt-2 flex items-center gap-1">
              <span className="text-[10px] text-emerald-100 font-medium">{subtitle}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4 hover:shadow-md transition-all duration-300">
      <div className={`p-3 rounded-xl ${iconColorClass} flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex flex-col">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <div className="mt-2 flex items-center gap-1">
            <span className="text-[10px] text-slate-400 font-medium">{subtitle || 'Bulan ini'}</span>
        </div>
      </div>
    </div>
  );
};

export default DashboardCard;
