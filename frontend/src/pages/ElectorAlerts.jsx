import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert, Info, ArrowLeft, Loader2, Bell } from 'lucide-react';

const ElectorAlerts = () => {
  const navigate = useNavigate();

  // Validar rol del elector
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || role !== 'elector') {
      navigate('/login');
    }
  }, [navigate]);

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['elector-alerts'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/elector/alerts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al cargar alertas');
      return res.json();
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Navigation */}
        <div className="mb-6 flex justify-between items-center">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Búsqueda</span>
          </Link>
          <div className="flex items-center gap-1.5 text-blue-700 bg-blue-50 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
            <Bell className="h-4.5 w-4.5" />
            <span>Suscrito a Alertas</span>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Mis Alertas de Candidatos</h1>
          <p className="text-slate-600">Monitorea en tiempo real los antecedentes, riesgos o anomalías detectadas en tus candidatos suscritos.</p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-blue-700 animate-spin" />
            <p className="mt-4 text-slate-500 font-medium">Buscando alertas de tus candidatos...</p>
          </div>
        ) : alerts && alerts.length > 0 ? (
          <div className="space-y-4">
            {alerts.map((alerta, index) => (
              <div 
                key={index} 
                className={`p-6 border rounded-xl shadow-sm bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-md ${
                  alerta.nivel === 'Alto' ? 'border-red-200 hover:border-red-300' : 'border-amber-200 hover:border-amber-300'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{alerta.nombreCandidato}</span>
                    <span 
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        alerta.nivel === 'Alto' 
                          ? 'bg-red-50 text-red-700 border-red-100' 
                          : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}
                    >
                      Nivel {alerta.nivel}
                    </span>
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed">{alerta.mensaje}</p>
                </div>
                
                <div className="flex-shrink-0">
                  <Link 
                    to={`/candidato/${alerta.candidatoId}`} 
                    className="inline-flex items-center justify-center px-4 py-2 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-sm transition-all"
                  >
                    Ver Perfil Completo
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm space-y-4">
            <div className="flex justify-center">
              <div className="bg-slate-100 p-4 rounded-full text-slate-400">
                <Info className="h-8 w-8" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Sin Alertas</h3>
            <p className="text-slate-600 max-w-sm mx-auto">No hay alertas disponibles para tus candidatos o no te has suscrito a ningún candidato todavía.</p>
            <Link 
              to="/" 
              className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg text-sm transition-colors"
            >
              Buscar Candidatos
            </Link>
          </div>
        )}

      </div>
    </div>
  );
};

export default ElectorAlerts;
