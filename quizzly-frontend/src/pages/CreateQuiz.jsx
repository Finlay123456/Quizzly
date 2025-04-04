import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CreateQuiz.css';

const CreateQuiz = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [quizData, setQuizData] = useState({
    title: '',
    description: '',
    category: '',
    isPublic: true,
    showAnswers: true,
    randomizeQuestions: false,
    questions: []
  });

  const [currentQuestion, setCurrentQuestion] = useState({
    text: '',
    type: 'multiple',
    timeLimit: 30,
    points: 100,
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ],
    image: null
  });

  const categories = [
    'Education', 'Science', 'History', 'Geography', 
    'Entertainment', 'Sports', 'Technology', 'Art & Literature',
    'Music', 'Movies & TV', 'Business', 'Other'
  ];

  const handleQuizDataChange = (e) => {
    const { name, value, type, checked } = e.target;
    setQuizData({
      ...quizData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleQuestionChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentQuestion({
      ...currentQuestion,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleOptionChange = (index, e) => {
    const { value } = e.target;
    const updatedOptions = [...currentQuestion.options];
    updatedOptions[index] = { ...updatedOptions[index], text: value };
    setCurrentQuestion({ ...currentQuestion, options: updatedOptions });
  };

  const handleCorrectOptionChange = (index) => {
    const updatedOptions = currentQuestion.options.map((option, i) => ({
      ...option,
      isCorrect: i === index
    }));
    setCurrentQuestion({ ...currentQuestion, options: updatedOptions });
  };

  const addOption = () => {
    if (currentQuestion.options.length < 6) {
      setCurrentQuestion({
        ...currentQuestion,
        options: [...currentQuestion.options, { text: '', isCorrect: false }]
      });
    }
  };

  const removeOption = (index) => {
    if (currentQuestion.options.length > 2) {
      const updatedOptions = currentQuestion.options.filter((_, i) => i !== index);
      
      // If we're removing the correct option, make the first one correct
      let needsNewCorrect = currentQuestion.options[index].isCorrect;
      
      if (needsNewCorrect) {
        updatedOptions[0] = { ...updatedOptions[0], isCorrect: true };
      }
      
      setCurrentQuestion({ ...currentQuestion, options: updatedOptions });
    }
  };

  const addQuestion = () => {
    // Validate question data
    if (!currentQuestion.text.trim()) {
      alert('Please enter a question.');
      return;
    }

    // Check if at least one option is marked as correct
    const hasCorrectOption = currentQuestion.options.some(opt => opt.isCorrect);
    if (!hasCorrectOption) {
      alert('Please mark at least one option as correct.');
      return;
    }

    // Check if all options have text
    const allOptionsHaveText = currentQuestion.options.every(opt => opt.text.trim());
    if (!allOptionsHaveText) {
      alert('Please fill in all option fields.');
      return;
    }

    // Add question to quiz data
    const updatedQuestions = [...quizData.questions, { ...currentQuestion, id: Date.now() }];
    setQuizData({ ...quizData, questions: updatedQuestions });

    // Reset current question form
    setCurrentQuestion({
      text: '',
      type: 'multiple',
      timeLimit: 30,
      points: 100,
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ],
      image: null
    });
  };

  const editQuestion = (index) => {
    setCurrentQuestion({ ...quizData.questions[index] });
    
    // Remove the question from the list
    const updatedQuestions = quizData.questions.filter((_, i) => i !== index);
    setQuizData({ ...quizData, questions: updatedQuestions });
  };

  const removeQuestion = (index) => {
    const updatedQuestions = quizData.questions.filter((_, i) => i !== index);
    setQuizData({ ...quizData, questions: updatedQuestions });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (step === 1) {
      if (!quizData.title.trim() || !quizData.description.trim() || !quizData.category) {
        alert('Please fill in all required fields.');
        return;
      }
      setStep(2);
      return;
    }
  
    if (quizData.questions.length === 0) {
      alert('Your quiz needs at least one question.');
      return;
    }
  
    const formattedQuiz = {
      title: quizData.title,
      description: quizData.description,
      category: quizData.category,
      isPublic: quizData.isPublic,
      timeLimit: quizData.timeLimit,
      questions: quizData.questions.map(question => ({
        text: question.text,
        timeLimit: question.timeLimit,
        options: question.options.map(option => option.text),
        correctAnswer: question.options.findIndex(option => option.isCorrect),
        points: question.points
      }))
    };
  
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/create-quiz`, {
        method: "POST",
        mode: "cors", // Explicitly enable CORS
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedQuiz)
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      
      if (data.success) {
        alert("Quiz created successfully!");
        navigate("/dashboard");
      } else {
        alert(data.error || "Failed to create quiz");
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
      alert("Failed to connect to server. Please try again.");
    }
  };

  return (
    <div className="create-quiz">
      <div className="create-quiz-header">
        <h1>{step === 1 ? 'Create New Quiz' : 'Add Questions'}</h1>
        <div className="steps-indicator">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-text">Basic Info</span>
          </div>
          <div className="step-line"></div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-text">Questions</span>
          </div>
        </div>
      </div>

      {step === 1 ? (
        <div className="quiz-info-form">
          <div className="card">
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="title" className="form-label">Quiz Title *</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    className="form-control"
                    value={quizData.title}
                    onChange={handleQuizDataChange}
                    placeholder="Enter a title for your quiz"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="description" className="form-label">Description *</label>
                  <textarea
                    id="description"
                    name="description"
                    className="form-control"
                    value={quizData.description}
                    onChange={handleQuizDataChange}
                    placeholder="Describe your quiz"
                    rows="3"
                    required
                  ></textarea>
                </div>

                <div className="form-group">
                  <label htmlFor="category" className="form-label">Category *</label>
                  <select
                    id="category"
                    name="category"
                    className="form-control"
                    value={quizData.category}
                    onChange={handleQuizDataChange}
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                </div>

                <div className="form-options">
                  <div className="form-option">
                    <input
                      type="checkbox"
                      id="isPublic"
                      name="isPublic"
                      checked={quizData.isPublic}
                      onChange={handleQuizDataChange}
                    />
                    <label htmlFor="isPublic">Make this quiz public</label>
                  </div>

                  <div className="form-option">
                    <input
                      type="checkbox"
                      id="showAnswers"
                      name="showAnswers"
                      checked={quizData.showAnswers}
                      onChange={handleQuizDataChange}
                    />
                    <label htmlFor="showAnswers">Show answers after each question</label>
                  </div>

                  <div className="form-option">
                    <input
                      type="checkbox"
                      id="randomizeQuestions"
                      name="randomizeQuestions"
                      checked={quizData.randomizeQuestions}
                      onChange={handleQuizDataChange}
                    />
                    <label htmlFor="randomizeQuestions">Randomize question order</label>
                  </div>
                </div>

                <div className="form-buttons">
                  <button type="submit" className="btn btn-primary">
                    Next: Add Questions
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <div className="quiz-questions-form">
          <div className="questions-list">
            <h2>Questions ({quizData.questions.length})</h2>
            
            {quizData.questions.length === 0 ? (
              <div className="empty-questions">
                <p>No questions added yet. Create your first question below!</p>
              </div>
            ) : (
              <div className="questions-grid">
                {quizData.questions.map((q, index) => (
                  <div key={q.id} className="question-card">
                    <div className="question-number">{index + 1}</div>
                    <div className="question-content">
                      <h3>{q.text}</h3>
                      <div className="question-meta">
                        <span>{q.type === 'multiple' ? 'Multiple Choice' : 'True/False'}</span>
                        <span>{q.timeLimit}s</span>
                        <span>{q.points} pts</span>
                      </div>
                    </div>
                    <div className="question-actions">
                      <button 
                        type="button" 
                        className="btn-icon edit"
                        onClick={() => editQuestion(index)}
                      >
                        ✏️
                      </button>
                      <button 
                        type="button" 
                        className="btn-icon delete"
                        onClick={() => removeQuestion(index)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="add-question-form card">
            <div className="card-header">
              <h2>Add New Question</h2>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label htmlFor="questionText" className="form-label">Question Text *</label>
                <textarea
                  id="questionText"
                  name="text"
                  className="form-control"
                  value={currentQuestion.text}
                  onChange={handleQuestionChange}
                  placeholder="Enter your question"
                  rows="2"
                ></textarea>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="questionTimeLimit" className="form-label">Time Limit (seconds)</label>
                  <input
                    type="number"
                    id="questionTimeLimit"
                    name="timeLimit"
                    className="form-control"
                    value={currentQuestion.timeLimit}
                    onChange={handleQuestionChange}
                    min="5"
                    max="300"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="questionPoints" className="form-label">Points</label>
                  <input
                    type="number"
                    id="questionPoints"
                    name="points"
                    className="form-control"
                    value={currentQuestion.points}
                    onChange={handleQuestionChange}
                    min="10"
                    max="1000"
                    step="10"
                  />
                </div>
              </div>

              <div className="options-container">
                <label className="form-label">Answer Options *</label>
                
                {currentQuestion.type === 'truefalse' ? (
                  <div className="truefalse-options">
                    <div className="option-row">
                      <input
                        type="radio"
                        id="optionTrue"
                        name="correctOption"
                        checked={currentQuestion.options[0]?.isCorrect}
                        onChange={() => handleCorrectOptionChange(0)}
                      />
                      <label htmlFor="optionTrue">True</label>
                    </div>
                    <div className="option-row">
                      <input
                        type="radio"
                        id="optionFalse"
                        name="correctOption"
                        checked={currentQuestion.options[1]?.isCorrect}
                        onChange={() => handleCorrectOptionChange(1)}
                      />
                      <label htmlFor="optionFalse">False</label>
                    </div>
                  </div>
                ) : (
                  <div className="multiple-options">
                    {currentQuestion.options.map((option, index) => (
                      <div key={index} className="option-row">
                        <input
                          type="radio"
                          id={`option${index}`}
                          name="correctOption"
                          checked={option.isCorrect}
                          onChange={() => handleCorrectOptionChange(index)}
                        />
                        <input
                          type="text"
                          className="form-control option-text"
                          value={option.text}
                          onChange={(e) => handleOptionChange(index, e)}
                          placeholder={`Option ${index + 1}`}
                        />
                        <button
                          type="button"
                          className="btn-icon remove-option"
                          onClick={() => removeOption(index)}
                          disabled={currentQuestion.options.length <= 2}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    
                    {currentQuestion.options.length < 6 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline add-option"
                        onClick={addOption}
                      >
                        + Add Option
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="question-buttons">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={addQuestion}
                >
                  Add Question
                </button>
              </div>
            </div>
          </div>

          <div className="finish-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setStep(1)}
            >
              Back to Quiz Details
            </button>
            <button
              type="button"
              className="btn btn-accent"
              onClick={handleSubmit}
              disabled={quizData.questions.length === 0}
            >
              Finish & Save Quiz
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateQuiz;