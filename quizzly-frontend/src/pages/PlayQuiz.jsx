import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import './PlayQuiz.css';

const PlayQuiz = () => {
  const { id: quizId} = useParams();
  const navigate = useNavigate();
  const location = useLocation(); // Add this import

// Extract lobby code from URL (last 6 characters after last slash)
  const pathParts = location.pathname.split('/');
  const lobbyCode = pathParts[pathParts.length - 1].length === 6 ? pathParts[pathParts.length - 1] : null;
  // State
  const [quizData, setQuizData] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [playerAnswers, setPlayerAnswers] = useState([]);
  const [gameStatus, setGameStatus] = useState('playing');
  const [playerNickname, setPlayerNickname] = useState('');
  
  // Refs
  const timerRef = useRef(null);
  const quizDataRef = useRef();
  const currentQuestionIndexRef = useRef();
  const navigationTimeoutRef = useRef();
  const isAnsweredRef = useRef();
  const scoreRef = useRef(0);
  // Sync refs with state
  useEffect(() => {
    quizDataRef.current = quizData;
    currentQuestionIndexRef.current = currentQuestionIndex;
    isAnsweredRef.current = isAnswered;
    scoreRef.current = score;
  }, [quizData, currentQuestionIndex, isAnswered, score]);

  // Load player info and quiz data
  useEffect(() => {
    const storedPlayer = sessionStorage.getItem('quizzlyPlayer');
    if (storedPlayer) {
      const playerData = JSON.parse(storedPlayer);
      setPlayerNickname(playerData.nickname);
    }
    fetchQuizData();
    
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(navigationTimeoutRef.current);
    };
  }, [quizId]);

  // Fetch quiz data from the server
  const fetchQuizData = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/quiz/id/${quizId}`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

      const data = await response.json();
      if (data.success) {
        setQuizData(data.quiz);
        startQuestion(0, data.quiz);
      } else {
        console.error("Error fetching quiz:", data.error);
      }
    } catch (error) {
      console.error("Failed to fetch quiz data:", error);
    }
  };

  // Start a question with timer
  const startQuestion = (index, quiz = quizData) => {
    const currentQuiz = quiz || quizDataRef.current;
    if (!currentQuiz?.questions?.[index]) return;
    
    const question = currentQuiz.questions[index];
    const questionTime = question.timeLimit || currentQuiz.timeLimit;
  
    setIsAnswered(false);
    setSelectedOption(null);
    setShowAnswer(false);
    setTimeLeft(questionTime);
    
    // Clear existing timer
    clearInterval(timerRef.current);
    
    // Start new timer
    timerRef.current = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timerRef.current);
          if (!isAnsweredRef.current) {
            const currentQ = quizDataRef.current?.questions?.[currentQuestionIndexRef.current];
            if (currentQ) {
              handleTimeout(currentQ);
            }
          }
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  };

  // Handle option selection
  const handleOptionSelect = (optionId) => {
    if (isAnsweredRef.current) return;

    const currentQIndex = currentQuestionIndexRef.current;
    const currentQuestion = quizDataRef.current?.questions?.[currentQIndex];
    if (!currentQuestion) return;
    
    // For timeout case (optionId 5), we don't need to check the option
    if (optionId !== 5) {
      const selectedOpt = currentQuestion.options[optionId];
      if (!selectedOpt) {
        console.error("Selected option not found!");
        return;
      }
    }
  
    setSelectedOption(optionId);
    setIsAnswered(true);
  
    // Determine if the selected option is correct
    // Option 5 will always be incorrect since it's not a real option
    const isCorrect = optionId !== 5 && currentQuestion.correctAnswer === optionId;
  
    // Calculate score based on time left
    let questionScore = 0;
    if (isCorrect) {
      const timeBonus = Math.floor((timeLeft / currentQuestion.timeLimit) * 50);
      questionScore = currentQuestion.points + timeBonus;
      setScore(prevScore => {
        const newScore = prevScore + questionScore;
        scoreRef.current = newScore;
        return newScore;
      });
    }
  
    // Record answer
    setPlayerAnswers(prev => [
      ...prev, 
      {
        questionId: currentQuestion._id,
        selectedOptionId: optionId,
        isCorrect: isCorrect,
        timeLeft,
        score: questionScore
      }
    ]);
  
    // Show answer
    setShowAnswer(true);
  
    // Clear any existing navigation timeout
    clearTimeout(navigationTimeoutRef.current);
    // Proceed to next question after delay
    navigationTimeoutRef.current = setTimeout(goToNextQuestion, 3000);
  };

  // Handle timeout when no answer is selected
  const handleTimeout = (currentQuestion) => {
    if (!currentQuestion) return;
    
    setIsAnswered(true);
    setSelectedOption(5);
    
    // Record answer as timeout
    setPlayerAnswers(prev => [
      ...prev, 
      {
        questionId: currentQuestion._id,
        selectedOptionId: 5,
        isCorrect: false,
        timeLeft: 0,
        score: 0
      }
    ]);
    
    // Show correct answer
    setShowAnswer(true);
    
    // Clear any existing navigation timeout
    clearTimeout(navigationTimeoutRef.current);
    // Proceed to next question after delay
    navigationTimeoutRef.current = setTimeout(goToNextQuestion, 3000);
  };

  // Go to next question or end quiz
  const goToNextQuestion = () => {
    const nextIndex = currentQuestionIndexRef.current + 1;
    const questions = quizDataRef.current?.questions || [];
    
    if (nextIndex < questions.length) {
      setCurrentQuestionIndex(nextIndex);
      startQuestion(nextIndex);
    } else {
      // End of quiz
      clearInterval(timerRef.current);
      setGameStatus('ended');
      
      // Save results and navigate to results page
      saveResults();
    }
  };

  // Save quiz results
  // Save quiz results
  const saveResults = async () => {
    const results = {
      score: scoreRef.current,
      answers: playerAnswers,
      totalQuestions: quizDataRef.current?.questions?.length || 0,
      quizTitle: quizDataRef.current?.title || ''
    };
  
    try {
      // Only proceed if we have a valid lobby code
      if (lobbyCode && lobbyCode.length === 6) {
        const response = await fetch(`http://localhost:5001/api/lobbies/${lobbyCode}/submit-score`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nickname: playerNickname,
            score: scoreRef.current
          })
        });
  
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
  
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to submit score');
        }
        
        // Only navigate after successful save
        navigate(`/results/${lobbyCode}`, { 
          state: results 
        });
        return; // Exit after successful navigation
      }
  
      // If no lobby code, navigate to regular results page
      navigate(`/results/${quizId}`, { 
        state: results 
      });
  
    } catch (error) {
      console.error("Failed to submit score to lobby:", error);
      // If submission fails, still navigate to results but show error
      navigate(`/results/${quizId}${lobbyCode ? `/${lobbyCode}` : ''}`, { 
        state: { 
          ...results, 
          error: "Failed to save to lobby" 
        } 
      });
    }
  };

  // Format time
  const formatTime = (seconds) => {
    return `${seconds}s`;
  };

  // Calculate progress
  const calculateProgress = () => {
    const total = quizDataRef.current?.questions?.length || 1;
    return (currentQuestionIndexRef.current / total) * 100;
  };

  if (!quizData || !quizData.questions) {
    return (
      <div className="quiz-loading">
        <div className="spinner"></div>
        <p>Loading quiz...</p>
      </div>
    );
  }

  const currentQuestion = quizData.questions[currentQuestionIndex];

  return (
    <div className="play-quiz">
      {gameStatus === 'playing' && (
        <>
          <div className="quiz-header">
            <div className="quiz-progress">
              <div className="progress-text">
                Question {currentQuestionIndex + 1} of {quizData.questions.length}
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${calculateProgress()}%` }}
                ></div>
              </div>
            </div>
            
            <div className="quiz-info">
              <div className="quiz-score">
                Score: <span>{score}</span>
              </div>
              <div className="quiz-timer">
                <div className={`timer-value ${timeLeft < 5 ? 'running-out' : ''}`}>
                  {formatTime(timeLeft)}
                </div>
              </div>
            </div>
          </div>
          
          <div className="question-container">
            <h2 className="question-text">{currentQuestion.text}</h2>
            
            <div className="options-grid">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  className={`option-button ${selectedOption === index ? 'selected' : ''} ${
                    showAnswer 
                      ? index === currentQuestion.correctAnswer
                        ? 'correct' 
                        : selectedOption === index 
                          ? 'incorrect' 
                          : ''
                      : ''
                  }`}
                  onClick={() => handleOptionSelect(index)}
                  disabled={isAnswered}
                >
                  {option}
                </button>
              ))}
            </div>
            
            {showAnswer && (
              <div className="answer-feedback">
                {selectedOption !== null && currentQuestion.correctAnswer === selectedOption ? (
                  <div className="correct-answer">
                    <span className="feedback-icon">✓</span>
                    <span>Correct! +{playerAnswers[playerAnswers.length - 1].score} points</span>
                  </div>
                ) : (
                  <div className="wrong-answer">
                    <span className="feedback-icon">✗</span>
                    <span>
                      {selectedOption !== null
                        ? `Incorrect. The correct answer is: ${currentQuestion.options[currentQuestion.correctAnswer]}`
                        : `Time's up! The correct answer is: ${currentQuestion.options[currentQuestion.correctAnswer]}`}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
      
      {gameStatus === 'ended' && (
        <div className="quiz-ended">
          <div className="quiz-results-summary">
            <h2>Quiz Completed!</h2>
            <div className="final-score">
              <span className="score-label">Final Score</span>
              <span className="score-value">{score}</span>
            </div>
            <p>Calculating your results...</p>
            <div className="spinner"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayQuiz;