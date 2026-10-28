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
  id?: string | number;
  sr?: number | string;
  section?: string;
  question_en?: string;
  questionText?: string;
  opt_a_en?: string;
  opt_b_en?: string;
  opt_c_en?: string;
  opt_d_en?: string;
  options?: string[];
  correct_index?: number | string;
  correctOptionIndex?: number | string;
  correct_option?: string;
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

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function optionList(item: RawQuestionItem, language: 'en' | 'mr' | 'hi'): string[] {
  if (Array.isArray(item[language === 'en' ? 'options' : language === 'mr' ? 'optionsMr' : 'optionsHi'])) {
    const values = item[language === 'en' ? 'options' : language === 'mr' ? 'optionsMr' : 'optionsHi'];
    return normalizeOptions((values as unknown[]).map(asText));
  }
  const suffix = language === 'en' ? 'en' : language;
  return normalizeOptions([
    asText(item[`opt_a_${suffix}` as keyof RawQuestionItem]),
    asText(item[`opt_b_${suffix}` as keyof RawQuestionItem]),
    asText(item[`opt_c_${suffix}` as keyof RawQuestionItem]),
    asText(item[`opt_d_${suffix}` as keyof RawQuestionItem]),
  ]);
}

function normalizeOptions(options: string[]): string[] {
  const cleaned = options.map(asText);
  const nonEmpty = cleaned.filter(Boolean);
  const isTrueFalse =
    nonEmpty.length >= 2 &&
    /^(true|false)$/i.test(nonEmpty[0]) &&
    /^(true|false)$/i.test(nonEmpty[1]) &&
    nonEmpty[0].toLowerCase() !== nonEmpty[1].toLowerCase();
  return isTrueFalse ? nonEmpty.slice(0, 2) : cleaned;
}

function parseCorrectIndex(item: RawQuestionItem, optionCount: number): number {
  const raw = item.correct_index ?? item.correctOptionIndex ?? item.correct_option;
  if (typeof raw === 'string' && /^[A-D]$/i.test(raw.trim())) {
    return raw.trim().toUpperCase().charCodeAt(0) - 65;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) return 0;
  return Math.min(Math.max(parsed, 0), Math.max(optionCount - 1, 0));
}

export function parseRawQuestion(item: RawQuestionItem): QuestionModel | null {
  const topic = mapSectionToTopic(asText(item.section));
  const serial = asText(item.sr);
  const questionText = asText(item.question_en || item.questionText);
  const options = optionList(item, 'en');
  if (!questionText || options.length < 2 || options.every((option) => !option)) return null;
  const id =
    asText(item.id) ||
    (serial ? `Q_${topic}_${serial}` : `Q_${topic}_${questionText.toLowerCase().replace(/\W+/g, '_').slice(0, 40)}`);
  const optionsMr = optionList(item, 'mr');
  const hasOptionsMr = optionsMr.some((o) => o.trim().length > 0);
  const optionsHi = optionList(item, 'hi');
  const hasOptionsHi = optionsHi.some((o) => o.trim().length > 0);

  return {
    id,
    topic,
    questionText,
    options,
    correctOptionIndex: parseCorrectIndex(item, options.length),
    explanation: asText(item.explanation_en || item.explanation),
    questionTextMr: asText(item.question_mr || item.questionTextMr) || undefined,
    optionsMr: hasOptionsMr ? optionsMr : undefined,
    explanationMr: asText(item.explanation_mr || item.explanationMr) || undefined,
    questionTextHi: asText(item.question_hi || item.questionTextHi) || undefined,
    optionsHi: hasOptionsHi ? optionsHi : undefined,
    explanationHi: asText(item.explanation_hi || item.explanationHi) || undefined,
  };
}

function parseQuestionList(raw: unknown): QuestionModel[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw
    .filter((item): item is RawQuestionItem => Boolean(item && typeof item === 'object'))
    .map(parseRawQuestion)
    .filter((question): question is QuestionModel => {
      if (!question || seen.has(question.id)) return false;
      seen.add(question.id);
      return true;
    });
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
        const parsed = parseQuestionList(JSON.parse(cached));
        if (parsed.length > 0) {
          this.questions = parsed;
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
        const rawList: unknown = await response.json();
        this.questions = parseQuestionList(rawList);
        if (this.questions.length === 0) return this.questions;
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
        this.questions = parseQuestionList(data);
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
