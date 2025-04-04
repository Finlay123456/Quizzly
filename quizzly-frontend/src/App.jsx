import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import { AuthProvider } from './context/AuthContext';
import JoinGame from './pages/JoinGame';
import GameLobby from './pages/GameLobby';
import PlayQuiz from './pages/PlayQuiz';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateQuiz from './pages/CreateQuiz';
import EditQuiz from './pages/EditQuiz';
import QuizResults from './pages/QuizResults'

function AppContent() {
  const location = useLocation();
  const hideNavbarRoutes = ['/login', '/register', '/'];
  const shouldHideNavbar = hideNavbarRoutes.includes(location.pathname);

  return (
    <div className="app">
      {!shouldHideNavbar && <Navbar />}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/join" element={<JoinGame />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create-quiz" element={<CreateQuiz />} />
          <Route path="/game-lobby/:id/:lobby" element={<GameLobby />} />
          <Route path="/results/:lobby" element={<QuizResults />} />
          <Route path="/play-quiz/:id/:lobby" element={<PlayQuiz />} />
          <Route path="/edit-quiz/:id" element={<EditQuiz />} />
          <Route path="/home" element={<Home />} />
          <Route path="*" element={<div>Page not found</div>} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
