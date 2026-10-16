import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Play, Sliders, CheckSquare, Square } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { QuestionTopicCode, TOPIC_CONFIG } from '../../types';
import { testGeneratorService } from '../../services/testGeneratorService';

interface TestConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopic?: QuestionTopicCode;
}

export const TestConfigModal: React.FC<TestConfigModalProps> = ({
  isOpen,
  onClose,
  initialTopic,
}) => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  const allTopicKeys = Object.keys(TOPIC_CONFIG) as QuestionTopicCode[];

  const [selectedTopics, setSelectedTopics] = useState<QuestionTopicCode[]>(() =>
    initialTopic ? [initialTopic] : allTopicKeys
  );
  const [questionCount, setQuestionCount] = useState<number>(15);
  const [durationMinutes, setDurationMinutes] = useState<number>(20);

  if (!isOpen) return null;

  const toggleTopic = (topic: QuestionTopicCode) => {
    if (selectedTopics.includes(topic)) {
      if (selectedTopics.length > 1) {
        setSelectedTopics(selectedTopics.filter((t) => t !== topic));
      }
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  const toggleAll = () => {
    if (selectedTopics.length === allTopicKeys.length) {
      setSelectedTopics([allTopicKeys[0]]);
    } else {
      setSelectedTopics([...allTopicKeys]);
    }
  };

  const handleStart = () => {
    const generated = testGeneratorService.generatePracticeTest({
      topics: selectedTopics,
      totalQuestions: questionCount,
      durationMinutes,
    });
    // Store active test in session/localStorage for the test engine
    sessionStorage.setItem('active_test', JSON.stringify(generated));
    onClose();
    navigate('/test/active');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {t('test_setup_title')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('practice_subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Topics Selection */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {t('select_topics')} ({selectedTopics.length}/{allTopicKeys.length})
              </label>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                {selectedTopics.length === allTopicKeys.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {allTopicKeys.map((topicKey) => {
                const topic = TOPIC_CONFIG[topicKey];
                const isSelected = selectedTopics.includes(topicKey);
                const title =
                  language === 'mr' ? topic.labelMr : language === 'hi' ? topic.labelHi : topic.label;

                return (
                  <button
                    key={topicKey}
                    type="button"
                    onClick={() => toggleTopic(topicKey)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span className="truncate">{title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question Count Slider */}
          <div className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {t('question_count')}
              </span>
              <span className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950">
                {questionCount} Questions
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>5</span>
              <span>15</span>
              <span>25</span>
              <span>35</span>
              <span>50</span>
            </div>
          </div>

          {/* Duration Slider */}
          <div className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {t('duration_minutes')}
              </span>
              <span className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950">
                {durationMinutes} Min
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="60"
              step="5"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>5m</span>
              <span>15m</span>
              <span>30m</span>
              <span>45m</span>
              <span>60m</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {t('btn_cancel')}
          </button>
          <button
            type="button"
            onClick={handleStart}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{t('btn_start_test')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
