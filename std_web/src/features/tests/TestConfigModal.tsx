import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Play, Sliders } from 'lucide-react';
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
    sessionStorage.setItem('active_test', JSON.stringify(generated));
    onClose();
    navigate('/test/active');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#221810] w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-slate-200 dark:border-[#443224] overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[90vh] safe-area-bottom">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-[#38281d]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-peach-50 dark:bg-[#332014] text-peach-600 dark:text-peach-400 border border-peach-200 dark:border-[#523321]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-[#fde8d7]">
                {t('test_setup_title')}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-[#a8876e]">
                {t('practice_subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-[#fde8d7] hover:bg-slate-100 dark:hover:bg-[#2c2016] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 sm:space-y-5">
          {/* Topics Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-[#d9b89f] uppercase tracking-wider">
                {t('select_topics')} ({selectedTopics.length}/{allTopicKeys.length})
              </label>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs font-semibold text-peach-600 dark:text-peach-400 hover:underline cursor-pointer"
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
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left text-xs font-medium transition-all active:scale-[0.99] touch-manipulation cursor-pointer ${
                      isSelected
                        ? 'border-peach-600 bg-peach-50/80 dark:bg-[#382014] text-peach-950 dark:text-[#ffeedd] shadow-xs'
                        : 'border-slate-200 dark:border-[#443224] hover:bg-slate-50 dark:hover:bg-[#2c2016] text-slate-700 dark:text-[#d9b89f]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-peach-600 border-peach-600 text-white'
                          : 'border-slate-300 dark:border-[#5a4231] bg-white dark:bg-[#19120c]'
                      }`}
                    >
                      {isSelected && <span className="text-[10px] font-bold">✓</span>}
                    </div>
                    <span className="truncate flex-1">{title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question Count Slider */}
          <div className="space-y-2 p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-[#281d14] border border-slate-200/80 dark:border-[#443224]">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 dark:text-[#d9b89f]">
                {t('total_questions')}
              </span>
              <span className="font-extrabold text-sm text-peach-600 dark:text-peach-400 px-2 py-0.5 rounded bg-peach-50 dark:bg-[#332014] border border-peach-200/50 dark:border-[#523321]">
                {questionCount} MCQs
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full accent-peach-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 dark:text-[#a8876e] font-mono">
              <span>5</span>
              <span>15</span>
              <span>25</span>
              <span>35</span>
              <span>50</span>
            </div>
          </div>

          {/* Duration Slider */}
          <div className="space-y-2 p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-[#281d14] border border-slate-200/80 dark:border-[#443224]">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 dark:text-[#d9b89f]">
                {t('duration_minutes')}
              </span>
              <span className="font-extrabold text-sm text-peach-600 dark:text-peach-400 px-2 py-0.5 rounded bg-peach-50 dark:bg-[#332014] border border-peach-200/50 dark:border-[#523321]">
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
              className="w-full accent-peach-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 dark:text-[#a8876e] font-mono">
              <span>5m</span>
              <span>15m</span>
              <span>30m</span>
              <span>45m</span>
              <span>60m</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-5 border-t border-slate-200 dark:border-[#38281d] bg-slate-50 dark:bg-[#1f150e] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#443224] text-xs font-semibold text-slate-700 dark:text-[#d9b89f] hover:bg-slate-100 dark:hover:bg-[#2c2016] transition-colors cursor-pointer"
          >
            {t('btn_cancel')}
          </button>
          <button
            type="button"
            onClick={handleStart}
            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-peach-600 hover:bg-peach-700 text-white text-xs font-bold shadow-md shadow-peach-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{t('btn_start_test')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
