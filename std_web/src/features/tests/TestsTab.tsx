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
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {t('tab_tests')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Official GCC-TBC MS-CIT Mock Assessments and Topic-wise Practice Tests.
          </p>
        </div>

        <button
          onClick={() => {
            setConfigTopic(undefined);
            setIsConfigOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer w-fit"
        >
          <Sliders className="w-4 h-4" />
          <span>{t('btn_create_test')}</span>
        </button>
      </div>

      {/* Official Exam Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900 to-indigo-800 text-white shadow-lg flex flex-col justify-between">
          <div className="space-y-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-sm">
              Standard 25Q Blueprint
            </span>
            <h2 className="text-lg font-bold">{t('mock_exam_title')}</h2>
            <p className="text-xs text-indigo-200 leading-relaxed">
              {t('mock_exam_subtitle')} • 3 Questions per topic + 1 extra random.
            </p>
          </div>
          <div className="pt-4 flex items-center justify-between">
            <span className="text-xs text-indigo-300 font-mono">Passing: 50%</span>
            <button
              onClick={() => handleStartExam(false)}
              className="px-4 py-2 rounded-xl bg-white text-indigo-900 font-bold text-xs hover:bg-indigo-50 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t('btn_start_mock')}</span>
            </button>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-900 to-slate-900 text-white shadow-lg flex flex-col justify-between">
          <div className="space-y-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-sm">
              Comprehensive 50Q Final
            </span>
            <h2 className="text-lg font-bold">{t('mscit_final_title')}</h2>
            <p className="text-xs text-purple-200 leading-relaxed">
              {t('mscit_final_subtitle')} • Full simulation of the final GCC-TBC examination.
            </p>
          </div>
          <div className="pt-4 flex items-center justify-between">
            <span className="text-xs text-purple-300 font-mono">Passing: 50%</span>
            <button
              onClick={() => handleStartExam(true)}
              className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Final Exam</span>
            </button>
          </div>
        </div>
      </div>

      {/* Subject-wise Practice Tests Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('practice_title')}
            </h2>
            <p className="text-xs text-slate-500">
              Pick a subject to practice questions with immediate feedback.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {allTopics.map((topicKey) => {
            const topic = TOPIC_CONFIG[topicKey];
            const title =
              language === 'mr' ? topic.labelMr : language === 'hi' ? topic.labelHi : topic.label;
            const count = topicCounts[topicKey] || 0;

            return (
              <div
                key={topicKey}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all flex flex-col justify-between shadow-sm group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <img
                      src={topic.imagePath}
                      alt={topic.label}
                      className="w-12 h-12 object-contain rounded-xl p-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {count} MCQs
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                    {title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                    {topic.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setConfigTopic(topicKey);
                      setIsConfigOpen(true);
                    }}
                    title="Customize"
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Sliders className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleStartSubjectPractice(topicKey)}
                    className="flex-1 py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-400 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
