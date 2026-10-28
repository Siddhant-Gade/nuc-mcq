import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Sliders } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { QuestionTopicCode, TOPIC_CONFIG } from '../../types';
import { questionBankService } from '../../services/questionBankService';
import { testGeneratorService } from '../../services/testGeneratorService';
import { TestConfigModal } from './TestConfigModal';

export const TestsTab: React.FC = () => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  const [topicCounts, setTopicCounts] = useState<Record<QuestionTopicCode, number>>({
    computerFundamentals: 0,
    os: 0,
    excel: 0,
    word: 0,
    powerpoint: 0,
    outlook: 0,
    internet: 0,
    pagemaker: 0,
  });

  const [configTopic, setConfigTopic] = useState<QuestionTopicCode | undefined>(undefined);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      await questionBankService.loadQuestions();
      if (isMounted) {
        setTopicCounts(questionBankService.getTopicCounts());
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleStartExam = (is50Q = false) => {
    const test = is50Q
      ? testGeneratorService.generateOfficialMscitExamTest()
      : testGeneratorService.generateExamTest();
    sessionStorage.setItem('active_test', JSON.stringify(test));
    navigate('/test/active');
  };

  const handleStartSubjectPractice = (topic: QuestionTopicCode) => {
    const test = testGeneratorService.generatePracticeTest({
      topics: [topic],
      totalQuestions: 15,
      durationMinutes: 20,
    });
    sessionStorage.setItem('active_test', JSON.stringify(test));
    navigate('/test/active');
  };

  const allTopics = Object.keys(TOPIC_CONFIG) as QuestionTopicCode[];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-[#fde8d7]">
            {t('tab_tests')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#d9b89f] mt-1">
            Official GCC-TBC MS-CIT Mock Assessments and Topic-wise Practice Tests.
          </p>
        </div>

        <button
          onClick={() => {
            setConfigTopic(undefined);
            setIsConfigOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-peach-600 hover:bg-peach-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer w-full sm:w-fit active:scale-98"
        >
          <Sliders className="w-4 h-4" />
          <span>{t('btn_create_test')}</span>
        </button>
      </div>

      {/* Official Exam Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Standard Mock Assessment */}
        <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#221810] border border-slate-200 dark:border-[#443224] text-slate-900 dark:text-[#fde8d7] shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-md bg-peach-50 dark:bg-[#332014] text-peach-700 dark:text-peach-300 text-xs font-semibold border border-peach-200 dark:border-[#523321]">
                Standard 25Q Blueprint
              </span>
              <span className="text-xs text-slate-500 dark:text-[#a8876e] font-mono">Passing: 50%</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#fde8d7]">{t('mock_exam_title')}</h2>
            <p className="text-xs text-slate-600 dark:text-[#d9b89f] leading-relaxed">
              {t('mock_exam_subtitle')} • 3 Questions per topic + 1 extra random question.
            </p>
          </div>
          <div className="pt-4 sm:pt-5 flex items-center justify-end">
            <button
              onClick={() => handleStartExam(false)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-peach-600 hover:bg-peach-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t('btn_start_mock')}</span>
            </button>
          </div>
        </div>

        {/* Card 2: Comprehensive 50Q Final Exam */}
        <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-peach-900 to-peach-950 text-white border border-peach-800/80 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-md bg-white/10 text-peach-100 text-xs font-semibold border border-white/20">
                Comprehensive 50Q Final
              </span>
              <span className="text-xs text-peach-200/80 font-mono">Passing: 50%</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white">{t('mscit_final_title')}</h2>
            <p className="text-xs text-peach-100/80 leading-relaxed">
              {t('mscit_final_subtitle')} • Full simulation of the final GCC-TBC examination.
            </p>
          </div>
          <div className="pt-4 sm:pt-5 flex items-center justify-end">
            <button
              onClick={() => handleStartExam(true)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white text-peach-950 hover:bg-peach-50 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Final Exam</span>
            </button>
          </div>
        </div>
      </div>

      {/* Subject-wise Practice Tests Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#fde8d7]">
            {t('practice_title')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#a8876e]">
            Pick a subject to practice questions with immediate feedback.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {allTopics.map((topicKey) => {
            const topic = TOPIC_CONFIG[topicKey];
            const title =
              language === 'mr' ? topic.labelMr : language === 'hi' ? topic.labelHi : topic.label;
            const count = topicCounts[topicKey] || 0;

            return (
              <div
                key={topicKey}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#221810] border border-slate-200 dark:border-[#443224] hover:border-peach-400 dark:hover:border-peach-600 transition-all flex flex-col justify-between shadow-xs group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <img
                      src={topic.imagePath}
                      alt={topic.label}
                      className="w-11 h-11 object-contain rounded-xl p-1 bg-slate-50 dark:bg-[#2c2016] border border-slate-200 dark:border-[#443224]"
                    />
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-[#2c2016] text-slate-600 dark:text-[#d9b89f] border border-slate-200/50 dark:border-[#443224]">
                      {count} MCQs
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-[#fde8d7] group-hover:text-peach-600 dark:group-hover:text-peach-400 transition-colors">
                    {title}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-[#a8876e] line-clamp-2 mt-1">
                    {topic.description}
                  </p>
                </div>

                <div className="pt-3.5 mt-3.5 border-t border-slate-100 dark:border-[#33251a] flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setConfigTopic(topicKey);
                      setIsConfigOpen(true);
                    }}
                    title="Customize"
                    className="p-2 rounded-xl text-slate-400 dark:text-[#a8876e] hover:text-slate-700 dark:hover:text-[#fde8d7] hover:bg-slate-100 dark:hover:bg-[#2c2016] transition-colors cursor-pointer"
                  >
                    <Sliders className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleStartSubjectPractice(topicKey)}
                    className="flex-1 py-2 px-3 rounded-xl bg-peach-50 dark:bg-[#332014] hover:bg-peach-600 hover:text-white dark:hover:bg-peach-600 text-peach-700 dark:text-peach-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-peach-200 dark:border-[#523321] active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Practice (15Q)</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Test Config Modal */}
      <TestConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        initialTopic={configTopic}
      />
    </div>
  );
};
