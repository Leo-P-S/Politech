import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ShieldAlert, Info, Bell, BellOff, Loader2 } from 'lucide-react';

const ProfileHeader = ({ candidato }) => {
  const [isElector, setIsElector] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token && role === 'elector') {
      setIsElector(true);
    }
  }, []);

  // Generar alertas rápidas automáticas en base a los antecedentes judiciales (UH13)
  const alertas = candidato.antecedentesJudiciales?.map(msg => ({
    nivel: msg.toLowerCase().includes('corrupción') || msg.toLowerCase().includes('graves') || msg.toLowerCase().includes('alto')
      ? 'Alto' 
      : 'Medio',
    mensaje: msg
  })) || [];

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/elector/alerts/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ candidatoId: candidato._id })
      });
      if (!res.ok) throw new Error('Error al suscribirse');
      return res.json();
    },
    onSuccess: () => {
      setSubscribed(true);
    }
  });

  return (
    <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-sm mb-8">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6 justify-between">
        
        {/* Info del Candidato */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Foto del Candidato */}
          <div className="flex-shrink-0">
            <img 
              src={candidato.fotoUrl || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80'} 
              alt={`Foto de ${candidato.nombre}`} 
              className="w-32 h-32 rounded-lg object-cover border border-slate-200"
            />
          </div>
          
          {/* Información Básica */}
          <div className="flex-1">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">Candidato</span>
              <h1 className="text-3xl font-bold text-slate-900">{candidato.nombre}</h1>
              <p className="text-lg font-medium text-blue-700">{candidato.partidoPolitico || 'Sin Partido'}</p>
            </div>
            
            {/* Tags / Alertas Rápidas */}
            <div className="flex flex-wrap gap-2 mt-4">
              {alertas.length > 0 ? (
                alertas.map((alerta, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border ${
                      alerta.nivel === 'Alto' 
                        ? 'bg-red-50 text-red-700 border-red-200' 
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {alerta.nivel === 'Alto' ? <ShieldAlert className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                    <span>{alerta.mensaje}</span>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
                  <Info className="w-4 h-4" />
                  <span>Sin antecedentes registrados</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Suscripción a Alertas (Elector) */}
        {isElector && (
          <div className="w-full md:w-auto mt-4 md:mt-0">
            <button
              onClick={() => subscribeMutation.mutate()}
              disabled={subscribed || subscribeMutation.isPending}
              className={`w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all border shadow-sm ${
                subscribed 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 cursor-default'
                  : 'bg-blue-700 hover:bg-blue-800 text-white border-transparent'
              }`}
            >
              {subscribeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : subscribed ? (
                <>
                  <BellOff className="h-4 w-4" />
                  <span>Suscrito a Alertas</span>
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4" />
                  <span>Recibir Alertas</span>
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default ProfileHeader;
