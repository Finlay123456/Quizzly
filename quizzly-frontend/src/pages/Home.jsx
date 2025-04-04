import { Link } from 'react-router-dom';
import './Home.css';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { currentUser } = useAuth();

  // Simple local nav bar for Home page
const HomeNavbar = () => (
  <nav style={{ 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    padding: '1rem 2rem', 
    backgroundColor: '#ffffff', 
    borderBottom: '1px solid #ddd' 
  }}>
    <h1 style={{ margin: 0 }}>Quizzly</h1>
    <Link 
      to="/login" 
      style={{ 
        textDecoration: 'none', 
        backgroundColor: '#007bff', 
        color: '#fff', 
        padding: '0.5rem 1rem', 
        borderRadius: '5px',
        fontWeight: 'bold'
      }}
    >
      Log In
    </Link>
  </nav>
);
  
  return (
    
    <div className="home">
      <HomeNavbar />
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Make Learning Awesome!</h1>
          <p>Create engaging quizzes, play with friends, and learn together.</p>
          <div className="hero-buttons">
            {currentUser ? (
              <>
                <Link to="/create-quiz" className="btn btn-primary btn-lg">
                  Create Quiz
                </Link>
                <Link to="/join" className="btn btn-outline btn-lg">
                  Join Game
                </Link>
              </>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-lg">
                  Get Started
                </Link>
                <Link to="/join" className="btn btn-outline btn-lg">
                  Join Game
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="hero-image">
          <img src="/images/quiz-illustration.svg" alt="Quiz Illustration" />
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <h2>Why Choose Quizzly?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📝</div>
            <h3>Easy to Create</h3>
            <p>Build beautiful quizzes in minutes with our intuitive quiz editor.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎮</div>
            <h3>Fun to Play</h3>
            <p>Engage players with interactive questions, timers, and leaderboards.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Detailed Reports</h3>
            <p>Get insights with comprehensive analytics and performance tracking.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔄</div>
            <h3>Reusable Content</h3>
            <p>Save quizzes to your library and reuse them anytime.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Create a Quiz</h3>
            <p>Design your quiz with multiple question types, images, and time limits.</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Share with Players</h3>
            <p>Invite players with a game code or direct link to join your quiz.</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Play Together</h3>
            <p>Host live games with real-time interaction and competitive fun.</p>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <h3>View Results</h3>
            <p>Analyze performance with detailed statistics and insights.</p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="cta">
        <div className="cta-content">
          <h2>Ready to make your own quiz?</h2>
          <p>Join thousands of teachers, trainers, and event hosts creating engaging quizzes.</p>
          {currentUser ? (
            <Link to="/create-quiz" className="btn btn-accent btn-lg">
              Create Your First Quiz
            </Link>
          ) : (
            <Link to="/register" className="btn btn-accent btn-lg">
              Sign Up for Free
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;