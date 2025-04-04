import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './GameLobby.css';

const GameLobby = () => {
  const { id: quizId, lobby: lobbyCode } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [hostInfo, setHostInfo] = useState({ name: 'Quiz Host', avatar: '👨‍🏫' });
  const [quizInfo, setQuizInfo] = useState({ title: 'Loading quiz...', description: '', questions: 0, timeLimit: 30 });
  const [playerNickname, setPlayerNickname] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    const storedPlayer = sessionStorage.getItem('quizzlyPlayer');
    if (!storedPlayer) {
      navigate('/join');
      return;
    }
    const playerData = JSON.parse(storedPlayer);
    setPlayerNickname(playerData.nickname);

    const fetchQuizData = async () => {
      try {
        const quizResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/quiz/id/${quizId}`);
        if (!quizResponse.ok) throw new Error('Failed to load quiz');
        const data = await quizResponse.json();
        const quiz = data.quiz;

        setQuizInfo({
          title: quiz?.title || 'Untitled Quiz',
          description: quiz?.description || '',
          questions: quiz?.questions?.length || 0,
          timeLimit: quiz?.timeLimit || 30
        });

        if (quiz?.created_by) {
          setHostInfo({
            name: quiz.created_by,
            avatar: '👨‍🏫'
          });
        }
      } catch (error) {
        console.error('Error fetching quiz:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuizData();

    const ws = new WebSocket(`ws://${window.location.hostname}:9002`);

    ws.onopen = () => {
      console.log('✅ Connected to WebSocket server');

      ws.send(JSON.stringify({
        lobby_id: lobbyCode,       // 6-character lobby code
        user_id: playerData.nickname,
        action: "join"
      }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('📩 Message from server:', message);

      if (message.action === "player_joined" || message.action === "player_left") {
        if (message.players && Array.isArray(message.players)) {
          setPlayers(message.players.map(playerNickname => ({
            id: Date.now() + Math.random(), // Unique id
            nickname: playerNickname,
            avatar: '😎',
            isReady: false,
            isYou: playerNickname === playerData.nickname
          })));
        }
      }
    };

    ws.onerror = (err) => {
      console.error('❌ WebSocket error:', err);
    };

    ws.onclose = () => {
      console.warn('⚡ WebSocket closed');
    };

    return () => {
      ws.close();
    };
  }, [quizId, lobbyCode, navigate]);

  const startCountdown = () => {
    setCountdown(5);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(`/play/${quizId}/${lobbyCode}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const toggleReady = () => {
    setPlayers(prevPlayers =>
      prevPlayers.map(player =>
        player.isYou ? { ...player, isReady: !player.isReady } : player
      )
    );
  };

  const leaveGame = () => {
    sessionStorage.removeItem('quizzlyPlayer');
    navigate('/dashboard');
  };

  const currentPlayer = players.find(p => p.isYou) || {};

  if (isLoading) {
    return (
      <div className="game-lobby-loading">
        <div className="spinner"></div>
        <p>Loading game lobby...</p>
      </div>
    );
  }

  return (
    <div className="game-lobby">
      {countdown !== null && (
        <div className="countdown-overlay">
          <div className="countdown-content">
            <h2>Game Starting in</h2>
            <div className="countdown-number">{countdown}</div>
            <p>Get ready!</p>
          </div>
        </div>
      )}

      <div className="lobby-header">
        <div className="game-info">
          <h1>{quizInfo.title}</h1>
          <p className="game-description">{quizInfo.description}</p>
          <div className="game-meta">
            <span className="game-code">Game Code: <strong>{lobbyCode}</strong></span>
            <span className="question-count">{quizInfo.questions} Questions</span>
            <span className="time-limit">{quizInfo.timeLimit}s per question</span>
          </div>
        </div>

        <div className="host-info">
          <div className="host-avatar">{hostInfo.avatar}</div>
          <div className="host-details">
            <span className="host-label">Host</span>
            <h3 className="host-name">{hostInfo.name}</h3>
          </div>
        </div>
      </div>

      <div className="lobby-content">
        <div className="lobby-main">
          <h2>Players ({players.length})</h2>
          <p className="lobby-instruction">
            {players.every(p => p.isReady)
              ? 'All players ready! Starting soon...'
              : 'Waiting for players to ready up...'}
          </p>

          <div className="players-grid">
            {players.map(player => (
              <div
                key={player.id}
                className={`player-card ${player.isReady ? 'ready' : 'not-ready'} ${player.isYou ? 'is-you' : ''}`}
              >
                <div className="player-avatar">{player.avatar}</div>
                <div className="player-name">
                  {player.nickname} {player.isYou && <span className="you-badge">(You)</span>}
                </div>
                <div className="player-status">
                  {player.isReady ? 'Ready ✓' : 'Not Ready...'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lobby-sidebar">
          <div className="player-info">
            <div className="player-avatar large">{currentPlayer.avatar || '😎'}</div>
            <h3 className="player-name">{playerNickname}</h3>
            <div className={`player-status-badge ${currentPlayer.isReady ? 'ready' : ''}`}>
              {currentPlayer.isReady ? 'Ready to Play' : 'Not Ready'}
            </div>
          </div>

          <div className="lobby-actions">
            <button
              className={`btn ${currentPlayer.isReady ? 'btn-outline' : 'btn-primary'} btn-block`}
              onClick={toggleReady}
            >
              {currentPlayer.isReady ? 'Cancel Ready' : 'Ready Up'}
            </button>

            <button
              className="btn btn-outline btn-block"
              onClick={leaveGame}
            >
              Leave Game
            </button>
          </div>

          <div className="lobby-rules">
            <h3>How to Play</h3>
            <ul>
              <li>Answer questions as quickly as possible</li>
              <li>Faster correct answers earn more points</li>
              <li>Each question has a {quizInfo.timeLimit} second limit</li>
              <li>The player with most points wins!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameLobby;
