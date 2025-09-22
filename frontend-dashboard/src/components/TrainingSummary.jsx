// src/components/TrainingSummary.jsx

import { BotIcon } from './icons';

export default function TrainingSummary({ botData, onGenerateQuestions }) {
    if (!botData || !botData.last_trained_at) {
        return (
            <div className="text-center p-8 bg-slate-800/50 rounded-lg border border-slate-700">
                <h3 className="text-lg font-semibold text-white">No Training Data</h3>
                <p className="text-slate-400 mt-1">Upload knowledge to train this bot.</p>
            </div>
        );
    }

    const questions = botData.ai_generated_questions || [];

    return (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="p-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-white">Current Training Status</h3>
            </div>
            <div className="p-4 space-y-4">
                <p className="text-sm text-slate-300">
                    <strong>Last Trained:</strong> {new Date(botData.last_trained_at).toLocaleString()}
                </p>
                <p className="text-sm text-slate-300">
                    <strong>Source:</strong> <span className="italic">{botData.knowledge_source}</span>
                </p>
                <div>
                    <h4 className="font-semibold text-white mb-2">AI Generated Suggestions:</h4>
                    {questions.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {questions.map((q, i) => (
                                <span key={i} className="px-3 py-1 bg-slate-700 text-sm text-slate-200 rounded-full">
                                    {q.suggested_question.question}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400">No suggestions generated. Click below to create some.</p>
                    )}
                </div>
                 <button onClick={onGenerateQuestions} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-md text-sm">
                    Regenerate Suggestions with AI
                </button>
            </div>
        </div>
    );
}