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
    const fetchLobbyData = async () => {
      try {
        // First validate we have a lobbyCode
        if (!lobbyCode || lobbyCode.length !== 6) {
          throw new Error('Invalid lobby code format');
        }

        // Get player info from session storage
        const playerData = JSON.parse(sessionStorage.getItem('quizzlyPlayer')) || {};
        const playerNickname = playerData.nickname || 'You';

        // If we have state from navigation (coming from game), use it
        if (location.state) {
          setResults(prev => ({
            ...prev,
            score: location.state.score || 0,
            answers: location.state.answers,
            totalQuestions: location.state.totalQuestions,
            quizTitle: location.state.quizTitle || `Lobby ${lobbyCode}`,
            playerNickname
          }));
        } else {
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
            isCurrentPlayer: entry.nickname === playerNickname
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
      } finally {
        setLoading(false);
      }
    };

    fetchLobbyData();
  }, [lobbyCode, location.state]);

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
        <h1>Lobby Results</h1>
        <p className="lobby-info">
          <span className="lobby-code">{lobbyCode}</span>
          {results.quizTitle && <span className="quiz-title">{results.quizTitle}</span>}
        </p>
      </div>

      <div className="results-content">
        <div className="player-performance">
          <div className="performance-card">
            <div className="performance-value">{results.score}</div>
            <div className="performance-label">Your Score</div>
          </div>
          
          {playerRank && (
            <div className="performance-card">
              <div className="performance-value">
                {playerRank}
                {playerRank === 1 ? 'st' : playerRank === 2 ? 'nd' : playerRank === 3 ? 'rd' : 'th'}
              </div>
              <div className="performance-label">Your Rank</div>
            </div>
          )}

          <div className="performance-card">
            <div className="performance-value">{calculatePerformance()}%</div>
            <div className="performance-label">Performance</div>
          </div>
        </div>

        <div className="leaderboard-section">
          <h2>Leaderboard</h2>
          
          {leaderboard.length > 0 ? (
            <div className="leaderboard-container">
              <div className="leaderboard-header">
                <span>Rank</span>
                <span>Player</span>
                <span>Score</span>
              </div>
              
              <div className="leaderboard-rows">
                {leaderboard.map((player) => (
                  <div 
                    key={`${player.rank}-${player.nickname}`}
                    className={`leaderboard-row ${player.isCurrentPlayer ? 'current-player' : ''}`}
                  >
                    <div className="leaderboard-rank">
                      {player.rank <= 3 ? (
                        <span className={`trophy rank-${player.rank}`}>
                          {player.rank === 1 ? '🥇' : playerRank === 2 ? '🥈' : '🥉'}
                        </span>
                      ) : (
                        <span>{player.rank}</span>
                      )}
                    </div>
                    <div className="leaderboard-name">
                      {player.nickname}
                      {player.isCurrentPlayer && <span className="you-indicator"> (You)</span>}
                    </div>
                    <div className="leaderboard-score">{player.score}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="no-scores">No scores recorded yet</p>
          )}
        </div>

        <div className="results-actions">
          <button onClick={playAgain} className="btn btn-primary">
            Play Again
          </button>
          <Link to="/join" className="btn btn-secondary">
            Join Another Lobby
          </Link>
        </div>
      </div>
    </div>
  );
};

export default QuizResults;