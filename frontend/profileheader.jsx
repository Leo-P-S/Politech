import React from 'react';

const ProfileHeader = ({ candidato }) => {
  return (
    <div className="flex flex-col md:flex-row items-center bg-white p-6 rounded-lg shadow-md mb-6">
      {/* Foto del Candidato */}
      <img 
        src={candidato.fotoUrl || 'https://via.placeholder.com/150'} 
        alt={`Foto de ${candidato.nombreCompleto}`} 
        className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 mb-4 md:mb-0 md:mr-6"
      />
      
      {/* Información Básica */}
      <div className="flex-1 text-center md:text-left">
        <h1 className="text-3xl font-bold text-gray-800">{candidato.nombreCompleto}</h1>
        <p className="text-xl text-gray-600 mt-1">{candidato.partido}</p>
        
        {/* Tags / Alertas Rápidas */}
        <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-4">
          {candidato.alertas && candidato.alertas.map((alerta, index) => (
            <span 
              key={index} 
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                alerta.nivel === 'Alto' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
              }`}
            >
               {alerta.mensaje}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
