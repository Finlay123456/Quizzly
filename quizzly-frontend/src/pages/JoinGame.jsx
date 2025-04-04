import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './JoinGame.css';

const JoinGame = () => {
  const [gameCode, setGameCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!gameCode.trim()) return setError('Please enter a game code');
    if (!nickname.trim()) return setError('Please enter a nickname');

    setIsJoining(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/lobbies/${gameCode}`);
      if (!res.ok) throw new Error('Failed to find lobby');
      const data = await res.json();

      if (!data || !data.quiz_id) {
        setError('Invalid game code.');
        setIsJoining(false);
        return;
      }

      // Save player info
      sessionStorage.setItem('quizzlyPlayer', JSON.stringify({
        nickname,
        gameCode
      }));

      // ⭐ Immediately connect to WebSocket
      const ws = new WebSocket(`ws://${window.location.hostname}:9002`);

      ws.onopen = () => {
        console.log('Connected to WebSocket server from join');
        ws.send(JSON.stringify({
          action: "join",
          lobby_id: gameCode,
          user_id: nickname
        }));

        // After connecting, navigate
        navigate(`/game-lobby/${data.quiz_id}/${gameCode}`);
      };

      ws.onerror = (err) => {
        console.error('WebSocket error on join:', err);
        setError('WebSocket connection error');
        setIsJoining(false);
      };

    } catch (err) {
      console.error('Join error:', err);
      setError('Something went wrong. Try again.');
      setIsJoining(false);
    }
  };

  const handleGameCodeChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setGameCode(value);
  };

  const handleNicknameChange = (e) => {
    const value = e.target.value.slice(0, 15);
    setNickname(value);
  };


  return (
    <div className="join-game-container">
      <div className="join-game-card">
        <h1 className="join-title">Join a Game</h1>

        {error && <div className="join-error">{error}</div>}

        <form className="join-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="gameCode" className="form-label">Game Code</label>
            <input
              type="text"
              id="gameCode"
              className="form-control"
              value={gameCode}
              onChange={handleGameCodeChange}
              placeholder="Enter 6-digit code"
              maxLength="6"
              autoComplete="off"
              disabled={isJoining}
            />
          </div>

          <div className="form-group">
            <label htmlFor="nickname" className="form-label">Your Nickname</label>
            <input
              type="text"
              id="nickname"
              className="form-control"
              value={nickname}
              onChange={handleNicknameChange}
              placeholder="Enter a nickname"
              maxLength="15"
              autoComplete="off"
              disabled={isJoining}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-lg btn-block join-button"
            disabled={isJoining}
          >
            {isJoining ? 'Joining...' : 'Join Game'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default JoinGame;
