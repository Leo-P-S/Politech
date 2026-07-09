import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verificar la sesión al cargar
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include' // Para que envíe la cookie
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.username);
          setRole(data.role);
        } else {
          // Si responde 401, no hay sesión válida
          setUser(null);
          setRole(null);
        }
      } catch (error) {
        console.error('Error verificando sesión:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = (userData) => {
    setUser(userData.username);
    setRole(userData.role);
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    } finally {
      setUser(null);
      setRole(null);
      // Opcional: Redirigir al inicio o login si no se maneja en el componente
      window.location.href = '/login';
    }
  };

  // Esta función puede ser llamada por otros componentes si interceptan un 401
  const forceLogout = () => {
    setUser(null);
    setRole(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout, forceLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
