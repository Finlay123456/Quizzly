import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './PlayQuiz.css';

const PlayQuiz = () => {
  const { id: quizId } = useParams();
  const navigate = useNavigate();
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
  const timerRef = useRef(null);
  
  // Load player info and quiz data
  useEffect(() => {
    const storedPlayer = sessionStorage.getItem('quizzlyPlayer');
    if (storedPlayer) {
      const playerData = JSON.parse(storedPlayer);
      setPlayerNickname(playerData.nickname);
    }
    fetchQuizData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
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
    if (!quiz || !quiz.questions[index]) return;
    
    const question = quiz.questions[index];
    const questionTime = question.timeLimit || quiz.timeLimit; // Adjusted to use quiz timeLimit

    setIsAnswered(false);
    setSelectedOption(null);
    setShowAnswer(false);
    setTimeLeft(questionTime);
    
    // Start timer
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timerRef.current);
          if (!isAnswered) handleTimeout();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  };
  
  // Handle option selection
  const handleOptionSelect = (optionId) => {
    if (isAnswered) return;
  
    const currentQuestion = quizData.questions[currentQuestionIndex];
  
    // Get the selected option value from the options array using the optionId
    const selectedOpt = currentQuestion.options[optionId];
  
    if (!selectedOpt) {
      console.error("Selected option not found!");
      return;
    }
  
    setSelectedOption(optionId);
    setIsAnswered(true);
  
    // Determine if the selected option is correct
    const isCorrect = currentQuestion.correctAnswer === optionId;
  
    // Calculate score based on time left
    let questionScore = 0;
    if (isCorrect) {
      const timeBonus = Math.floor((timeLeft / currentQuestion.timeLimit) * 50);
      questionScore = currentQuestion.points + timeBonus;
      setScore(prevScore => prevScore + questionScore);
    }
  
    // Record answer
    setPlayerAnswers(prev => [
      ...prev, 
      {
        questionId: currentQuestion._id, // Adjusted to use question's _id
        selectedOptionId: optionId,
        isCorrect: isCorrect,
        timeLeft,
        score: questionScore
      }
    ]);
  
    // Show answer if enabled in settings
    setShowAnswer(true);
  
    // Proceed to next question after delay
    setTimeout(() => {
      goToNextQuestion();
    }, 3000);
  };
  
  // Handle timeout when no answer is selected
  const handleTimeout = () => {
    const currentQuestion = quizData.questions[currentQuestionIndex];
    
    setIsAnswered(true);
    
    // Record answer as timeout
    setPlayerAnswers(prev => [
      ...prev, 
      {
        questionId: currentQuestion._id, // Adjusted to use question's _id
        selectedOptionId: null,
        isCorrect: false,
        timeLeft: 0,
        score: 0
      }
    ]);
    
    // Show correct answer
    setShowAnswer(true);
    
    // Proceed to next question after delay
    setTimeout(() => {
      goToNextQuestion();
    }, 3000);
  };
  
  // Go to next question or end quiz
  const goToNextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    
    if (nextIndex < quizData.questions.length) {
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
  const saveResults = () => {
    // In a real app, send results to server
    console.log('Quiz completed with score:', score);
    console.log('Player answers:', playerAnswers);
    
    // Navigate to results page after a delay
    setTimeout(() => {
      navigate(`/results/${quizId}`, { 
        state: { 
          score, 
          answers: playerAnswers,
          totalQuestions: quizData.questions.length,
          quizTitle: quizData.title
        } 
      });
    }, 3000);
  };
  
  // Format time
  const formatTime = (seconds) => {
    return `${seconds}s`;
  };
  
  // Calculate progress
  const calculateProgress = () => {
    if (!quizData) return 0;
    return ((currentQuestionIndex) / quizData.questions.length) * 100;
  };
  
  if (!quizData) {
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
