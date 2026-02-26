import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('simba-user');
    return stored ? JSON.parse(stored) : null;
  });

  const hasAccount = !!localStorage.getItem('simba-has-account');

  const login = useCallback((name, phone) => {
    const userData = { name: name || phone, phone };
    setUser(userData);
    localStorage.setItem('simba-user', JSON.stringify(userData));
    localStorage.setItem('simba-has-account', 'true');
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('simba-user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, hasAccount, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
