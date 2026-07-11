import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

export const TrendsChart = ({ trendsData }) => {
  if (!trendsData || !trendsData.interestOverTime || trendsData.interestOverTime.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
        <p className="text-slate-500">No hay datos de tendencias suficientes para mostrar.</p>
      </div>
    );
  }

  const data = trendsData.interestOverTime.map(item => ({
    name: new Date(item.date).toLocaleDateString('es-PE', { month: 'short', year: 'numeric' }),
    Interés: item.value
  }));

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-2">Evolución del Interés de Búsqueda (2026)</h3>
        <p className="text-sm text-slate-500 mb-6">
          Muestra el interés de búsqueda relativo sobre el candidato a lo largo del tiempo.
        </p>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: '#3b82f6', fontWeight: 600 }}
              />
              <Area 
                type="monotone" 
                dataKey="Interés" 
                stroke="#3b82f6" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorInterest)" 
                activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {trendsData.relatedQueries && trendsData.relatedQueries.length > 0 && (
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
          <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span className="text-blue-600">↗</span> Consultas Relacionadas en Ascenso
          </h4>
          <div className="flex flex-wrap gap-2">
            {trendsData.relatedQueries.map((query, idx) => (
              <span key={idx} className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-700 shadow-sm">
                {query}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
