import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Newspaper, FileText, Users, Bell, BellOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ProfileHeader = ({ candidato }) => {
  const [isElector, setIsElector] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [imageError, setImageError] = useState(false);

  const { user, role } = useAuth();
  const initials = candidato.nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();

  useEffect(() => {
    setImageError(false);
  }, [candidato.fotoUrl]);

  useEffect(() => {
    if (user && role === 'elector') {
      setIsElector(true);
      
      // Consultar estado de suscripción inicial
      fetch(`/api/elector/alerts/status/${candidato._id}`, {
        credentials: 'include'
      })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setSubscribed(data.subscribed);
      })
      .catch(err => console.error("Error al verificar suscripcion:", err));
    }
  }, [user, role, candidato._id]);

  const profileStats = [
    {
      label: 'Noticias analizadas',
      value: candidato.historial_noticias?.length || 0,
      icon: Newspaper
    },
    {
      label: 'Propuestas',
      value: candidato.propuestas?.length || 0,
      icon: FileText
    },
    {
      label: 'Equipo identificado',
      value: candidato.equipoTrabajo?.length || 0,
      icon: Users
    }
  ];

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/elector/alerts/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ candidatoId: candidato._id })
      });
      if (!res.ok) throw new Error('Error al suscribirse');
      return res.json();
    },
    onSuccess: () => {
      setSubscribed(true);
    }
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/elector/alerts/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ candidatoId: candidato._id })
      });
      if (!res.ok) throw new Error('Error al desuscribirse');
      return res.json();
    },
    onSuccess: () => {
      setSubscribed(false);
    }
  });

  const handleAlertClick = () => {
    if (subscribed) {
      unsubscribeMutation.mutate();
    } else {
      subscribeMutation.mutate();
    }
  };

  return (
    <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-sm mb-8">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6 justify-between">
        
        {/* Info del Candidato */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Foto del Candidato */}
          <div className="flex-shrink-0">
            {candidato.fotoUrl && !imageError ? (
              <img
                src={candidato.fotoUrl}
                alt={`Foto de ${candidato.nombre}`}
                onError={() => setImageError(true)}
                className="w-32 h-32 rounded-xl object-cover border border-slate-200 bg-slate-100"
              />
            ) : (
              <div
                role="img"
                aria-label={`Avatar de ${candidato.nombre}`}
                className="flex w-32 h-32 items-center justify-center rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-slate-100 text-3xl font-bold tracking-tight text-blue-800"
              >
                {initials || 'C'}
              </div>
            )}
          </div>
          
          {/* Información Básica */}
          <div className="flex-1">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">Candidato</span>
              <h1 className="text-3xl font-bold text-slate-900">{candidato.nombre}</h1>
              <p className="text-lg font-medium text-blue-700">{candidato.partidoPolitico || 'Sin Partido'}</p>
            </div>
            
            {/* Resumen de cobertura del perfil */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-5">
              {profileStats.map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-blue-700 shadow-sm">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-base font-bold leading-none text-slate-900">{value}</div>
                    <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {isElector && (
          <div className="w-full md:w-auto mt-4 md:mt-0">
            <button
              onClick={handleAlertClick}
              disabled={subscribeMutation.isPending || unsubscribeMutation.isPending}
              className={`w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all border shadow-sm ${
                subscribed 
                  ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                  : 'bg-blue-700 hover:bg-blue-800 text-white border-transparent'
              }`}
            >
              {subscribeMutation.isPending || unsubscribeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : subscribed ? (
                <>
                  <BellOff className="h-4 w-4" />
                  <span>Cancelar Alertas</span>
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
