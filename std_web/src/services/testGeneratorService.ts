import { GeneratedTest, QuestionModel, QuestionTopicCode, TOPIC_CONFIG } from '../types';
import { questionBankService } from './questionBankService';

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const testGeneratorService = {
  blueprintVersion: '1.2.0',
  questionBankVersion: '2.0.0',

  generateExamTest(): GeneratedTest {
    const allTopics: QuestionTopicCode[] = [
      'computerFundamentals',
      'os',
      'excel',
      'word',
      'powerpoint',
      'outlook',
      'internet',
      'pagemaker',
    ];

    const selectedQuestions: QuestionModel[] = [];
    const allQuestions = shuffleArray(questionBankService.getAllQuestions());

    // Pick 3 questions from each of the 8 topics (total 24)
    for (const topic of allTopics) {
      const topicQuestions = shuffleArray(questionBankService.getQuestionsByTopic(topic));
      selectedQuestions.push(...topicQuestions.slice(0, 3));
    }

    // Add 1 more question to reach 25 unique questions
    const selectedIds = new Set(selectedQuestions.map((q) => q.id));
    for (const q of allQuestions) {
      if (selectedQuestions.length >= 25) break;
      if (!selectedIds.has(q.id)) {
        selectedQuestions.push(q);
        selectedIds.add(q.id);
      }
    }

    // Fallback if question bank has fewer
    if (selectedQuestions.length < 25 && allQuestions.length <= 25) {
      selectedQuestions.length = 0;
      selectedQuestions.push(...allQuestions);
    }

    return {
      testId: `EXAM_${Date.now()}`,
      mode: 'EXAM',
      questions: shuffleArray(selectedQuestions),
      durationMinutes: selectedQuestions.length,
      blueprintVersion: this.blueprintVersion,
      questionBankVersion: this.questionBankVersion,
      subject: 'MS-CIT Comprehensive Exam',
    };
  },

  generateOfficialMscitExamTest(): GeneratedTest {
    const allTopics: QuestionTopicCode[] = [
      'computerFundamentals',
      'os',
      'excel',
      'word',
      'powerpoint',
      'outlook',
      'internet',
      'pagemaker',
    ];

    const selectedQuestions: QuestionModel[] = [];
    const allQuestions = shuffleArray(questionBankService.getAllQuestions());

    // Pick 6 questions from each of the 8 topics (total 48)
    for (const topic of allTopics) {
      const topicQuestions = shuffleArray(questionBankService.getQuestionsByTopic(topic));
      selectedQuestions.push(...topicQuestions.slice(0, 6));
    }

    // Add up to 50 unique questions
    const selectedIds = new Set(selectedQuestions.map((q) => q.id));
    for (const q of allQuestions) {
      if (selectedQuestions.length >= 50) break;
      if (!selectedIds.has(q.id)) {
        selectedQuestions.push(q);
        selectedIds.add(q.id);
      }
    }

    if (selectedQuestions.length === 0 && allQuestions.length > 0) {
      selectedQuestions.push(...allQuestions.slice(0, 50));
    }

    return {
      testId: `MSCIT_FINAL_${Date.now()}`,
      mode: 'EXAM',
      questions: shuffleArray(selectedQuestions),
      durationMinutes: selectedQuestions.length,
      blueprintVersion: this.blueprintVersion,
      questionBankVersion: this.questionBankVersion,
      subject: 'MS-CIT Final Assessment',
    };
  },

  generatePracticeTest(options?: {
    topics?: QuestionTopicCode[];
    totalQuestions?: number;
    durationMinutes?: number;
  }): GeneratedTest {
    const activeTopics =
      options?.topics && options.topics.length > 0
        ? options.topics
        : (Object.keys(TOPIC_CONFIG) as QuestionTopicCode[]);

    const pool: QuestionModel[] = [];
    for (const topic of activeTopics) {
      pool.push(...questionBankService.getQuestionsByTopic(topic));
    }

    const shuffled = shuffleArray(pool);
    const count = Math.min(Math.max(options?.totalQuestions || 15, 1), Math.max(shuffled.length, 1));
    const selected = shuffled.slice(0, count);

    const singleTopic = options?.topics && options.topics.length === 1 ? options.topics[0] : null;
    const subject = singleTopic
      ? TOPIC_CONFIG[singleTopic].label
      : !options?.topics || options.topics.length === Object.keys(TOPIC_CONFIG).length
      ? 'Comprehensive Practice'
      : 'Practice Test';

    return {
      testId: `PRAC_${Date.now()}`,
      mode: 'PRACTICE',
      questions: selected,
      durationMinutes: options?.durationMinutes || 20,
      blueprintVersion: this.blueprintVersion,
      questionBankVersion: this.questionBankVersion,
      subject,
      topicCode: singleTopic || undefined,
    };
  },

  generateCustomPracticeTest(questions: QuestionModel[], durationMinutes?: number): GeneratedTest {
    const shuffled = shuffleArray(questions);
    const duration = durationMinutes || Math.min(Math.max(questions.length, 5), 30);

    return {
      testId: `CUSTOM_PRAC_${Date.now()}`,
      mode: 'PRACTICE',
      questions: shuffled,
      durationMinutes: duration,
      blueprintVersion: this.blueprintVersion,
      questionBankVersion: this.questionBankVersion,
      subject: 'Bookmarked Questions',
    };
  },
};
