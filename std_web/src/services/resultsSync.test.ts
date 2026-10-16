import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeTestResult, resultsService } from './resultsService';

// Polyfill minimal localStorage for Node testing if needed
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => store.set(key, String(val)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  };
}

test('normalizeTestResult maps backend payload with mode to testMode correctly', () => {
  const backendRecord = {
    id: 'res-uuid-1',
    clientEventId: 'EVENT_MOBILE_101',
    studentProfileId: 'profile-uuid',
    authUserId: 'auth-uuid',
    testId: 'EXAM_2026_01',
    mode: 'EXAM', // Note backend uses 'mode'
    questionBankVersion: '2.0.0',
    blueprintVersion: '1.0.0',
    totalQuestions: 50,
    correctCount: 42,
    wrongCount: 8,
    score: 42,
    wrongQuestionIds: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'],
    completedAt: '2026-10-16T12:00:00.000Z',
    syncedAt: '2026-10-16T12:00:05.000Z',
  };

  const normalized = normalizeTestResult(backendRecord);

  assert.equal(normalized.clientEventId, 'EVENT_MOBILE_101');
  assert.equal(normalized.testId, 'EXAM_2026_01');
  assert.equal(normalized.testMode, 'EXAM', 'mode: EXAM must be normalized to testMode: EXAM');
  assert.equal(normalized.totalQuestions, 50);
  assert.equal(normalized.correctCount, 42);
  assert.equal(normalized.wrongCount, 8);
  assert.equal(normalized.score, 42);
  assert.equal(normalized.syncStatus, 'SYNCED');
  assert.equal(normalized.subject, 'MS-CIT Comprehensive Exam', 'Should infer subject from EXAM_ prefix');
});

test('normalizeTestResult preserves local student answers and time taken when cloud record arrives', () => {
  const existingLocal = {
    clientEventId: 'EVENT_LOCAL_202',
    testId: 'PRAC_WORD_01',
    testMode: 'PRACTICE' as const,
    subject: 'MS Word',
    topicCode: 'word',
    questionBankVersion: '1.0.0',
    blueprintVersion: '1.0.0',
    totalQuestions: 15,
    correctCount: 12,
    wrongCount: 3,
    score: 12,
    wrongQuestionIds: ['w1', 'w2', 'w3'],
    completedAt: '2026-10-15T10:00:00.000Z',
    timeTakenSeconds: 320,
    studentAnswers: { q1: 0, q2: 1, w1: 2 },
    syncStatus: 'PENDING' as const,
  };

  // Cloud record returned without studentAnswers or timeTakenSeconds
  const cloudRecord = {
    clientEventId: 'EVENT_LOCAL_202',
    testId: 'PRAC_WORD_01',
    mode: 'PRACTICE',
    totalQuestions: 15,
    correctCount: 12,
    wrongCount: 3,
    score: 12,
    wrongQuestionIds: ['w1', 'w2', 'w3'],
    completedAt: '2026-10-15T10:00:00.000Z',
  };

  const merged = normalizeTestResult(cloudRecord, existingLocal);

  assert.equal(merged.syncStatus, 'SYNCED');
  assert.equal(merged.subject, 'MS Word');
  assert.equal(merged.topicCode, 'word');
  assert.equal(merged.timeTakenSeconds, 320, 'Local timeTakenSeconds should be preserved');
  assert.deepEqual(merged.studentAnswers, { q1: 0, q2: 1, w1: 2 }, 'Local studentAnswers should be preserved');
});

test('normalizeTestResult correctly identifies skipped questions and maintains score integrity', () => {
  const testAttempt = {
    clientEventId: 'EVENT_SKIPPED_303',
    testId: 'PRAC_EXCEL_01',
    mode: 'PRACTICE',
    totalQuestions: 25,
    correctCount: 15,
    wrongCount: 5,
    score: 15,
    wrongQuestionIds: ['e1', 'e2', 'e3', 'e4', 'e5'], // 5 wrong, 5 skipped
    completedAt: '2026-10-16T14:00:00.000Z',
  };

  const normalized = normalizeTestResult(testAttempt);

  assert.equal(normalized.totalQuestions, 25);
  assert.equal(normalized.correctCount, 15);
  assert.equal(normalized.wrongCount, 5);
  const skipped = normalized.totalQuestions - (normalized.correctCount + normalized.wrongCount);
  assert.equal(skipped, 5, 'Skipped questions must be exactly 5');
});

test('resultsService enforces account isolation and reactive subscriptions', async () => {
  // Student A context
  resultsService.setStudentContext('student_a_uid');
  resultsService.clear();

  let notificationsCount = 0;
  const unsubscribe = resultsService.subscribe(() => {
    notificationsCount++;
  });

  await resultsService.saveResult(
    normalizeTestResult({
      clientEventId: 'EVT_STUDENT_A_1',
      testId: 'EXAM_01',
      mode: 'EXAM',
      totalQuestions: 50,
      correctCount: 45,
      wrongCount: 5,
    })
  );

  const studentAResults = await resultsService.getAllResults();
  assert.equal(studentAResults.length, 1);
  assert.equal(studentAResults[0].clientEventId, 'EVT_STUDENT_A_1');
  assert.ok(notificationsCount >= 1, 'Subscriber must be notified on saveResult');

  // Switch context to Student B
  resultsService.setStudentContext('student_b_uid');
  const studentBResults = await resultsService.getAllResults();
  assert.equal(studentBResults.length, 0, 'Student B must not see Student A test results');

  // Switch back to Student A
  resultsService.setStudentContext('student_a_uid');
  const restoredAResults = await resultsService.getAllResults();
  assert.equal(restoredAResults.length, 1, 'Student A results must be preserved upon switching back');

  unsubscribe();
});
