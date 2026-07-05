import axios from 'axios';

// variables de entorno en Vite usan el prefijo VITE_
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', 
  headers: {
    'Content-Type': 'application/json',
  },
  // timeout: 10000, // opcional: abortar si tarda más de 10 segundos
});

// Función para buscar candidatos (la usaríamos en HeroSearch)
export const searchCandidatos = async (query) => {
  try {
    const response = await apiClient.get(`/candidatos/search?q=${query}`);
    return response.data;
  } catch (error) {
    console.error("Error en searchCandidatos:", error);
    throw error; // se lanza el error para que el componente lo maneje visualmente
  }
};

// función para obtener el "Perfil Exprés" completo de un candidato
export const getCandidatoById = async (id) => {
  try {
    const response = await apiClient.get(`/candidatos/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error obteniendo candidato con ID ${id}:`, error);
    throw error;
  }
};

export default apiClient;
