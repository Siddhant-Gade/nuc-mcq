import { QuestionModel, QuestionTopicCode } from '../types';
import { apiClient } from './apiClient';

const CACHE_KEY = 'cached_offline_question_bank_v2';

function mapSectionToTopic(section: string): QuestionTopicCode {
  const s = section.trim().toLowerCase();
  if (s.includes('power') || s.includes('ppt')) return 'powerpoint';
  if (s.includes('word') || s.includes('doc')) return 'word';
  if (s.includes('excel') || s.includes('spread')) return 'excel';
  if (s.includes('pagemaker')) return 'pagemaker';
  if (s.includes('internet') || s.includes('web')) return 'internet';
  if (s.includes('os') || s.includes('operating')) return 'os';
  if (s.includes('outlook') || s.includes('mail')) return 'outlook';
  return 'computerFundamentals';
}

interface RawQuestionItem {
  id?: string;
  sr?: number;
  section?: string;
  question_en?: string;
  questionText?: string;
  opt_a_en?: string;
  opt_b_en?: string;
  opt_c_en?: string;
  opt_d_en?: string;
  options?: string[];
  correct_index?: number;
  correctOptionIndex?: number;
  explanation_en?: string;
  explanation?: string;
  question_mr?: string;
  questionTextMr?: string;
  opt_a_mr?: string;
  opt_b_mr?: string;
  opt_c_mr?: string;
  opt_d_mr?: string;
  optionsMr?: string[];
  explanation_mr?: string;
  explanationMr?: string;
  question_hi?: string;
  questionTextHi?: string;
  opt_a_hi?: string;
  opt_b_hi?: string;
  opt_c_hi?: string;
  opt_d_hi?: string;
  optionsHi?: string[];
  explanation_hi?: string;
  explanationHi?: string;
}

export function parseRawQuestion(item: RawQuestionItem): QuestionModel {
  const topic = mapSectionToTopic(item.section || '');
  const id =
    item.id ||
    (item.sr ? `Q_${topic}_${item.sr}` : `Q_${topic}_${Math.random().toString(36).substring(2, 9)}`);

  const options: string[] = item.options || [
    item.opt_a_en || '',
    item.opt_b_en || '',
    item.opt_c_en || '',
    item.opt_d_en || '',
  ];

  const correctIndex =
    typeof item.correct_index === 'number'
      ? item.correct_index
      : typeof item.correctOptionIndex === 'number'
      ? item.correctOptionIndex
      : 0;

  const optionsMr = item.optionsMr || [
    item.opt_a_mr || '',
    item.opt_b_mr || '',
    item.opt_c_mr || '',
    item.opt_d_mr || '',
  ];
  const hasOptionsMr = optionsMr.some((o) => o.trim().length > 0);

  const optionsHi = item.optionsHi || [
    item.opt_a_hi || '',
    item.opt_b_hi || '',
    item.opt_c_hi || '',
    item.opt_d_hi || '',
  ];
  const hasOptionsHi = optionsHi.some((o) => o.trim().length > 0);

  return {
    id,
    topic,
    questionText: item.question_en || item.questionText || '',
    options,
    correctOptionIndex: correctIndex,
    explanation: item.explanation_en || item.explanation || '',
    questionTextMr: item.question_mr || item.questionTextMr,
    optionsMr: hasOptionsMr ? optionsMr : undefined,
    explanationMr: item.explanation_mr || item.explanationMr,
    questionTextHi: item.question_hi || item.questionTextHi,
    optionsHi: hasOptionsHi ? optionsHi : undefined,
    explanationHi: item.explanation_hi || item.explanationHi,
  };
}

class QuestionBankService {
  private questions: QuestionModel[] = [];
  private isLoaded = false;

  async loadQuestions(): Promise<QuestionModel[]> {
    if (this.isLoaded && this.questions.length > 0) {
      return this.questions;
    }

    // Try local storage cache first
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const rawList: RawQuestionItem[] = JSON.parse(cached);
        if (Array.isArray(rawList) && rawList.length > 0) {
          this.questions = rawList.map(parseRawQuestion);
          this.isLoaded = true;
          return this.questions;
        }
      }
    } catch {
      // Fall through to public asset
    }

    // Load from bundled /data/question_bank.json
    try {
      const response = await fetch('/data/question_bank.json');
      if (response.ok) {
        const rawList: RawQuestionItem[] = await response.json();
        this.questions = rawList.map(parseRawQuestion);
        this.isLoaded = true;
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(rawList));
        } catch {
          // LocalStorage full or private mode
        }
        return this.questions;
      }
    } catch {
      // Offline fallback
    }

    this.isLoaded = true;
    return this.questions;
  }

  async syncFromBackend(): Promise<QuestionModel[]> {
    try {
      const res = await apiClient.get('/api/v1/student/question-bank');
      const data = res.data?.data;
      if (Array.isArray(data) && data.length > 0) {
        this.questions = data.map(parseRawQuestion);
        this.isLoaded = true;
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } catch {
          // Ignore
        }
      }
    } catch {
      // Keep existing
    }
    return this.questions;
  }

  getAllQuestions(): QuestionModel[] {
    return this.questions;
  }

  getQuestionsByTopic(topic: QuestionTopicCode): QuestionModel[] {
    return this.questions.filter((q) => q.topic === topic);
  }

  getQuestionById(id: string): QuestionModel | undefined {
    if (!id) return undefined;
    const cleanId = String(id).trim();
    if (!cleanId) return undefined;
    const lowerId = cleanId.toLowerCase();

    // 1. Direct exact match
    let found = this.questions.find((q) => q.id === cleanId);
    if (found) return found;

    // 2. Case-insensitive match
    found = this.questions.find((q) => q.id.toLowerCase() === lowerId);
    if (found) return found;

    // 3. Match with/without 'q_' prefix
    const stripped = lowerId.replace(/^q_/, '');
    found = this.questions.find((q) => q.id.toLowerCase().replace(/^q_/, '') === stripped);
    if (found) return found;

    // 4. Match common topic abbreviations (e.g. Q_CF_1 -> Q_computerFundamentals_1)
    const topicAbbrMap: Record<string, string> = {
      cf: 'computerfundamentals',
      wd: 'word',
      ex: 'excel',
      pp: 'powerpoint',
      os: 'os',
      ol: 'outlook',
      it: 'internet',
      pm: 'pagemaker',
    };
    const parts = stripped.split('_');
    if (parts.length >= 2) {
      const abbr = parts[0];
      const rest = parts.slice(1).join('_');
      const expandedTopic = topicAbbrMap[abbr];
      if (expandedTopic) {
        found = this.questions.find((q) => {
          const qStripped = q.id.toLowerCase().replace(/^q_/, '');
          return qStripped.startsWith(expandedTopic) && qStripped.endsWith(rest);
        });
        if (found) return found;
      }
    }

    // 5. Match by numeric serial number if cleanId ends with a number
    const numMatch = cleanId.match(/(\d+)$/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      found = this.questions.find((q) => {
        const qMatch = q.id.match(/(\d+)$/);
        return qMatch ? parseInt(qMatch[1], 10) === num : false;
      });
      if (found) return found;
    }

    return undefined;
  }

  getTopicCounts(): Record<QuestionTopicCode, number> {
    const counts: Record<string, number> = {
      computerFundamentals: 0,
      os: 0,
      excel: 0,
      word: 0,
      powerpoint: 0,
      outlook: 0,
      internet: 0,
      pagemaker: 0,
    };
    for (const q of this.questions) {
      if (counts[q.topic] !== undefined) {
        counts[q.topic]++;
      }
    }
    return counts as Record<QuestionTopicCode, number>;
  }
}

export const questionBankService = new QuestionBankService();
