import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import './QuizResults.css';

const QuizResults = () => {
  // Extract lobbyCode from URL parameters
  const { lobbyCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [results, setResults] = useState({
    score: 0,
    quizTitle: `Lobby ${lobbyCode}`,
    playerNickname: ''
  });
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState(null);

  
    useEffect(() => {
      let intervalId;
      const pollingInterval = 7000; // 3 seconds
    
      const fetchLobbyData = async () => {
        try {
          // First validate we have a lobbyCode
          if (!lobbyCode || lobbyCode.length !== 6) {
            throw new Error('Invalid lobby code format');
          }
    
          // Get player info from session storage
          const playerData = JSON.parse(sessionStorage.getItem('quizzlyPlayer')) || {};
          const playerNickname = playerData.nickname || 'You';
    
          // Only set state from navigation on initial load
          if (location.state && !results.score) {
            setResults(prev => ({
              ...prev,
              score: location.state.score || 0,
              answers: location.state.answers,
              totalQuestions: location.state.totalQuestions,
              quizTitle: location.state.quizTitle || `Lobby ${lobbyCode}`,
              playerNickname
            }));
          } else if (!results.playerNickname) {
            setResults(prev => ({
              ...prev,
              playerNickname,
              quizTitle: `Lobby ${lobbyCode}`
            }));
          }
    
          // Fetch lobby results from backend
          const response = await fetch(`http://localhost:5001/api/results/${lobbyCode}`);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch lobby data: ${response.status}`);
          }
    
          const data = await response.json();
          
          if (!data.success) {
            throw new Error(data.error || 'Failed to load lobby data');
          }
    
          // Process scores from backend
          const scores = data.data.scores || [];
          const formattedLeaderboard = scores
            .map(entry => ({
              nickname: entry.nickname,
              score: entry.score,
              isCurrentPlayer: entry.nickname === (results.playerNickname || playerNickname)
            }))
            .sort((a, b) => b.score - a.score)
            .map((player, index) => ({
              ...player,
              rank: index + 1
            }));
    
          setLeaderboard(formattedLeaderboard);
    
          // Update current player's score if not set from location.state
          if (!location.state?.score) {
            const playerEntry = formattedLeaderboard.find(p => p.isCurrentPlayer);
            if (playerEntry) {
              setResults(prev => ({
                ...prev,
                score: playerEntry.score
              }));
            }
          }
    
        } catch (err) {
          console.error('Error loading lobby results:', err);
          setError(err.message);
          // Don't stop polling on error - try again next interval
        }
      };
    
      // Initial fetch
      fetchLobbyData().finally(() => {
        setLoading(false);
        // Start polling after initial load
        intervalId = setInterval(fetchLobbyData, pollingInterval);
      });
    
      // Cleanup interval on unmount
      return () => {
        if (intervalId) clearInterval(intervalId);
      };
    }, [lobbyCode, location.state, results.playerNickname, results.score]);
  // Calculate player's rank
  const playerRank = leaderboard.findIndex(p => p.isCurrentPlayer) + 1 || null;

  // Calculate performance percentage (0-100)
  const calculatePerformance = () => {
    if (leaderboard.length === 0) return 0;
    const topScore = leaderboard[0]?.score || 1;
    return Math.min(Math.round((results.score / topScore) * 100), 100);
  };

  // Play again in the same lobby
  const playAgain = () => {
    navigate(`/play-quiz/${location.state?.quizId || 'lobby'}/${lobbyCode}`);
  };

  if (loading) {
    return (
      <div className="results-loading">
        <div className="spinner"></div>
        <p>Loading lobby results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-error">
        <h2>Error Loading Lobby</h2>
        <p>{error}</p>
        <div className="error-actions">
          <Link to="/dashboard" className="btn btn-primary">
            Back to Dashboard
          </Link>
          <button onClick={() => window.location.reload()} className="btn btn-outline">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-results">
  <div className="results-header">
    <p className="lobby-code">{lobbyCode}</p>
    <h1>Lobby Results</h1>
    {results.quizTitle && <p className="quiz-title">{results.quizTitle}</p>}
  </div>

  <div className="results-summary">
    <div className="score-card">
      <div className="score-value">{results.score}</div>
      <div className="score-label">Your Score</div>
    </div>
  </div>

  <div className="leaderboard-section">
    <h2>Leaderboard</h2>
    <div className="leaderboard">
      <div className="leaderboard-header">
        <span>Rank</span>
        <span>Player</span>
        <span>Score</span>
      </div>

      <div className="leaderboard-body">
        {leaderboard.map((player) => (
          <div
            key={`${player.rank}-${player.nickname}`}
            className={`leaderboard-row ${player.isCurrentPlayer ? 'current-player' : ''}`}
          >
            <div className="leaderboard-rank">
              {player.rank <= 3 ? (
                <span className="trophy">
                  {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : '🥉'}
                </span>
              ) : (
                <span>{player.rank}</span>
              )}
            </div>
            <div className="leaderboard-name">
              {player.nickname} {player.isCurrentPlayer && <span className="you-indicator">(You)</span>}
            </div>
            <div className="leaderboard-score">{player.score}</div>
          </div>
        ))}
      </div>
    </div>
  </div>

  <div className="results-actions">
    <Link to="/join" className="btn btn-secondary">Join Another Lobby</Link>
  </div>
</div>

  );
};

export default QuizResults;