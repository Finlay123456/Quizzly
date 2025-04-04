import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      closeMenu(); // Close the menu when logging out
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
          <span className="logo-text">Quizzly</span>
        </Link>

        <div className="navbar-toggle" onClick={toggleMenu}>
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </div>

        <ul className={`navbar-menu ${isMenuOpen ? 'active' : ''}`}>
          <li className="navbar-item">
            <Link to="/" className="navbar-link" onClick={closeMenu}>
              Home
            </Link>
          </li>
          
          {/* Common item for both logged in and out users */}
          <li className="navbar-item">
            <Link to="/join" className="navbar-link" onClick={closeMenu}>
              Join Game
            </Link>
          </li>

  
            <>
              <li className="navbar-item">
                <Link to="/dashboard" className="navbar-link" onClick={closeMenu}>
                  Dashboard
                </Link>
              </li>
              <li className="navbar-item">
                <Link to="/create-quiz" className="navbar-link" onClick={closeMenu}>
                  Create Quiz
                </Link>
              </li>
              <li className="navbar-item">
                <button className="navbar-button logout-button" onClick={handleLogout}>
                  Logout
                </button>
              </li>
            </>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;