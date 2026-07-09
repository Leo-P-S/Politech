import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Calendar, Terminal, Settings, LogOut, Loader2, Info, CheckCircle2 } from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logContainerRef = useRef(null);

  // Estados locales para los formularios
  const [candidateId, setCandidateId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [useRSS, setUseRSS] = useState(true);
  const [useGdelt, setUseGdelt] = useState(false);
  const [useNewsApi, setUseNewsApi] = useState(false);
  const [mockMode, setMockMode] = useState(true);
  const [maxArticles, setMaxArticles] = useState(50);
  const [logs, setLogs] = useState([]);
  
  // Estados para el Cron
  const [cronDay, setCronDay] = useState(0);
  const [cronHour, setCronHour] = useState(3);
  const [cronStatus, setCronStatus] = useState('');

  // Verificar sesión
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || role !== 'admin') {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // Obtener candidatos para el dropdown
  const { data: candidatos, isLoading: loadingCandidatos } = useQuery({
    queryKey: ['candidatos-admin'],
    queryFn: async () => {
      const res = await fetch('/api/candidatos');
      if (!res.ok) throw new Error('Error al cargar candidatos');
      return res.json();
    }
  });

  // Obtener configuración del cron
  const { data: cronConfig } = useQuery({
    queryKey: ['cron-config'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/config/ai-schedule', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al cargar config cron');
      return res.json();
    },
    onSuccess: (data) => {
      setCronDay(data.day);
      setCronHour(data.hour);
    }
  });

  // Mutación para disparar scraping manual
  const triggerScrapeMutation = useMutation({
    mutationFn: async (body) => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al disparar scraper');
      }
      return res.json();
    }
  });

  // Mutación para ejecutar procesamiento de IA manual
  const triggerAIMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al disparar procesamiento IA');
      return res.json();
    }
  });

  // Mutación para guardar configuración del cron
  const saveCronMutation = useMutation({
    mutationFn: async (body) => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/config/ai-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Error al actualizar cron');
      return res.json();
    },
    onSuccess: () => {
      setCronStatus('Horario actualizado con éxito.');
      setTimeout(() => setCronStatus(''), 3000);
      queryClient.invalidateQueries(['cron-config']);
    }
  });

  // Escuchar logs en tiempo real (SSE)
  useEffect(() => {
    const eventSource = new EventSource('/api/logs/stream');
    eventSource.onmessage = (event) => {
      const log = JSON.parse(event.data);
      setLogs((prevLogs) => {
        const updated = [...prevLogs, `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`];
        // Mantener solo los últimos 100 logs
        if (updated.length > 100) updated.shift();
        return updated;
      });
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleStartScrape = (e) => {
    e.preventDefault();
    triggerScrapeMutation.mutate({
      candidateId,
      startDate: useGdelt ? startDate : '2023-01-01',
      endDate: useGdelt ? endDate : '2023-12-31',
      useRSS,
      useGdelt,
      useNewsApi,
      mockMode,
      maxArticles: parseInt(maxArticles, 10)
    });
  };

  const handleSaveCron = () => {
    saveCronMutation.mutate({ day: parseInt(cronDay, 10), hour: parseInt(cronHour, 10) });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      
      {/* Top Navbar */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Terminal className="h-6 w-6 text-blue-500" />
          <h1 className="text-xl font-bold tracking-tight">Politech AI & WebScraping</h1>
          <span className="bg-blue-500/10 text-blue-400 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-500/20">
            Administración
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Cerrar Sesión</span>
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        
        {/* Terminal/Log Stream */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="bg-slate-900 px-4 py-3 flex justify-between items-center border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full"></span>
              <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              <span className="ml-2 text-xs font-semibold tracking-wider uppercase text-slate-400">Consola de logs en vivo</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold uppercase">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span>Canal Activo</span>
            </div>
          </div>
          <div 
            ref={logContainerRef}
            className="p-4 h-48 overflow-y-auto font-mono text-xs text-blue-400 space-y-1 scrollbar-thin scrollbar-thumb-slate-800"
          >
            {logs.length > 0 ? (
              logs.map((log, index) => <div key={index}>{log}</div>)
            ) : (
              <div className="text-slate-500 italic">Esperando inicialización del pipeline...</div>
            )}
          </div>
        </div>

        {/* Action Grids */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Panel 1: Trigger Scraper */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <Play className="h-5 w-5 text-blue-500" />
              <span>Lanzar Scraping Manual</span>
            </h2>
            
            <form onSubmit={handleStartScrape} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase">Candidato</label>
                <select
                  required
                  value={candidateId}
                  onChange={(e) => setCandidateId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Selecciona un candidato...</option>
                  {candidatos?.map(c => (
                    <option key={c._id} value={c._id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="t-use-rss"
                  checked={useRSS}
                  onChange={(e) => setUseRSS(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 bg-slate-900 border-slate-800"
                />
                <label htmlFor="t-use-rss" className="text-sm font-medium text-slate-300">Búsqueda en Vivo (RSS)</label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="t-use-newsapi"
                  checked={useNewsApi}
                  onChange={(e) => setUseNewsApi(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 bg-slate-900 border-slate-800"
                />
                <label htmlFor="t-use-newsapi" className="text-sm font-medium text-slate-300">NewsAPI (1 mes atrás)</label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="t-use-gdelt"
                  checked={useGdelt}
                  onChange={(e) => setUseGdelt(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 bg-slate-900 border-slate-800"
                />
                <label htmlFor="t-use-gdelt" className="text-sm font-medium text-slate-300">GDELT Histórico</label>
              </div>

              {useGdelt && (
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 uppercase">Inicio</label>
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-slate-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 uppercase">Fin</label>
                      <input
                        type="date"
                        required
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="t-mock"
                  checked={mockMode}
                  onChange={(e) => setMockMode(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 bg-slate-900 border-slate-800"
                />
                <label htmlFor="t-mock" className="text-sm font-medium text-slate-300">Modo Mock (Simulado)</label>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase">Límite de Noticias</label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={maxArticles}
                  onChange={(e) => setMaxArticles(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200"
                />
              </div>

              <button
                type="submit"
                disabled={triggerScrapeMutation.isPending}
                className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg text-sm flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
              >
                {triggerScrapeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>Iniciar Scraping</span>
                )}
              </button>

              {triggerScrapeMutation.isSuccess && (
                <div className="text-xs text-emerald-400 text-center font-medium">Scraping iniciado con éxito</div>
              )}
            </form>
          </div>

          {/* Panel 2: Manual AI Processing */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <Settings className="h-5 w-5 text-purple-500" />
                <span>Ejecutar IA Manual</span>
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Envía todas las noticias nuevas recolectadas (estado "Crudo") a los modelos de Inteligencia Artificial (Gemini) para procesar sus resúmenes, sentimientos y sesgos.
              </p>
            </div>
            
            <div className="space-y-3 mt-6">
              <button
                onClick={() => triggerAIMutation.mutate()}
                disabled={triggerAIMutation.isPending}
                className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-lg text-sm flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
              >
                {triggerAIMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>Lanzar Procesamiento IA</span>
                )}
              </button>
              
              {triggerAIMutation.isSuccess && (
                <div className="text-xs text-emerald-400 text-center font-medium">Procesamiento IA iniciado</div>
              )}
            </div>
          </div>

          {/* Panel 3: Cron Schedule */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-amber-500" />
                <span>Programación Cron (IA)</span>
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Establece la programación automática para procesar resúmenes con IA cada semana en el horario indicado.
              </p>
              
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase">Día</label>
                  <select
                    value={cronDay}
                    onChange={(e) => setCronDay(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200"
                  >
                    <option value="0">Domingo</option>
                    <option value="1">Lunes</option>
                    <option value="2">Martes</option>
                    <option value="3">Miércoles</option>
                    <option value="4">Jueves</option>
                    <option value="5">Viernes</option>
                    <option value="6">Sábado</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase">Hora (0-23)</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={cronHour}
                    onChange={(e) => setCronHour(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 mt-6">
              <button
                onClick={handleSaveCron}
                disabled={saveCronMutation.isPending}
                className="w-full py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-200 font-semibold border border-slate-800 rounded-lg text-sm flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
              >
                {saveCronMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>Guardar Horario</span>
                )}
              </button>
              {cronStatus && (
                <div className="text-xs text-emerald-400 text-center font-medium">{cronStatus}</div>
              )}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
};

export default AdminDashboard;
