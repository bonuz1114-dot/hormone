import React, {
  useEffect,
  useState
} from 'react';

import {
  BrowserRouter,
  Routes,
  Route
} from 'react-router-dom';

import { io } from 'socket.io-client';

import {
  ALL_QUESTIONS
} from './component/question';

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  'http://localhost:10000';

const socket = io(BACKEND_URL, {
  autoConnect: true
});

const QUESTION_TIME = 15;

function App() {
  const [gameMode, setGameMode] =
    useState('SINGLE');

  const [multiplayerSubState, setMultiplayerSubState] =
    useState('CHOICE');

  const [gameState, setGameState] =
    useState('HOME');

  const [playerName, setPlayerName] =
    useState('');

  const [roomCode, setRoomCode] =
    useState('');

  const [players, setPlayers] =
    useState([]);

  const [isHost, setIsHost] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState('');

  const [currentQuestions, setCurrentQuestions] =
    useState([]);

  const [currentQuestionIndex, setCurrentQuestionIndex] =
    useState(0);

  const [score, setScore] =
    useState(0);

  const [streak, setStreak] =
    useState(0);

  const [maxStreak, setMaxStreak] =
    useState(0);

  const [startTime, setStartTime] =
    useState(null);

  const [selectedAnswer, setSelectedAnswer] =
    useState(null);

  const [isShowingFeedback, setIsShowingFeedback] =
    useState(false);

  const [feedbackType, setFeedbackType] =
    useState(null);

  const [timeLeft, setTimeLeft] =
    useState(QUESTION_TIME);

  const [singlePlayerFinalScore, setSinglePlayerFinalScore] =
    useState(0);

  const [leaderboard, setLeaderboard] =
    useState([]);

  const [hasSubmitted, setHasSubmitted] =
    useState(false);

  const currentQuestion =
    currentQuestions[currentQuestionIndex];

  // ---------------------------------------
  // SOCKET EVENTS
  // ---------------------------------------

  useEffect(() => {
    socket.on(
      'room_created',
      ({ roomCode }) => {
        setRoomCode(roomCode);
        setGameState('LOBBY');
        setIsHost(true);
      }
    );

    socket.on(
      'update_players',
      (updatedPlayers) => {
        setPlayers(updatedPlayers);
      }
    );

    socket.on(
      'game_started_by_host',
      ({ shuffledQuestionsList }) => {
        setCurrentQuestions(
          shuffledQuestionsList
        );

        setCurrentQuestionIndex(0);
        setScore(0);
        setStreak(0);
        setMaxStreak(0);
        setSelectedAnswer(null);
        setIsShowingFeedback(false);
        setFeedbackType(null);
        setHasSubmitted(false);
        setTimeLeft(QUESTION_TIME);
        setStartTime(Date.now());

        setGameState('QUIZ');
      }
    );

    socket.on(
      'game_over',
      (results) => {
        setLeaderboard(results);
        setGameState('LEADERBOARD');
      }
    );

    socket.on(
      'host_disconnected',
      ({ message }) => {
        alert(message);
        resetToHome();
      }
    );

    return () => {
      socket.off('room_created');
      socket.off('update_players');
      socket.off(
        'game_started_by_host'
      );
      socket.off('game_over');
      socket.off('host_disconnected');
    };
  }, []);

  // ---------------------------------------
  // TIMER
  // ---------------------------------------

  useEffect(() => {
    if (
      gameState !== 'QUIZ' ||
      isShowingFeedback ||
      !currentQuestion
    ) {
      return;
    }

    setTimeLeft(QUESTION_TIME);

    const timer = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          clearInterval(timer);

          handleAnswerQuestion(
            null,
            true
          );

          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [
    gameState,
    currentQuestionIndex,
    isShowingFeedback
  ]);

  // ---------------------------------------
  // RESET
  // ---------------------------------------

  const resetToHome = () => {
    setGameState('HOME');

    setMultiplayerSubState(
      'CHOICE'
    );

    setPlayerName('');
    setRoomCode('');
    setPlayers([]);

    setIsHost(false);

    setErrorMessage('');

    setCurrentQuestions([]);
    setCurrentQuestionIndex(0);

    setScore(0);
    setStreak(0);
    setMaxStreak(0);

    setStartTime(null);

    setSelectedAnswer(null);
    setIsShowingFeedback(false);
    setFeedbackType(null);

    setTimeLeft(QUESTION_TIME);

    setSinglePlayerFinalScore(0);

    setLeaderboard([]);

    setHasSubmitted(false);
  };

  // ---------------------------------------
  // SHUFFLE
  // ---------------------------------------

  const shuffleArray = (array) => {
    return [...array].sort(
      () => Math.random() - 0.5
    );
  };

  // ---------------------------------------
  // SINGLE PLAYER
  // ---------------------------------------

  const startSinglePlayer = () => {
    if (!playerName.trim()) {
      setErrorMessage(
        'กรุณาใส่ชื่อผู้เล่น'
      );

      return;
    }

    const shuffled =
      shuffleArray(ALL_QUESTIONS);

    setCurrentQuestions(shuffled);

    setCurrentQuestionIndex(0);

    setScore(0);
    setStreak(0);
    setMaxStreak(0);

    setSelectedAnswer(null);
    setIsShowingFeedback(false);
    setFeedbackType(null);

    setSinglePlayerFinalScore(0);

    setTimeLeft(QUESTION_TIME);

    setStartTime(Date.now());

    setGameState('QUIZ');

    setErrorMessage('');
  };

  // ---------------------------------------
  // CREATE ROOM
  // ---------------------------------------

  const createRoom = () => {
    if (!playerName.trim()) {
      setErrorMessage(
        'กรุณาใส่ชื่อผู้เล่น'
      );

      return;
    }

    setErrorMessage('');

    socket.emit(
      'create_room',
      {
        playerName:
          playerName.trim()
      }
    );
  };

  // ---------------------------------------
  // JOIN ROOM
  // ---------------------------------------

  const joinRoom = () => {
    if (!playerName.trim()) {
      setErrorMessage(
        'กรุณาใส่ชื่อผู้เล่น'
      );

      return;
    }

    if (!roomCode.trim()) {
      setErrorMessage(
        'กรุณาใส่รหัสห้อง'
      );

      return;
    }

    socket.emit(
      'join_room',
      {
        roomCode:
          roomCode.trim(),
        playerName:
          playerName.trim()
      },
      (response) => {
        if (!response.success) {
          setErrorMessage(
            response.message
          );

          return;
        }

        setErrorMessage('');
        setGameState('LOBBY');
        setIsHost(false);
      }
    );
  };

  // ---------------------------------------
  // START MULTIPLAYER
  // ---------------------------------------

  const startMultiplayerGame = () => {
    if (!isHost) {
      return;
    }

    const shuffled =
      shuffleArray(ALL_QUESTIONS);

    socket.emit(
      'start_game',
      {
        roomCode,
        shuffledQuestionsList:
          shuffled
      }
    );
  };

  // ---------------------------------------
  // ANSWER
  // ---------------------------------------

  const handleAnswerQuestion = (
    selectedOptionIndex,
    isTimeout = false
  ) => {
    if (
      isShowingFeedback ||
      !currentQuestion
    ) {
      return;
    }

    const correctAnswerIndex =
      currentQuestion.answer;

    const isCorrect =
      !isTimeout &&
      selectedOptionIndex ===
        correctAnswerIndex;

    let newScore = score;
    let newStreak = streak;

    if (isCorrect) {
      newScore =
        score + 1;

      newStreak =
        streak + 1;

      setScore(newScore);

      setStreak(newStreak);

      setMaxStreak(
        (previous) =>
          Math.max(
            previous,
            newStreak
          )
      );
    } else {
      newStreak = 0;

      setStreak(0);
    }

    setSelectedAnswer(
      selectedOptionIndex
    );

    setSinglePlayerFinalScore(
      newScore
    );

    setFeedbackType(
      isTimeout
        ? 'timeout'
        : isCorrect
          ? 'correct'
          : 'wrong'
    );

    setIsShowingFeedback(true);
  };

  // ---------------------------------------
  // NEXT QUESTION
  // ---------------------------------------

  const proceedToNextQuestion = () => {
    if (
      currentQuestionIndex + 1 >=
      currentQuestions.length
    ) {
      finishGame();
      return;
    }

    setCurrentQuestionIndex(
      (previous) =>
        previous + 1
    );

    setSelectedAnswer(null);

    setIsShowingFeedback(false);

    setFeedbackType(null);

    setTimeLeft(QUESTION_TIME);
  };

  // ---------------------------------------
  // FINISH GAME
  // ---------------------------------------

  const finishGame = () => {
    const finalTime =
      startTime
        ? (Date.now() - startTime) /
          1000
        : 0;

    if (gameMode === 'SINGLE') {
      const finalPlayer = {
        id: 'single-player',
        name:
          playerName ||
          'Player',
        score:
          singlePlayerFinalScore,
        timeUsed: finalTime,
        maxStreak:
          maxStreak,
        isHost: true,
        submitted: true
      };

      setLeaderboard([
        finalPlayer
      ]);

      setGameState(
        'LEADERBOARD'
      );

      return;
    }

    if (
      gameMode ===
        'MULTIPLAYER' &&
      !hasSubmitted
    ) {
      setHasSubmitted(true);

      socket.emit(
        'submit_results',
        {
          roomCode,
          score:
            singlePlayerFinalScore,
          timeUsed:
            finalTime,
          maxStreak
        }
      );
    }
  };

  // ---------------------------------------
  // QUIT SINGLE PLAYER
  // ---------------------------------------

  const handleQuitGame = () => {
    resetToHome();
  };

  // ---------------------------------------
  // RENDER HOME
  // ---------------------------------------

  if (gameState === 'HOME') {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">

        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">

          <div className="text-center mb-8">

            <div className="text-5xl mb-3">
              🧬
            </div>

            <h1 className="text-3xl font-black text-stone-800">
              Hormone Quiz
            </h1>

            <p className="text-stone-500 mt-2">
              ทดสอบความรู้เรื่องฮอร์โมน
            </p>

          </div>

          <input
            type="text"
            value={playerName}
            onChange={(e) =>
              setPlayerName(
                e.target.value
              )
            }
            placeholder="ชื่อผู้เล่น"
            className="w-full border border-stone-300 rounded-xl p-3 mb-4 outline-none focus:ring-2 focus:ring-amber-400"
          />

          {errorMessage && (
            <div className="bg-rose-50 text-rose-700 border border-rose-200 rounded-xl p-3 mb-4 text-sm">
              {errorMessage}
            </div>
          )}

          <div className="space-y-3">

            <button
              onClick={() => {
                setGameMode('SINGLE');
                startSinglePlayer();
              }}
              className="w-full bg-amber-700 hover:bg-amber-600 text-white rounded-xl p-4 font-bold transition"
            >
              🎮 เล่นคนเดียว
            </button>

            <button
              onClick={() => {
                setGameMode(
                  'MULTIPLAYER'
                );

                setMultiplayerSubState(
                  'CHOICE'
                );

                setErrorMessage('');
              }}
              className="w-full bg-stone-800 hover:bg-stone-700 text-white rounded-xl p-4 font-bold transition"
            >
              👥 เล่นหลายคน
            </button>

          </div>

          {gameMode ===
            'MULTIPLAYER' && (
            <div className="mt-6 space-y-3">

              {multiplayerSubState ===
                'CHOICE' && (
                <>
                  <button
                    onClick={() =>
                      setMultiplayerSubState(
                        'CREATE'
                      )
                    }
                    className="w-full border border-amber-600 text-amber-700 rounded-xl p-3 font-bold"
                  >
                    👑 สร้างห้อง
                  </button>

                  <button
                    onClick={() =>
                      setMultiplayerSubState(
                        'JOIN'
                      )
                    }
                    className="w-full border border-stone-400 text-stone-700 rounded-xl p-3 font-bold"
                  >
                    🚪 เข้าร่วมห้อง
                  </button>
                </>
              )}

              {multiplayerSubState ===
                'CREATE' && (
                <>
                  <button
                    onClick={
                      createRoom
                    }
                    className="w-full bg-amber-700 text-white rounded-xl p-3 font-bold"
                  >
                    สร้างห้อง
                  </button>

                  <button
                    onClick={() =>
                      setMultiplayerSubState(
                        'CHOICE'
                      )
                    }
                    className="w-full text-stone-500"
                  >
                    ← กลับ
                  </button>
                </>
              )}

              {multiplayerSubState ===
                'JOIN' && (
                <>
                  <input
                    value={roomCode}
                    onChange={(e) =>
                      setRoomCode(
                        e.target.value.toUpperCase()
                      )
                    }
                    placeholder="รหัสห้อง"
                    maxLength={6}
                    className="w-full border border-stone-300 rounded-xl p-3 text-center tracking-widest uppercase"
                  />

                  <button
                    onClick={
                      joinRoom
                    }
                    className="w-full bg-stone-800 text-white rounded-xl p-3 font-bold"
                  >
                    เข้าร่วมห้อง
                  </button>

                  <button
                    onClick={() =>
                      setMultiplayerSubState(
                        'CHOICE'
                      )
                    }
                    className="w-full text-stone-500"
                  >
                    ← กลับ
                  </button>
                </>
              )}

            </div>
          )}

        </div>
      </div>
    );
  }

  // ---------------------------------------
  // LOBBY
  // ---------------------------------------

  if (gameState === 'LOBBY') {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">

        <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl p-8">

          <div className="text-center">

            <p className="text-stone-500">
              รหัสห้อง
            </p>

            <div className="text-4xl font-black tracking-widest text-amber-700 my-3">
              {roomCode}
            </div>

          </div>

          <div className="border-t border-stone-200 my-6" />

          <h2 className="font-bold text-xl mb-4">
            👥 ผู้เล่น
          </h2>

          <div className="space-y-2">

            {players.map(
              (player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between bg-stone-50 rounded-xl p-3"
                >
                  <span className="font-semibold">
                    {player.isHost &&
                      '👑 '}
                    {player.name}
                  </span>

                  <span className="text-xs text-stone-400">
                    {player.submitted
                      ? 'ส่งแล้ว'
                      : 'พร้อม'}
                  </span>
                </div>
              )
            )}

          </div>

          <div className="mt-6">

            {isHost ? (
              <button
                onClick={
                  startMultiplayerGame
                }
                disabled={
                  players.length <
                  1
                }
                className="w-full bg-amber-700 hover:bg-amber-600 text-white rounded-xl p-4 font-bold"
              >
                🚀 เริ่มเกม
              </button>
            ) : (
              <div className="text-center text-stone-500 bg-stone-50 rounded-xl p-4">
                รอโฮสต์เริ่มเกม...
              </div>
            )}

          </div>

        </div>
      </div>
    );
  }

  // ---------------------------------------
  // LEADERBOARD
  // ---------------------------------------

  if (
    gameState ===
    'LEADERBOARD'
  ) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">

        <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl p-8">

          <div className="text-center mb-8">

            <div className="text-5xl mb-3">
              🏆
            </div>

            <h1 className="text-3xl font-black text-stone-800">
              ผลการแข่งขัน
            </h1>

          </div>

          <div className="space-y-3">

            {leaderboard.map(
              (player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between rounded-2xl p-4 ${
                    index === 0
                      ? 'bg-amber-100 border border-amber-300'
                      : 'bg-stone-50'
                  }`}
                >

                  <div className="flex items-center gap-3">

                    <div className="text-2xl">
                      {index === 0
                        ? '🥇'
                        : index === 1
                          ? '🥈'
                          : index === 2
                            ? '🥉'
                            : `${index + 1}.`}
                    </div>

                    <div>
                      <p className="font-bold">
                        {player.name}
                      </p>

                      <p className="text-xs text-stone-500">
                        🔥 Max Combo:{' '}
                        {player.maxStreak ||
                          0}
                      </p>
                    </div>

                  </div>

                  <div className="text-right">
                    <p className="font-black text-lg">
                      {player.score}/
                      {currentQuestions.length ||
                        ALL_QUESTIONS.length}
                    </p>

                    <p className="text-xs text-stone-500">
                      {Number(
                        player.timeUsed ||
                          0
                      ).toFixed(1)}
                      s
                    </p>
                  </div>

                </div>
              )
            )}

          </div>

          <button
            onClick={
              resetToHome
            }
            className="w-full mt-6 bg-stone-800 hover:bg-stone-700 text-white rounded-xl p-4 font-bold"
          >
            🏠 กลับหน้าหลัก
          </button>

        </div>
      </div>
    );
  }

  // ---------------------------------------
  // QUIZ
  // ---------------------------------------

  if (
    gameState === 'QUIZ' &&
    currentQuestion
  ) {
    const progress =
      ((currentQuestionIndex + 1) /
        currentQuestions.length) *
      100;

    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">

        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl p-6 md:p-8">

          {/* TOP BAR */}

          <div className="flex items-center justify-between mb-4">

            <div>
              <p className="text-sm text-stone-500">
                ข้อ
              </p>

              <p className="font-black text-xl">
                {currentQuestionIndex + 1}
                {' / '}
                {currentQuestions.length}
              </p>
            </div>

            <div className="flex gap-3">

              <div className="bg-amber-50 text-amber-700 rounded-xl px-3 py-2 text-sm font-bold">
                ⭐ {score}
              </div>

              <div className="bg-orange-50 text-orange-700 rounded-xl px-3 py-2 text-sm font-bold">
                🔥 {streak}
              </div>

              <div
                className={`rounded-xl px-3 py-2 text-sm font-bold ${
                  timeLeft <= 5
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-stone-100 text-stone-700'
                }`}
              >
                ⏱️ {timeLeft}s
              </div>

            </div>

          </div>

          {/* EXIT */}

          {gameMode ===
            'SINGLE' && (
            <div className="flex justify-end mb-3">

              <button
                onClick={
                  handleQuitGame
                }
                className="text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-2 rounded-lg transition"
              >
                ✕ ออกกลางคัน
              </button>

            </div>
          )}

          {/* PROGRESS */}

          <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden mb-6">

            <div
              className="h-full bg-amber-600 transition-all duration-300"
              style={{
                width: `${progress}%`
              }}
            />

          </div>

          {/* QUESTION */}

          <div className="mb-6">

            <h2 className="text-xl md:text-2xl font-black text-stone-800 leading-relaxed">
              {currentQuestion.question}
            </h2>

          </div>

          {/* OPTIONS */}

          <div className="grid gap-3">

            {currentQuestion.options.map(
              (option, index) => {

                const isCorrect =
                  index ===
                  currentQuestion.answer;

                const isSelected =
                  index ===
                  selectedAnswer;

                let className =
                  'w-full text-left p-4 rounded-xl border-2 transition font-semibold ';

                if (
                  isShowingFeedback
                ) {
                  if (
                    isCorrect
                  ) {
                    className +=
                      'border-emerald-500 bg-emerald-50 text-emerald-800';
                  } else if (
                    isSelected
                  ) {
                    className +=
                      'border-rose-500 bg-rose-50 text-rose-800';
                  } else {
                    className +=
                      'border-stone-200 bg-stone-50 text-stone-500';
                  }
                } else {
                  className +=
                    'border-stone-200 hover:border-amber-500 hover:bg-amber-50';
                }

                return (
                  <button
                    key={index}
                    disabled={
                      isShowingFeedback
                    }
                    onClick={() =>
                      handleAnswerQuestion(
                        index
                      )
                    }
                    className={
                      className
                    }
                  >
                    <div className="flex items-center gap-3">

                      <span className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-200 text-sm">
                        {String.fromCharCode(
                          65 + index
                        )}
                      </span>

                      <span>
                        {option}
                      </span>

                      {isShowingFeedback &&
                        isCorrect && (
                          <span className="ml-auto">
                            ✅
                          </span>
                        )}

                      {isShowingFeedback &&
                        isSelected &&
                        !isCorrect && (
                          <span className="ml-auto">
                            ❌
                          </span>
                        )}

                    </div>
                  </button>
                );
              }
            )}

          </div>

          {/* FEEDBACK */}

          {isShowingFeedback && (
            <div className="mt-6 pt-5 border-t border-stone-200 space-y-4">

              {/* RESULT */}

              <div className="text-center">

                {feedbackType ===
                  'correct' && (
                  <div className="inline-block text-emerald-700 bg-emerald-50 px-5 py-3 rounded-xl border border-emerald-200">

                    <p className="font-black text-lg">
                      🎉 ตอบถูก!
                    </p>

                    {streak >= 2 && (
                      <p className="text-sm mt-1">
                        🔥 {streak}{' '}
                        Combo!
                      </p>
                    )}

                  </div>
                )}

                {feedbackType ===
                  'wrong' && (
                  <div className="inline-block text-rose-700 bg-rose-50 px-5 py-3 rounded-xl border border-rose-200">

                    <p className="font-black text-lg">
                      ❌ ตอบไม่ถูก
                    </p>

                  </div>
                )}

                {feedbackType ===
                  'timeout' && (
                  <div className="inline-block text-amber-700 bg-amber-50 px-5 py-3 rounded-xl border border-amber-200">

                    <p className="font-black text-lg">
                      ⏰ หมดเวลา!
                    </p>

                    <p className="text-sm mt-1">
                      ไม่ได้รับคะแนนสำหรับข้อนี้
                    </p>

                  </div>
                )}

              </div>

              {/* EXPLANATION */}

              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">

                <p className="font-black text-blue-900 mb-3">
                  🧠 เฉลย
                </p>

                <div className="space-y-2 text-sm">

                  <p className="text-blue-900">

                    <span className="font-bold">
                      คำตอบที่ถูก:
                    </span>{' '}

                    {currentQuestion.options[
                      currentQuestion.answer
                    ]}

                  </p>

                  {selectedAnswer !==
                    null ? (
                    <p className="text-blue-900">

                      <span className="font-bold">
                        คำตอบของคุณ:
                      </span>{' '}

                      {currentQuestion.options[
                        selectedAnswer
                      ]}

                    </p>
                  ) : (
                    <p className="text-blue-900">

                      <span className="font-bold">
                        คำตอบของคุณ:
                      </span>{' '}

                      ไม่ได้ตอบ

                    </p>
                  )}

                </div>

                <div className="border-t border-blue-200 mt-4 pt-4">

                  <p className="font-bold text-blue-900 mb-2">
                    💡 อธิบาย
                  </p>

                  <p className="text-sm leading-relaxed text-blue-900">
                    {currentQuestion.explanation ||
                      'ยังไม่มีคำอธิบายสำหรับข้อนี้'}
                  </p>

                </div>

              </div>

              {/* NEXT */}

              <button
                onClick={
                  proceedToNextQuestion
                }
                className="w-full bg-amber-700 hover:bg-amber-600 active:bg-amber-800 text-white p-4 rounded-xl font-black transition shadow-md"
              >
                {currentQuestionIndex + 1 ===
                currentQuestions.length
                  ? '🏆 ดูผลคะแนน'
                  : 'ถัดไป ➡️'}
              </button>

            </div>
          )}

        </div>
      </div>
    );
  }

  return null;
}

export default function RootApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="*"
          element={<App />}
        />
      </Routes>
    </BrowserRouter>
  );
}