import { useState } from 'react';
import { TrendsChart } from './TrendsChart';

const DataTabs = ({ candidatoData }) => {
  const [activeTab, setActiveTab] = useState('propuestas');
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  const TABS = [
    { id: 'propuestas', label: 'Propuestas de Gobierno' },
    { id: 'antecedentes', label: 'Antecedentes y Alertas' },
    { id: 'noticias', label: 'Noticias Verificadas' },
    { id: 'equipo', label: 'Equipo de Trabajo' },
    { id: 'tendencias', label: 'Tendencias' },
  ];

  // Mostrar solo las cuatro categorías más frecuentes para mantener el filtro compacto.
  const categoryCounts = (candidatoData.historial_noticias || []).reduce((counts, noticia) => {
    const category = noticia.analisis_ia?.categoria?.trim();
    if (category) counts.set(category, (counts.get(category) || 0) + 1);
    return counts;
  }, new Map());
  const categorias = [
    'Todas',
    ...Array.from(categoryCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 4)
      .map(([category]) => category)
  ];

  // Filtrar noticias según la categoría seleccionada (UH08)
  const noticiasFiltradas = selectedCategory === 'Todas'
    ? candidatoData.historial_noticias
    : candidatoData.historial_noticias?.filter(n => n.analisis_ia?.categoria === selectedCategory) || [];

  return (
    <div className="w-full">
      {/* Navigation */}
      <div className="flex overflow-x-auto border-b border-slate-200 px-3 sm:px-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 py-4 px-3 sm:px-5 font-semibold text-sm transition-colors relative ${
              activeTab === tab.id
                ? 'text-blue-700'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-blue-700" />
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="px-5 py-7 sm:px-8 sm:py-8 lg:px-10">
        {activeTab === 'propuestas' && (
          <div className="text-slate-600">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Plan de Gobierno</h3>
            {candidatoData.propuestas && candidatoData.propuestas.length > 0 ? (
              <ul className="list-disc pl-5 space-y-2">
                {candidatoData.propuestas.map((propuesta, index) => (
                  <li key={index} className="text-slate-700">{propuesta}</li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 italic">No se han registrado propuestas de gobierno oficiales para este candidato.</p>
            )}
          </div>
        )}
        
        {activeTab === 'antecedentes' && (
          <div className="text-slate-600">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Registro Histórico y Sentencias</h3>
            {candidatoData.antecedentesJudiciales && candidatoData.antecedentesJudiciales.length > 0 ? (
              <ul className="space-y-3">
                {candidatoData.antecedentesJudiciales.map((antecedente, index) => (
                  <li key={index} className="p-4 rounded-lg bg-red-50 border border-red-100 text-red-950 font-medium">
                    {antecedente}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-emerald-700 font-medium bg-emerald-50 border border-emerald-100 p-4 rounded-lg">
                El candidato no presenta antecedentes penales ni alertas judiciales registradas.
              </p>
            )}
          </div>
        )}
        
        {activeTab === 'noticias' && (
          <div className="text-slate-600 space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
              <h3 className="text-lg font-bold text-slate-900">Cobertura Mediática Verificada</h3>
              
              {/* Barra de filtros de categoría (UH08) */}
              {categorias.length > 1 && (
                <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
                  {categorias.map((cat, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                        selectedCategory === cat
                           ? 'bg-white text-blue-700 shadow-sm'
                           : 'text-slate-500 hover:text-slate-900'
                       }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {noticiasFiltradas && noticiasFiltradas.length > 0 ? (
              <div className="space-y-4">
                {noticiasFiltradas.map((noticia, index) => (
                    <div key={index} className="p-5 sm:p-6 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                     <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start mb-3">
                       <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          {noticia.medio_prensa || 'Medio no especificado'}
                        </span>
                        {noticia.analisis_ia?.categoria && (
                          <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full uppercase">
                            {noticia.analisis_ia.categoria}
                          </span>
                        )}
                        {noticia.analisis_ia?.sentimiento && (
                          <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full uppercase ${
                            noticia.analisis_ia.sentimiento.toLowerCase().includes('pos')
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : noticia.analisis_ia.sentimiento.toLowerCase().includes('neg')
                              ? 'bg-rose-50 text-rose-700 border-rose-100'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            {noticia.analisis_ia.sentimiento}
                          </span>
                        )}
                        {noticia.analisis_ia?.sesgo_politico && (
                          <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full uppercase">
                            {noticia.analisis_ia.sesgo_politico}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">{noticia.fecha || 'Fecha desconocida'}</span>
                    </div>
                    <h4 className="text-md font-bold text-slate-950 mb-2">{noticia.titular}</h4>
                    {noticia.analisis_ia?.resumen_noticia && (
                      <p className="text-sm text-slate-700 bg-blue-50/50 border-l-2 border-blue-400 p-2.5 rounded-r-md italic mb-3">
                        "{noticia.analisis_ia.resumen_noticia}"
                      </p>
                    )}
                    <a 
                      href={noticia.enlace_origen} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs font-bold text-blue-700 hover:underline"
                    >
                      Ir a la fuente original →
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 italic">No se han encontrado noticias verificadas en esta categoría para este candidato.</p>
            )}
          </div>
        )}

        {activeTab === 'equipo' && (
          <div className="text-slate-600">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Equipo de Asesores y Colaboradores</h3>
            {candidatoData.equipoTrabajo && candidatoData.equipoTrabajo.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {candidatoData.equipoTrabajo.map((miembro, index) => (
                  <div key={index} className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-900 text-base">{miembro.nombre}</div>
                    <div className="text-sm text-blue-700 font-medium">{miembro.cargo}</div>
                    {miembro.enlace && (
                      <a
                        href={miembro.enlace}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-2 text-xs font-semibold text-slate-500 hover:text-blue-700 hover:underline"
                      >
                        Fuente: {miembro.fuente || 'Ver publicación'}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 italic">No se ha registrado información de asesores o equipo técnico para este candidato.</p>
            )}
          </div>
        )}

        {activeTab === 'tendencias' && (
          <div className="text-slate-600">
             <TrendsChart trendsData={candidatoData.trendsData} />
          </div>
        )}
      </div>
    </div>
  );
};

export default DataTabs;
