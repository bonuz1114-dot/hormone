import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { ALL_QUESTIONS } from './component/question';

// 💡 เช็กว่าใช้คำสั่งดึงค่าจาก env แบบนี้แล้วหรือยัง
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:10000';
const socket = io(BACKEND_URL);

export default function App() {
  const [gameMode, setGameMode] = useState(null); 
  const [multiplayerSubState, setMultiplayerSubState] = useState('CHOICE'); 
  const [gameState, setGameState] = useState('HOME'); 
  
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

  const [selectedAnswer, setSelectedAnswer] = useState(null); 
  const [isShowingFeedback, setIsShowingFeedback] = useState(false); 

  const [singlePlayerFinalScore, setSinglePlayerFinalScore] = useState(0);

  const shuffleQuestions = (questionsArray) => {
    const shuffled = [...questionsArray];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  useEffect(() => {
    socket.on('room_created', ({ roomCode }) => {
      setRoomCode(roomCode);
      setIsHost(true);
      setGameState('LOBBY');
    });

    socket.on('update_players', (updatedPlayers) => {
      setPlayers(updatedPlayers);
    });

    socket.on('game_started_by_host', ({ shuffledQuestionsList } = {}) => {
      if (shuffledQuestionsList && shuffledQuestionsList.length > 0) {
        setCurrentQuestions(shuffledQuestionsList);
      } else {
        setCurrentQuestions(ALL_QUESTIONS);
      }
      setStartTime(Date.now());
      setGameState('QUIZ');
    });

    // 💡 เมื่อทุกคนทำเสร็จ Server จะส่งผลลัพธ์สุดท้ายมาเพื่อแสดงหน้า Leaderboard ร่วมกัน
    socket.on('game_over', (finalLeaderboard) => {
      setLeaderboard(finalLeaderboard);
      setGameState('LEADERBOARD');
    });

    socket.on('host_disconnected', ({ message }) => {
      alert(message);
      resetToHome();
    });

    return () => {
      socket.off('room_created');
      socket.off('update_players');
      socket.off('game_started_by_host');
      socket.off('game_over');
      socket.off('host_disconnected');
    };
  }, []);

  const resetToHome = () => {
    setGameMode(null);
    setMultiplayerSubState('CHOICE');
    setGameState('HOME');
    setRoomCode('');
    setIsHost(false);
    setPlayers([]);
    setCurrentQuestions([]);
    setCurrentQuestionIndex(0);
    setScore(0);
    setSinglePlayerFinalScore(0);
    setErrorMessage('');
    setSelectedAnswer(null);
    setIsShowingFeedback(false);
  };

  const handleQuitGame = () => {
    resetToHome();
  };

  const startSinglePlayer = () => {
    if (!playerName.trim()) return setErrorMessage('กรุณากรอกชื่อของคุณก่อนเริ่มเกม');
    setErrorMessage('');
    setGameMode('SINGLE');
    
    const shuffled = shuffleQuestions(ALL_QUESTIONS);
    setCurrentQuestions(shuffled);
    
    setStartTime(Date.now());
    setGameState('QUIZ');
  };

  const handleCreateRoom = () => {
    if (!playerName.trim()) return setErrorMessage('กรุณากรอกชื่อของคุณก่อนสร้างห้อง');
    setErrorMessage('');
    socket.emit('create_room', { playerName });
  };

  const handleJoinRoom = () => {
    if (!playerName.trim() || !roomCode.trim()) {
      return setErrorMessage('กรุณากรอกชื่อและรหัสห้อง 6 หลักให้ครบถ้วน');
    }
    setErrorMessage('');
    socket.emit('join_room', { roomCode: roomCode.toUpperCase(), playerName }, (response) => {
      if (response.success) {
        setGameState('LOBBY');
      } else {
        setErrorMessage(response.message);
      }
    });
  };

  const handleStartGame = () => {
    const shuffled = shuffleQuestions(ALL_QUESTIONS);
    socket.emit('start_game', { roomCode, shuffledQuestionsList: shuffled });
  };

  const handleAnswerQuestion = (selectedOptionIndex) => {
    if (isShowingFeedback) return; 

    const correctAnswerIndex = currentQuestions[currentQuestionIndex].answer;
    
    let newScore = score;
    if (selectedOptionIndex === correctAnswerIndex) {
      newScore = score + 1;
      setScore(newScore);
    }

    if (gameMode === 'SINGLE') {
      setSelectedAnswer(selectedOptionIndex);
      setSinglePlayerFinalScore(newScore);
      setIsShowingFeedback(true);
    } else {
      proceedToNextQuestion(newScore);
    }
  };

  const proceedToNextQuestion = (currentTotalScore) => {
    setSelectedAnswer(null);
    setIsShowingFeedback(false);

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < currentQuestions.length) {
      setCurrentQuestionIndex(nextIndex);
    } else {
      const timeUsed = Math.round((Date.now() - startTime) / 1000);
      
      if (gameMode === 'SINGLE') {
        const singleResult = [{ id: 'single', name: playerName, score: currentTotalScore, timeUsed, isHost: false, submitted: true }];
        setLeaderboard(singleResult);
        setGameState('LEADERBOARD');
      } else {
        // ส่งผลลัพธ์ของตัวเองไปให้เซิร์ฟเวอร์ และกลับไปรอที่หน้า Lobby ชั่วคราวจนกว่าจะเสร็จครบทุกคน
        socket.emit('submit_results', { roomCode, score: currentTotalScore, timeUsed });
        setGameState('LOBBY');
      }
    }
  };

  const getButtonClass = (optionIndex) => {
    const baseClass = "w-full text-left p-4 rounded-xl border font-medium transition duration-200 text-base select-none ";
    
    if (!isShowingFeedback) {
      return baseClass + "bg-stone-100 hover:bg-orange-50/60 border-stone-200 text-stone-800 hover:border-amber-500 hover:text-amber-950";
    }

    const correctAnswerIndex = currentQuestions[currentQuestionIndex].answer;

    if (optionIndex === correctAnswerIndex) {
      return baseClass + "bg-emerald-50 border-emerald-400 text-emerald-800 font-semibold shadow-inner";
    }
    
    if (optionIndex === selectedAnswer && selectedAnswer !== correctAnswerIndex) {
      return baseClass + "bg-rose-50 border-rose-300 text-rose-700 line-through opacity-90";
    }

    return baseClass + "bg-stone-50/40 border-stone-200 text-stone-400 opacity-50";
  };

  // 💡 ฟังก์ชันช่วยเลือกสไตล์แถบสีและสถานะ ชนะ/แพ้ สำหรับโหมดเล่นหลายคน
  const getLeaderboardStatus = (idx, totalPlayers) => {
    if (gameMode === 'SINGLE') {
      return { label: 'สิ้นสุดการเล่น', containerClass: 'bg-amber-50 border-amber-300 text-amber-800 font-medium' };
    }
    
    if (idx === 0) {
      return { label: '🥇 ชนะเลิศ (Winner)', containerClass: 'bg-amber-50 border-amber-400 text-amber-900 font-bold shadow-md ring-2 ring-amber-400/30' };
    } else if (idx === 1) {
      return { label: '🥈 อันดับ 2', containerClass: 'bg-stone-100 border-stone-300 text-stone-800 font-semibold' };
    } else if (idx === 2) {
      return { label: '🥉 อันดับ 3', containerClass: 'bg-orange-50/40 border-orange-200 text-orange-800 font-medium' };
    } else {
      return { label: '💥 แพ้ (Defeat)', containerClass: 'bg-rose-50/30 border-rose-100 text-stone-500 opacity-80' };
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f4eb] text-stone-800 flex flex-col items-center justify-center p-4 selection:bg-amber-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-stone-200/50 p-6 border border-stone-200/60">
        
        {/* HOME SCREEN */}
        {gameState === 'HOME' && (
          <div>
            <h1 className="text-3xl font-extrabold text-center mb-6 text-amber-700 tracking-wide">Hormone Quiz</h1>
            {errorMessage && (
              <p className="text-rose-700 text-sm mb-4 bg-rose-50 p-2 rounded-lg text-center border border-rose-200 font-medium">{errorMessage}</p>
            )}
            <input
              type="text"
              placeholder="ใส่ชื่อของคุณ"
              className="w-full p-3 bg-stone-50 border border-stone-200 rounded-lg mb-6 focus:outline-none focus:border-amber-500 text-center text-lg text-stone-800 placeholder-stone-400 font-medium"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />

            {!gameMode && multiplayerSubState === 'CHOICE' && (
              <div className="space-y-4">
                <button onClick={startSinglePlayer} className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 p-4 rounded-xl font-bold text-lg shadow-sm transition text-white">
                  👤 เล่นคนเดียว (Single Player)
                </button>
                <button onClick={() => setGameMode('MULTIPLAYER')} className="w-full bg-gradient-to-r from-stone-600 to-stone-700 hover:from-stone-500 hover:to-stone-600 p-4 rounded-xl font-bold text-lg shadow-md transition text-white">
                  👥 เล่นหลายคน (Multiplayer)
                </button>
              </div>
            )}

            {gameMode === 'MULTIPLAYER' && multiplayerSubState === 'CHOICE' && (
              <div className="space-y-4">
                <h2 className="text-center text-stone-500 font-semibold mb-2">โหมดเล่นหลายคน</h2>
                <button onClick={() => setMultiplayerSubState('CREATE')} className="w-full bg-amber-700 hover:bg-amber-600 p-3 rounded-xl font-bold transition text-white shadow-sm">
                  🏠 สร้างห้องใหม่ (Host)
                </button>
                <button onClick={() => setMultiplayerSubState('JOIN')} className="w-full bg-emerald-700 hover:bg-emerald-600 p-3 rounded-xl font-bold transition text-white shadow-sm">
                  🔑 เข้าร่วมห้องเกมด้วยรหัส
                </button>
                <button onClick={resetToHome} className="w-full bg-stone-100 hover:bg-stone-200 p-2 rounded-lg text-sm text-stone-600 transition font-medium">
                  ⬅️ ย้อนกลับ
                </button>
              </div>
            )}

            {multiplayerSubState === 'CREATE' && (
              <div className="space-y-4">
                <h2 className="text-center font-bold text-amber-700">เตรียมตัวเป็นโฮสต์สร้างห้อง</h2>
                <button onClick={handleCreateRoom} className="w-full bg-amber-700 hover:bg-amber-600 p-3 rounded-xl font-bold transition text-white shadow-sm">
                  ยืนยันการสร้างห้อง
                </button>
                <button onClick={() => setMultiplayerSubState('CHOICE')} className="w-full bg-stone-100 hover:bg-stone-200 p-2 rounded-lg text-sm text-stone-600 transition font-medium">
                  ย้อนกลับ
                </button>
              </div>
            )}

            {multiplayerSubState === 'JOIN' && (
              <div className="space-y-4">
                <h2 className="text-center font-bold text-emerald-700">กรอกรหัสเพื่อเข้าห้องเพื่อน</h2>
                <input
                  type="text"
                  placeholder="กรอกรหัสห้อง 6 หลัก"
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-lg text-center tracking-widest uppercase text-stone-800 focus:outline-none focus:border-emerald-500 font-bold text-lg"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                />
                <button onClick={handleJoinRoom} className="w-full bg-emerald-700 hover:bg-emerald-600 p-3 rounded-xl font-bold transition text-white shadow-sm">
                  ตกลง เข้าร่วมห้อง
                </button>
                <button onClick={() => setMultiplayerSubState('CHOICE')} className="w-full bg-stone-100 hover:bg-stone-200 p-2 rounded-lg text-sm text-stone-600 transition font-medium">
                  ย้อนกลับ
                </button>
              </div>
            )}
          </div>
        )}

        {/* LOBBY SCREEN */}
        {gameState === 'LOBBY' && (
          <div>
            <h2 className="text-2xl font-bold text-center mb-2 text-stone-800">🏠 ห้องพักนักแข่ง</h2>
            <p className="text-center text-stone-500 mb-4">รหัสเข้าร่วมห้อง: <span className="text-xl font-bold text-amber-700 bg-stone-100 px-3 py-1 rounded-lg border border-stone-200">{roomCode}</span></p>
            <h3 className="text-sm font-semibold text-stone-500 mb-2">รายชื่อผู้เล่นที่เข้ามาแล้ว ({players.length}):</h3>
            <ul className="space-y-2 mb-6 max-h-48 overflow-y-auto">
              {players.map((p) => (
                <li key={p.id} className="bg-stone-50 p-3 rounded-xl flex justify-between items-center border border-stone-100">
                  <span className="font-medium text-stone-700">{p.name} {p.isHost && '👑'}</span>
                  <span className={`text-xs px-2 py-1 rounded font-medium ${p.submitted ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-stone-200 text-stone-600'}`}>
                    {p.submitted ? '✅ ทำเสร็จแล้ว' : '⏳ กำลังตอบคำถาม...'}
                  </span>
                </li>
              ))}
            </ul>
            {isHost ? (
              <button onClick={handleStartGame} className="w-full bg-amber-700 hover:bg-amber-600 p-3 rounded-xl font-bold transition text-white shadow-md">
                🚀 เริ่มเกมเลย!
              </button>
            ) : (
              <div className="text-center text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200 font-medium">
                🎮 กำลังรอโฮสต์กดเริ่มเกม หรือรอผู้เล่นคนอื่นตอบควิซ...
              </div>
            )}
          </div>
        )}

        {/* QUIZ SCREEN */}
        {gameState === 'QUIZ' && currentQuestions.length > 0 && (
          <div>
            <div className="flex justify-between text-xs text-stone-400 mb-4 font-medium items-center">
              <div>
                <span>ข้อที่ {currentQuestionIndex + 1} จาก {currentQuestions.length} </span>
                <span className="text-amber-700 ml-2 font-semibold">คะแนนปัจจุบัน: {score}</span>
              </div>
              
              {gameMode === 'SINGLE' && (
                <button 
                  onClick={handleQuitGame}
                  className="text-stone-500 hover:text-rose-600 transition text-xs font-semibold bg-stone-100 hover:bg-rose-50 px-2 py-1 rounded border border-stone-200 hover:border-rose-200 select-none"
                >
                  🏳️ ออก
                </button>
              )}
            </div>
            
            <h2 className="text-xl font-bold mb-6 leading-relaxed text-stone-800">{currentQuestions[currentQuestionIndex].question}</h2>
            <div className="space-y-3">
              {currentQuestions[currentQuestionIndex].options.map((option, index) => (
                <button
                  key={index}
                  disabled={isShowingFeedback} 
                  onClick={() => handleAnswerQuestion(index)}
                  className={getButtonClass(index)}
                >
                  {option}
                </button>
              ))}
            </div>
            
            {isShowingFeedback && gameMode === 'SINGLE' && (
              <div className="mt-6 pt-4 border-t border-stone-200/60 flex flex-col items-center space-y-4">
                <div className="text-sm font-semibold select-none">
                  {selectedAnswer === currentQuestions[currentQuestionIndex].answer ? (
                    <span className="text-emerald-700 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-200">🎉 ถูกต้องเยี่ยมมาก!</span>
                  ) : (
                    <span className="text-rose-700 bg-rose-50 px-4 py-2 rounded-full border border-rose-200">❌ อ๊ะ! ยังไม่ถูกนะ</span>
                  )}
                </div>
                
                <button
                  onClick={() => proceedToNextQuestion(singlePlayerFinalScore)}
                  className="w-full bg-amber-700 hover:bg-amber-600 active:bg-amber-800 text-white p-3 rounded-xl font-bold transition shadow-md flex justify-center items-center space-x-2 select-none"
                >
                  <span>{currentQuestionIndex + 1 === currentQuestions.length ? '📊 ดูผลคะแนนรวม' : 'ถัดไป ➡️'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* LEADERBOARD SCREEN */}
        {gameState === 'LEADERBOARD' && (
          <div>
            <h2 className="text-3xl font-extrabold text-center mb-6 text-amber-700 tracking-wide select-none">
              {gameMode === 'SINGLE' ? '📊 สรุปผลคะแนน' : '🏆 ผลการแข่งขัน 🏆'}
            </h2>
            <div className="space-y-3 mb-6">
              {leaderboard.map((p, idx) => {
                const status = getLeaderboardStatus(idx, leaderboard.length);
                return (
                  <div key={p.id} className={`p-4 rounded-xl border flex flex-col space-y-2 transition duration-300 ${status.containerClass}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <span className="font-black text-xl text-amber-600/80 w-5">{idx + 1}.</span>
                        <div>
                          <p className="font-bold text-base leading-tight">{p.name}</p>
                          {gameMode === 'MULTIPLAYER' && (
                            <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-black/5 text-stone-600 inline-block mt-0.5">
                              {status.label}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-lg">{p.score} / {currentQuestions.length || ALL_QUESTIONS.length}</p>
                        <p className="text-xs text-stone-500 font-medium">⏱️ {p.timeUsed} วินาที</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={resetToHome} className="w-full bg-stone-600 hover:bg-stone-500 p-3 rounded-xl font-bold transition text-white shadow-md select-none">
              ↩️ กลับสู่หน้าหลัก
            </button>
          </div>
        )}

      </div>
    </div>
  );
}