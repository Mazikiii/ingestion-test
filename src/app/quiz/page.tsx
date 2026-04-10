"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";

type QuizStatus = {
  status: "not_started" | "in_progress" | "completed" | "expired";
  weekIdentifier: string;
  answeredCount: number;
  totalQuestions: number;
};

type Question = {
  id: string;
  question: string;
  options: string[];
  points: number;
};

type QuizSession = {
  sessionId: string;
  questions: Question[];
  currentIndex: number;
};

type AnswerResult = {
  isCorrect: boolean;
  feedback: string;
  correctIndex: number;
  currentIndex: number;
  totalQuestions: number;
  isCompleted: boolean;
};

type QuizResult = {
  sessionId: string;
  weekIdentifier: string;
  totalPoints: number;
  maxPoints: number;
  correctCount: number;
  totalQuestions: number;
  completedAt: string;
  answers: {
    question: string;
    options: string[];
    selectedIndex: number;
    isCorrect: boolean;
    correctIndex: number;
    points: number;
    feedback: string;
  }[];
};

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>Loading...</div>}>
      <QuizContent />
    </Suspense>
  );
}

function QuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showResult = searchParams.get("result") === "true";

  const [status, setStatus] = useState<QuizStatus | null>(null);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const res = await api.get("/quiz/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (showResult || data.status === "completed") {
          loadResult();
        } else if (data.status === "in_progress") {
          loadCurrentQuiz();
        }
      }
    } catch (e) {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  const loadResult = async () => {
    try {
      const res = await api.get("/quiz/result");
      if (res.ok) {
        setResult(await res.json());
      }
    } catch (e) {
      // Silent fail
    }
  };

  const loadCurrentQuiz = async () => {
    try {
      const res = await api.get("/quiz/current");
      if (res.ok) {
        setSession(await res.json());
      }
    } catch (e) {
      // Silent fail
    }
  };

  const handleStartQuiz = async () => {
    setLoading(true);
    try {
      const res = await api.post("/quiz/start");
      if (res.ok) {
        const data = await res.json();
        setSession(data);
        setStatus({ ...status!, status: "in_progress" });
      }
    } catch (e) {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (selectedOption === null || !session) return;
    setSubmitting(true);
    try {
      const res = await api.post("/quiz/answer", {
        sessionId: session.sessionId,
        questionId: session.questions[session.currentIndex].id,
        selectedIndex: selectedOption,
      });
      if (res.ok) {
        const data = await res.json();
        setAnswerResult(data);
        if (data.isCompleted) {
          await loadResult();
          setStatus((prev) => (prev ? { ...prev, status: "completed" } : prev));
          router.push("/quiz?result=true");
        }
      }
    } catch (e) {
      // Silent fail
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    if (!session || !answerResult) return;
    setSession({ ...session, currentIndex: answerResult.currentIndex });
    setSelectedOption(null);
    setAnswerResult(null);
  };

  if (loading) {
    return (
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        Loading...
      </div>
    );
  }

  if (status?.status === "expired") {
    return (
      <div className="container">
        <header className="header">
          <button className="btn btn-ghost" onClick={() => router.back()}>←</button>
          <h1 className="logo">Quiz</h1>
          <button className="btn btn-ghost" onClick={() => router.push("/home")}>Home</button>
        </header>
        <div className="card">
          <p className="text-center">Quiz has ended</p>
          <p className="text-center" style={{ color: "var(--gray-500)", fontSize: 14, marginTop: 8 }}>
            Come back next Friday
          </p>
        </div>
      </div>
    );
  }

  if (showResult || status?.status === "completed") {
    if (!result) {
      return (
        <div className="container">
          <p>No result available</p>
        </div>
      );
    }

    return (
      <div className="container">
        <header className="header">
          <button className="btn btn-ghost" onClick={() => router.back()}>←</button>
          <h1 className="logo">Quiz Result</h1>
          <button className="btn btn-ghost" onClick={() => router.push("/home")}>Home</button>
        </header>

        <div className="card result-card">
          <p className="result-score">
            {result.totalPoints}/{result.maxPoints}
          </p>
          <p className="result-label">Points</p>
          <p className="result-detail">
            {result.correctCount} of {result.totalQuestions} correct
          </p>
        </div>

        <div className="answers-list">
          {result.answers.map((answer, idx) => (
            <div key={idx} className={`answer-card card ${answer.isCorrect ? "correct" : "wrong"}`}>
              <p className="answer-question">{answer.question}</p>
              <div className="answer-options">
                {answer.options.map((opt, optIdx) => (
                  <p
                    key={optIdx}
                    className={`answer-option ${optIdx === answer.correctIndex ? "correct" : ""} ${optIdx === answer.selectedIndex && !answer.isCorrect ? "wrong" : ""}`}
                  >
                    {opt}
                  </p>
                ))}
              </div>
              {answer.feedback && (
                <p className="answer-feedback">{answer.feedback}</p>
              )}
            </div>
          ))}
        </div>

        <style jsx>{`
          .result-card {
            text-align: center;
            margin-bottom: 24px;
          }
          .result-score {
            font-size: 48px;
            font-weight: 700;
          }
          .result-label {
            font-size: 14px;
            color: var(--gray-500);
          }
          .result-detail {
            font-size: 14px;
            margin-top: 8px;
          }
          .answers-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .answer-card {
            border-left: 4px solid var(--gray-300);
          }
          .answer-card.correct {
            border-left-color: var(--success);
          }
          .answer-card.wrong {
            border-left-color: var(--danger);
          }
          .answer-question {
            font-weight: 500;
            margin-bottom: 12px;
          }
          .answer-options {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .answer-option {
            font-size: 14;
            padding: 8px;
            background: var(--gray-50);
            border-radius: 4px;
          }
          .answer-option.correct {
            background: #dcfce7;
            color: var(--success);
          }
          .answer-option.wrong {
            background: #fee2e2;
            color: var(--danger);
          }
          .answer-feedback {
            margin-top: 12px;
            font-size: 14;
            color: var(--gray-600);
          }
        `}</style>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container">
        <header className="header">
          <button className="btn btn-ghost" onClick={() => router.back()}>←</button>
          <h1 className="logo">Quiz</h1>
          <button className="btn btn-ghost" onClick={() => router.push("/home")}>Home</button>
        </header>

        <div className="card">
          <h2 className="title">Weekly Quiz</h2>
          <p className="subtitle">{status?.totalQuestions} questions - test your financial knowledge</p>
          <button className="btn btn-primary btn-full" onClick={handleStartQuiz} disabled={loading}>
            {loading ? "Please wait..." : "Start Quiz"}
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = session.questions[session.currentIndex];

  return (
    <div className="container">
      <header className="header">
        <button className="btn btn-ghost" onClick={() => router.back()}>←</button>
        <span className="logo">Quiz</span>
        <button className="btn btn-ghost" onClick={() => router.push("/home")}>Home</button>
      </header>

      <p className="quiz-progress">{session.currentIndex + 1}/{session.questions.length}</p>

      {answerResult && (
        <div className={`feedback-card card ${answerResult.isCorrect ? "correct" : "wrong"}`}>
          <p className="feedback-text">{answerResult.feedback}</p>
        </div>
      )}

      <div className="card">
        <p className="question-text">{currentQuestion.question}</p>
        <div className="options">
          {currentQuestion.options.map((option, idx) => (
            <button
              key={idx}
              className={`option-btn ${selectedOption === idx ? "selected" : ""} ${answerResult && idx === answerResult.correctIndex ? "correct" : ""} ${answerResult && selectedOption === idx && !answerResult.isCorrect ? "wrong" : ""}`}
              onClick={() => !answerResult && setSelectedOption(idx)}
              disabled={answerResult !== null}
            >
              {option}
            </button>
          ))}
        </div>

        {!answerResult && (
          <button className="btn btn-primary btn-full" onClick={handleSubmitAnswer} disabled={selectedOption === null || submitting}>
            {submitting ? "Please wait..." : "Submit"}
          </button>
        )}

        {answerResult && !answerResult.isCompleted && (
          <button className="btn btn-primary btn-full" onClick={handleNextQuestion}>
            Next Question
          </button>
        )}
      </div>

      <style jsx>{`
        .quiz-progress {
          text-align: center;
          color: var(--gray-500);
          font-size: 13px;
          margin-bottom: 12px;
        }
        .feedback-card {
          margin-bottom: 16px;
          border-left: 4px solid;
        }
        .feedback-card.correct {
          border-left-color: var(--success);
          background: #dcfce7;
        }
        .feedback-card.wrong {
          border-left-color: var(--danger);
          background: #fee2e2;
        }
        .feedback-text {
          font-size: 14;
        }
        .question-text {
          font-size: 18px;
          font-weight: 500;
          margin-bottom: 24px;
        }
        .options {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }
        .option-btn {
          padding: 16px;
          border: 1px solid var(--gray-300);
          border-radius: 8px;
          background: var(--background);
          text-align: left;
          cursor: pointer;
          font-size: 14;
        }
        .option-btn:hover:not(:disabled) {
          background: var(--gray-50);
        }
        .option-btn.selected {
          border-color: var(--primary);
          background: #eff6ff;
        }
        .option-btn.correct {
          border-color: var(--success);
          background: #dcfce7;
        }
        .option-btn.wrong {
          border-color: var(--danger);
          background: #fee2e2;
        }
      `}</style>
    </div>
  );
}
