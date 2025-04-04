// AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, load any stored user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('quizzlyUser');
    if (storedUser) {
      //setCurrentUser(JSON.parse(storedUser));
      console.log("Current user: ", storedUser);
      setCurrentUser(storedUser);
    }
    setLoading(false);
  }, []);

  // Register function: sends plaintext password to backend
  const register = async (name, email, password) => {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/register`, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        email,
        password
      })
    });
    
    const data = await response.json();
    if (response.ok && data.success) {
      // Assuming your backend returns the created user object
      setCurrentUser(data.user);
      localStorage.setItem('quizzlyUser', JSON.stringify(data.user));
      return data.user;
    } else {
      throw new Error(data.error || 'Registration failed on server');
    }
  };

  // Login function: sends plaintext password to backend for verification
  const login = async (email, password) => {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/login`, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    if (response.ok && data.success) {
      setCurrentUser(data.user);
      localStorage.setItem('quizzlyUser', JSON.stringify(data.user));
      return data.user;
    } else {
      throw new Error(data.error || 'Login failed on server');
    }
  };

  const logout = async () => {
    // Clear local auth state
    setCurrentUser(null);
    localStorage.removeItem('quizzlyUser');
  };

  const value = {
    currentUser,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
