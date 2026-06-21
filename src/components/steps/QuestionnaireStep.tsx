'use client';

import React from 'react';

interface Question {
  id: string;
  question: string;
  options: string[];
  scores: number[];
}

interface QuestionnaireStepProps {
  questions: Question[];
  answers: Record<string, number>;
  setAnswer: (id: string, score: number) => void;
  moduleName: string;
}

const MODULE_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  '发票': { border: '#B91C1C', bg: 'rgba(185, 28, 28, 0.08)', text: '#B91C1C' },
  '收入成本': { border: '#1E40AF', bg: 'rgba(30, 64, 175, 0.08)', text: '#1E40AF' },
  '公私账户': { border: '#6D28D9', bg: 'rgba(109, 40, 217, 0.08)', text: '#6D28D9' },
  '税务': { border: '#047857', bg: 'rgba(4, 120, 87, 0.08)', text: '#047857' },
};

export default function QuestionnaireStep({ questions, answers, setAnswer, moduleName }: QuestionnaireStepProps) {
  const colors = MODULE_COLORS[moduleName] || { border: '#2563EB', bg: 'rgba(37, 99, 235, 0.08)', text: '#2563EB' };

  return (
    <div className="space-y-4">
      {questions.map((q) => (
        <div key={q.id} className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <p className="text-sm font-medium text-[#1A1A2E] mb-3 leading-relaxed">{q.question}</p>
          <div className="grid grid-cols-1 gap-2">
            {q.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => setAnswer(q.id, q.scores[idx])}
                className={`w-full px-4 py-2.5 text-sm text-left rounded-lg border transition-all ${
                  answers[q.id] === q.scores[idx]
                    ? 'border-current font-medium'
                    : 'border-[#E5E7EB] bg-white text-[#333333] hover:border-current/50'
                }`}
                style={{
                  borderColor: answers[q.id] === q.scores[idx] ? colors.border : undefined,
                  backgroundColor: answers[q.id] === q.scores[idx] ? colors.bg : undefined,
                  color: answers[q.id] === q.scores[idx] ? colors.text : undefined
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
