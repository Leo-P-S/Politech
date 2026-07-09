import React, { useState } from 'react';

// Sub-componentes reciben los datos específicos como "props"
import PropuestasTab from './tabs/PropuestasTab';
import AntecedentesTab from './tabs/AntecedentesTab';
import NoticiasTab from './tabs/NoticiasTab';

const DataTabs = ({ candidatoData }) => {
  // Estado para controlar la pestaña activa. Por defecto: 'propuestas'
  const [activeTab, setActiveTab] = useState('propuestas');

  // Objeto de configuración para mapear las pestañas de forma limpia
  const TABS = [
    { id: 'propuestas', label: 'Propuestas de Gobierno' },
    { id: 'antecedentes', label: 'Antecedentes y Alertas' },
    { id: 'noticias', label: 'Noticias Verificadas' },
  ];

  return (
    <div className="w-full mt-8">
      {/* Renderizado del menú de navegación de las pestañas */}
      <div className="flex border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-2 px-4 font-semibold text-sm focus:outline-none ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Renderizado condicional del contenido según la pestaña seleccionada */}
      <div className="p-4 bg-white rounded-b-lg shadow-sm">
        {/* Aquí pasamos solo el arreglo de datos que necesita cada sub-componente */}
        {activeTab === 'propuestas' && (
          <PropuestasTab propuestas={candidatoData.propuestas} />
        )}
        
        {activeTab === 'antecedentes' && (
          <AntecedentesTab antecedentes={candidatoData.antecedentes} alertas={candidatoData.alertas} />
        )}
        
        {activeTab === 'noticias' && (
          <NoticiasTab noticias={candidatoData.noticias} />
        )}
      </div>
    </div>
  );
};

export default DataTabs;
