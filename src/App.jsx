import React, { useState, useEffect } from 'react';
import { ALL_QUESTIONS } from './component/question.jsx';
import tailwindcss from 'tailwindcss';


// ตัวอย่างคลังข้อสอบเริ่มต้น (คุณสามารถเพิ่มหรือแก้ไขโจทย์วิชาฮอร์โมน/ชีววิทยาตรงนี้ให้ครบได้เลยครับ)


// ฟังก์ชันสำหรับสุ่มข้อสอบ (Fisher-Yates Shuffle)
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function App() {
  const [gameState, setGameState] = useState('start'); // 'start' | 'playing' | 'summary'
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // เก็บคำตอบที่ผู้ใช้เลือกในแต่ละข้อ { [index]: selectedOptionIndex }
  const [selectedAnswers, setSelectedAnswers] = useState({});
  // เก็บสถานะว่าข้อไหนบ้างที่กด Submit ตรวจคำตอบแล้ว { [index]: true/false }
  const [submittedQuestions, setSubmittedQuestions] = useState({});

  // เริ่มต้นเกมใหม่: สุ่มข้อสอบจำนวน 40 ข้อ (หรือเท่าที่มีอยู่จริงในคลังข้อสอบ)
  const startGame = () => {
    // ดึงโจทย์มาสุ่ม
    const shuffled = shuffleArray(ALL_QUESTIONS);
    // เลือกมา 40 ข้อ (หรือทั้งหมดถ้าคลังข้อสอบมีไม่ถึง 40)
    const selectedQuestions = shuffled.slice(0, 40);
    
    setQuestions(selectedQuestions);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setSubmittedQuestions({});
    setGameState('playing');
  };

  // เลือกคำตอบ (สามารถกดเปลี่ยนใจได้ตราบใดที่ยังไม่ได้กด Submit)
  const handleSelectOption = (optionIndex) => {
    if (submittedQuestions[currentIndex]) return; // ถ้าส่งคำตอบของข้อนี้ไปแล้ว จะกดเลือกใหม่ไม่ได้
    setSelectedAnswers({
      ...selectedAnswers,
      [currentIndex]: optionIndex
    });
  };

  // กดปุ่ม Submit เพื่อตรวจคำตอบเฉพาะข้อปัจจุบัน
  const handleSubmitAnswer = () => {
    const currentSelection = selectedAnswers[currentIndex];
    // ถ้าผู้ใช้ยังไม่ได้เลือกข้อสอบเลย จะไม่มีผลอะไรเกิดขึ้นตามที่ระบุไว้
    if (currentSelection === undefined) return;

    setSubmittedQuestions({
      ...submittedQuestions,
      [currentIndex]: true
    });
  };

  // นำทางย้อนกลับข้อก่อนหน้า
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // นำทางไปข้อถัดไป
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // ถ้าถึงข้อสุดท้ายแล้ว สามารถเลือกที่จะจบเกมเพื่อดูสรุปคะแนนได้
        setGameState('summary');
      }
    };

  // คำนวณคะแนนรวมทั้งหมดเมื่อเล่นเสร็จ
  const calculateScore = () => {
    let score = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.answer) {
        score++;
      }
    });
    return score;
  };

  // --- หน้าจอแรก (Start Screen) ---
  if (gameState === 'start') {
    return (
      <div className="min-h-screen bg-[#FDFBF0] flex flex-col items-center justify-center p-4">
        <h1 className="text-6xl md:text-8xl font-bold text-[#3B82F6] mb-12 tracking-wide font-sans text-center">
          Hormone Quiz
        </h1>
        <button
          onClick={startGame}
          className="px-16 py-6 text-3xl md:text-4xl font-semibold text-[#3B82F6] border-4 border-[#3B82F6] rounded-full hover:bg-[#3B82F6] hover:text-white transition-all duration-300 shadow-md transform hover:scale-105"
        >
          start
        </button>
      </div>
    );
  }

  // --- หน้าจอสรุปผลคะแนนเมื่อสิ้นสุดเกม ---
  if (gameState === 'summary') {
    return (
      <div className="min-h-screen bg-[#FDFBF0] flex flex-col items-center justify-center p-4">
        <div className="bg-white border-4 border-[#3B82F6] rounded-2xl p-8 max-w-md w-full text-center shadow-lg">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">สรุปผลคะแนน</h2>
          <p className="text-6xl font-extrabold text-[#3B82F6] mb-6">
            {calculateScore()} <span className="text-2xl text-gray-500">/ {questions.length}</span>
          </p>
          <button
            onClick={() => setGameState('start')}
            className="w-full py-4 text-xl font-semibold text-white bg-[#3B82F6] rounded-xl hover:bg-blue-600 transition duration-300"
          >
            เล่นอีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  // --- หน้าจอเล่นเกมตอบคำถาม (Quiz Screen) ---
  const currentQuestion = questions[currentIndex];
  const isCurrentSubmitted = submittedQuestions[currentIndex];
  const currentSelection = selectedAnswers[currentIndex];

  return (
    <div className="min-h-screen bg-[#FDFBF0] flex flex-col items-center justify-between p-6 md:p-12">
      
      {/* ส่วนบน: บอกข้อสอบปัจจุบัน */}
      <div className="w-full max-w-2xl flex justify-between items-center text-gray-600 font-semibold mb-4">
        <span>ข้อที่ {currentIndex + 1} จาก {questions.length}</span>
        <button 
          onClick={() =>  setGameState('start')}
          className="text-sm text-red-500 hover:underline"
        >
          ออกจากการทดสอบ
        </button>
      </div>

      {/* บล็อกโจทย์คำถาม */}
      <div className="w-full max-w-2xl bg-white border-4 border-red-500 rounded-xl p-8 shadow-sm flex items-center justify-center min-h-[160px] mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 text-center leading-snug">
          {currentQuestion?.question}
        </h2>
      </div>

      {/* บล็อกตัวเลือก 4 ตัวเลือก */}
      <div className="w-full max-w-2xl flex flex-col gap-4 mb-8">
        {currentQuestion?.options.map((option, idx) => {
          const isSelected = currentSelection === idx;
          const isCorrectAnswer = currentQuestion.answer === idx;

          // กำหนดสไตล์ปุ่มตามเงื่อนไข (ยังไม่ได้ส่งคำตอบ VS ส่งคำตอบแล้ว)
          let buttonStyles = "w-full text-left p-4 rounded-xl border-2 text-lg font-medium transition-all duration-200 ";

          if (isCurrentSubmitted) {
            // หลังจากกด Submit แล้ว
            if (isCorrectAnswer) {
              // ตัวเลือกที่ถูกต้องเสมอจะเป็นสีเขียว
              buttonStyles += "bg-green-100 border-green-500 text-green-800 font-bold shadow-sm";
            } else if (isSelected && !isCorrectAnswer) {
              // ถ้าผู้ใช้เลือกข้อผิด ข้อนั้นจะขึ้นเป็นสีแดง
              buttonStyles += "bg-red-100 border-red-500 text-red-800 font-bold";
            } else {
              // ข้ออื่นๆ ที่ไม่ได้เลือกและไม่ได้ถูกต้อง
              buttonStyles += "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed";
            }
          } else {
            // ตอนที่ยังไม่ได้กดตรวจคำตอบ (Submit)
            if (isSelected) {
              buttonStyles += "bg-amber-100 border-amber-500 text-amber-800 font-semibold shadow-md transform scale-[1.01]";
            } else {
              buttonStyles += "bg-white border-gray-300 text-gray-700 hover:border-amber-400 hover:bg-amber-50/30";
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelectOption(idx)}
              disabled={isCurrentSubmitted}
              className={buttonStyles}
            >
              <span className="inline-block w-8 h-8 rounded-full bg-gray-100 text-gray-700 text-center leading-7 mr-3 text-sm font-bold border border-gray-300">
                {idx + 1}
              </span>
              {option}
            </button>
          );
        })}
      </div>

      {/* ส่วนควบคุมด้านล่าง (ปุ่มย้อนกลับ, ปุ่ม Submit, ปุ่มถัดไป) */}
      <div className="w-full max-w-2xl flex items-center justify-between gap-4 mt-auto">
        
        {/* ปุ่มเลื่อนข้อก่อนหน้า < */}
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className={`p-4 border-4 border-blue-500 rounded-xl flex items-center justify-center w-16 h-16 transition duration-200 ${
            currentIndex === 0 
              ? "opacity-30 cursor-not-allowed" 
              : "hover:bg-blue-50 text-blue-500 active:scale-95"
          }`}
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* ปุ่ม Submit */}
        <button
          onClick={handleSubmitAnswer}
          disabled={currentSelection === undefined || isCurrentSubmitted}
          className={`px-10 py-4 text-xl font-bold rounded-full border-4 border-[#F59E0B] transition-all duration-200 shadow-md ${
            currentSelection === undefined || isCurrentSubmitted
              ? "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
              : "bg-white text-[#F59E0B] hover:bg-[#F59E0B] hover:text-white active:scale-95"
          }`}
        >
          {isCurrentSubmitted ? "Submitted" : "Submit"}
        </button>

        {/* ปุ่มเลื่อนไปข้อถัดไป > */}
        <button
          onClick={handleNext}
          className="p-4 border-4 border-blue-500 rounded-xl flex items-center justify-center w-16 h-16 hover:bg-blue-50 text-blue-500 active:scale-95 transition duration-200"
        >
          {currentIndex === questions.length - 1 ? (
            // แสดงรูปธงชัยถ้าเป็นข้อสุดท้าย
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
          ) : (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          )}
        </button>

      </div>
    </div>
  );
}