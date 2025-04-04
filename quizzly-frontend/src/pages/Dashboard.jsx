import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    totalPlays: 0,
    totalPlayers: 0,
    averageScore: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const quizzesResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/quizzes`);
        const quizzesData = await quizzesResponse.json();

        if (quizzesData.quizzes) {
          const transformedQuizzes = quizzesData.quizzes.map(quiz => ({
            id: quiz._id?.$oid || '',
            title: quiz.title || 'Untitled Quiz',
            description: quiz.description || '',
            questions: quiz.questions?.length || 0,
            plays: 0,
            createdAt: quiz.created_at || new Date().toISOString(),
            lastPlayed: quiz.last_played || new Date().toISOString(),
            isPublic: quiz.isPublic || false,
            category: quiz.category || 'General',
            timeLimit: quiz.timeLimit || 30
          }));

          setQuizzes(transformedQuizzes);

          setStats({
            totalQuizzes: transformedQuizzes.length,
            totalPlays: transformedQuizzes.reduce((sum, quiz) => sum + quiz.plays, 0),
            totalPlayers: 0,
            averageScore: 0
          });
        }

        setRecentGames([]);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handlePlayQuiz = async (quizId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/lobbies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz_id: quizId,
          host_id: "anonymous" 
        })
      });
  
      const res = await response.json();
  
      if (!res.success) {
        throw new Error(res.error || 'Failed to create lobby');
      }
  
      const lobbyId = res.lobby_id;
  
      sessionStorage.setItem('quizzlyPlayer', JSON.stringify({
        nickname: 'anonymous',
        gameCode: lobbyId
      }));
  
      navigate(`/game-lobby/${quizId}/${lobbyId}`);
    } catch (error) {
      console.error('Error creating lobby:', error);
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome{currentUser?.displayName ? `, ${currentUser.displayName}` : ''}!</h1>
        <Link to="/create-quiz" className="btn btn-primary">
          Create New Quiz
        </Link>
      </div>

      <div className="stats-overview">
        <div className="stat-card"><h3>{stats.totalQuizzes}</h3><p>Quizzes Created</p></div>
        <div className="stat-card"><h3>{stats.totalPlays}</h3><p>Total Plays</p></div>
        <div className="stat-card"><h3>{stats.totalPlayers}</h3><p>Total Players</p></div>
        <div className="stat-card"><h3>{stats.averageScore}%</h3><p>Average Score</p></div>
      </div>

      <section className="dashboard-section">
        <div className="section-header">
          <h2>My Quizzes</h2>
          <Link to="/my-quizzes" className="section-link">View All</Link>
        </div>

        {quizzes.length === 0 ? (
          <div className="empty-state">
            <p>You haven't created any quizzes yet.</p>
            <Link to="/create-quiz" className="btn btn-primary">
              Create Your First Quiz
            </Link>
          </div>
        ) : (
          <div className="quizzes-grid">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="quiz-card">
                <div className="quiz-card-header">
                  <h3 className="quiz-title">{quiz.title}</h3>
                  <span className={`quiz-status ${quiz.isPublic ? 'public' : 'private'}`}>
                    {quiz.isPublic ? 'Public' : 'Private'}
                  </span>
                  <span className="quiz-category">{quiz.category}</span>
                </div>
                <p className="quiz-description">{quiz.description}</p>
                <div className="quiz-meta">
                  <span>{quiz.questions} Questions</span>
                  <span>{quiz.timeLimit} sec/question</span>
                  <span>{quiz.plays} Plays</span>
                </div>
                <div className="quiz-date">
                  <span>Created: {formatDate(quiz.createdAt)}</span>
                </div>
                <div className="quiz-actions">
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => handlePlayQuiz(quiz.id)}
                  >
                    Play
                  </button>
                  <Link to={`/edit-quiz/${quiz.id}`} className="btn btn-sm btn-outline">
                    Edit
                  </Link>
                  <button className="btn btn-sm btn-outline">Share</button>
                </div>
              </div>
            ))}
            <div className="create-quiz-card">
              <div className="create-quiz-content">
                <span className="plus-icon">+</span>
                <h3>Create New Quiz</h3>
                <p>Add a new quiz to your collection</p>
                <Link to="/create-quiz" className="btn btn-primary">
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
