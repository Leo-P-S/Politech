import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Calendar, Terminal, Settings, LogOut, Loader2, UserPlus, Trash2, Users, Eye } from 'lucide-react';

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

  // Estados para el formulario de candidatos
  const [newCandidateName, setNewCandidateName] = useState('');
  const [newCandidateParty, setNewCandidateParty] = useState('');
  const [candidateMsg, setCandidateMsg] = useState({ type: '', text: '' });

  // Estado de conexión SSE
  const [sseConnected, setSseConnected] = useState(false);

  // Estados para gestión de noticias
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedCandidateNews, setSelectedCandidateNews] = useState([]);
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);

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

  // Mutación para crear candidato
  const createCandidateMutation = useMutation({
    mutationFn: async ({ nombre, partidoPolitico }) => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/candidatos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ nombre, partidoPolitico })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.mensaje || 'Error al crear candidato');
      }
      return res.json();
    },
    onSuccess: () => {
      setNewCandidateName('');
      setNewCandidateParty('');
      setCandidateMsg({ type: 'success', text: 'Candidato añadido exitosamente.' });
      setTimeout(() => setCandidateMsg({ type: '', text: '' }), 3000);
      queryClient.invalidateQueries(['candidatos-admin']);
    },
    onError: (err) => {
      setCandidateMsg({ type: 'error', text: err.message });
    }
  });

  // Mutación para eliminar candidato
  const deleteCandidateMutation = useMutation({
    mutationFn: async (id) => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/candidatos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al eliminar candidato');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['candidatos-admin']);
    }
  });

  // Mutación para eliminar noticia
  const deleteNewsMutation = useMutation({
    mutationFn: async ({ candidateId, newsId }) => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/candidatos/${candidateId}/news/${newsId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al eliminar la noticia');
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['candidatos-admin']);
      setSelectedCandidateNews(prev => prev.filter(n => n._id !== variables.newsId));
    }
  });

  const handleViewNews = (candidato) => {
    setSelectedCandidate(candidato);
    setSelectedCandidateNews(candidato.historial_noticias || []);
    setIsNewsModalOpen(true);
  };

  const handleDeleteNews = (newsId) => {
    if (window.confirm('¿Eliminar esta noticia? Esta acción no se puede deshacer.')) {
      deleteNewsMutation.mutate({ candidateId: selectedCandidate._id, newsId });
    }
  };

  const handleCreateCandidate = (e) => {
    e.preventDefault();
    if (!newCandidateName.trim()) return;
    createCandidateMutation.mutate({ nombre: newCandidateName.trim(), partidoPolitico: newCandidateParty.trim() || 'Independiente' });
  };

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

    eventSource.onopen = () => setSseConnected(true);

    eventSource.onmessage = (event) => {
      try {
        const log = JSON.parse(event.data);
        setLogs((prevLogs) => {
          const updated = [...prevLogs, { level: log.level || 'info', message: log.message, timestamp: log.timestamp }];
          if (updated.length > 100) updated.shift();
          return updated;
        });
      } catch (e) {
        // ignorar mensajes mal formateados
      }
    };

    eventSource.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      eventSource.close();
      setSseConnected(false);
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
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase">
              <span className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
              <span className={sseConnected ? 'text-emerald-400' : 'text-red-400'}>{sseConnected ? 'Canal Activo' : 'Desconectado'}</span>
            </div>
          </div>
          <div 
            ref={logContainerRef}
            className="p-4 h-48 overflow-y-auto font-mono text-xs text-blue-400 space-y-1 scrollbar-thin scrollbar-thumb-slate-800"
          >
            {logs.length > 0 ? (
              logs.map((log, index) => {
                const levelColors = {
                  error: 'text-red-400',
                  warn:  'text-yellow-400',
                  info:  'text-blue-400',
                  debug: 'text-slate-400',
                };
                const color = levelColors[log.level] || 'text-blue-400';
                return (
                  <div key={index} className="flex gap-2">
                    <span className="text-slate-600 shrink-0">{log.timestamp?.slice(11, 19) || ''}</span>
                    <span className={`font-bold uppercase w-10 shrink-0 ${color}`}>{log.level}</span>
                    <span className="text-slate-300">{log.message}</span>
                  </div>
                );
              })
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

        {/* Panel de Gestión de Candidatos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Formulario: Añadir Candidato */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-emerald-500" />
              <span>Añadir Candidato Oficial</span>
            </h2>
            <p className="text-sm text-slate-400">Registra un nuevo candidato en la base de datos para que pueda ser buscado y monitoreado.</p>

            <form onSubmit={handleCreateCandidate} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={newCandidateName}
                  onChange={(e) => setNewCandidateName(e.target.value)}
                  placeholder="Ej. Juan Carlos Pérez"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase">Partido Político</label>
                <input
                  type="text"
                  value={newCandidateParty}
                  onChange={(e) => setNewCandidateParty(e.target.value)}
                  placeholder="Ej. Partido Nacional (opcional)"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <button
                type="submit"
                disabled={createCandidateMutation.isPending}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg text-sm flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
              >
                {createCandidateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>Guardar Candidato</span>
                  </>
                )}
              </button>

              {candidateMsg.text && (
                <div className={`text-xs text-center font-semibold py-1 rounded ${candidateMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {candidateMsg.text}
                </div>
              )}
            </form>
          </div>

          {/* Lista: Candidatos Registrados */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col space-y-4">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span>Candidatos Registrados</span>
              {candidatos && (
                <span className="ml-auto text-xs font-semibold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                  {candidatos.length} total
                </span>
              )}
            </h2>

            <div className="flex-1 overflow-y-auto max-h-72 space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
              {!candidatos || candidatos.length === 0 ? (
                <p className="text-slate-500 italic text-sm">No hay candidatos registrados aún.</p>
              ) : (
                candidatos.map((c) => (
                  <div key={c._id} className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg">
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-slate-200 truncate">{c.nombre}</span>
                      <span className="text-xs text-slate-500">{c.partidoPolitico || 'Sin partido'} · {c.historial_noticias?.length || 0} noticias</span>
                    </div>
                    <div className="flex gap-1.5 ml-3 flex-shrink-0">
                      <button
                        onClick={() => handleViewNews(c)}
                        className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                        title="Ver y Gestionar Noticias"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Eliminar a ${c.nombre}? Esta acción no se puede deshacer.`)) {
                            deleteCandidateMutation.mutate(c._id);
                          }
                        }}
                        disabled={deleteCandidateMutation.isPending}
                        className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Eliminar candidato"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </main>

      {/* Modal / Panel de Gestión de Noticias */}
      {isNewsModalOpen && selectedCandidate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 border border-slate-800 rounded-xl max-w-3xl w-full max-h-[80vh] flex flex-col shadow-2xl">
            {/* Header del modal */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Gestionar Noticias</h3>
                <p className="text-xs text-slate-400">
                  {selectedCandidate.nombre} · {selectedCandidateNews.length} noticias
                </p>
              </div>
              <button 
                onClick={() => setIsNewsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>
            
            {/* Cuerpo del modal */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1 scrollbar-thin scrollbar-thumb-slate-800">
              {selectedCandidateNews.length === 0 ? (
                <p className="text-slate-500 italic text-center text-sm">Este candidato no tiene noticias registradas.</p>
              ) : (
                selectedCandidateNews.map((news) => (
                  <div key={news._id} className="p-3.5 bg-slate-900 border border-slate-850 rounded-lg flex justify-between items-start gap-4 hover:border-slate-800 transition-colors">
                    <div className="space-y-1 min-w-0">
                      <h4 className="text-sm font-semibold text-slate-200 line-clamp-2">{news.titular}</h4>
                      <div className="flex gap-2 flex-wrap items-center text-[10px]">
                        <span className="text-slate-500 font-medium">{news.medio_prensa || 'Medio'}</span>
                        {news.analisis_ia?.categoria && (
                          <span className="text-blue-400 font-bold uppercase">{news.analisis_ia.categoria}</span>
                        )}
                        {news.analisis_ia?.sentimiento && (
                          <span className={`font-bold uppercase ${
                            news.analisis_ia.sentimiento.toLowerCase().includes('pos')
                              ? 'text-emerald-400'
                              : news.analisis_ia.sentimiento.toLowerCase().includes('neg')
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}>
                            {news.analisis_ia.sentimiento}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteNews(news._id)}
                      disabled={deleteNewsMutation.isPending}
                      className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50"
                      title="Eliminar noticia"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
