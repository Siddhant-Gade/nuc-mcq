import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../../utils/api-error.js';
import { QuestionBankService } from './question-bank.service.js';

class FakeDatabase {
    questions = [];

    select(fields) {
        const self = this;
        return {
            from() {
                return {
                    where() {
                        return {
                            limit() {
                                return self.questions.slice(0, 1);
                            },
                            async then(resolve) {
                                if (fields && fields.maxSr) {
                                    const maxSr = self.questions.reduce((max, q) => Math.max(max, q.sr || 0), 0);
                                    return resolve([{ maxSr }]);
                                }
                                return resolve(self.questions);
                            },
                        };
                    },
                    $dynamic() {
                        return {
                            where() {
                                return this;
                            },
                            orderBy() {
                                return {
                                    limit() {
                                        return {
                                            offset() {
                                                return self.questions;
                                            },
                                        };
                                    },
                                };
                            },
                        };
                    },
                };
            },
        };
    }

    insert() {
        const self = this;
        return {
            values(rowOrRows) {
                return {
                    returning() {
                        const now = new Date();
                        const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
                        const inserted = rows.map((r, i) => ({
                            id: `00000000-0000-4000-8000-${String(self.questions.length + i + 1).padStart(12, '0')}`,
                            createdAt: now,
                            updatedAt: now,
                            ...r,
                        }));
                        self.questions.push(...inserted);
                        return Array.isArray(rowOrRows) ? inserted : [inserted[0]];
                    },
                };
            },
        };
    }

    update() {
        const self = this;
        return {
            set(updates) {
                return {
                    where() {
                        return {
                            returning() {
                                if (self.questions.length > 0) {
                                    self.questions[0] = { ...self.questions[0], ...updates, updatedAt: new Date() };
                                    return [self.questions[0]];
                                }
                                return [];
                            },
                        };
                    },
                };
            },
        };
    }

    delete() {
        const self = this;
        return {
            where() {
                self.questions = [];
                return Promise.resolve();
            },
        };
    }
}

test('createQuestion validates required inputs', async () => {
    const fakeDb = new FakeDatabase();
    const service = new QuestionBankService(fakeDb);

    await assert.rejects(
        () => service.createQuestion({ section: '', question_en: 'Test?', opt_a_en: 'A', opt_b_en: 'B', opt_c_en: 'C', opt_d_en: 'D' }),
        (err) => err instanceof ApiError && err.statusCode === 400 && err.message.includes('Topic/Section is required')
    );

    await assert.rejects(
        () => service.createQuestion({ section: 'MS Word', question_en: '', opt_a_en: 'A', opt_b_en: 'B', opt_c_en: 'C', opt_d_en: 'D' }),
        (err) => err instanceof ApiError && err.statusCode === 400 && err.message.includes('Question text')
    );

    await assert.rejects(
        () => service.createQuestion({ section: 'MS Word', question_en: 'Q?', opt_a_en: 'A', opt_b_en: '', opt_c_en: 'C', opt_d_en: 'D' }),
        (err) => err instanceof ApiError && err.statusCode === 400 && err.message.includes('All four options')
    );
});

test('createQuestion persists a question with derived correct option and answer', async () => {
    const fakeDb = new FakeDatabase();
    const service = new QuestionBankService(fakeDb);

    const created = await service.createQuestion({
        section: 'MS Word',
        question_en: 'What is Ctrl + S?',
        opt_a_en: 'Print',
        opt_b_en: 'Save',
        opt_c_en: 'Copy',
        opt_d_en: 'Cut',
        correct_option: 'B',
        explanation_en: 'Ctrl+S saves the document.',
    });

    assert.equal(created.section, 'MS Word');
    assert.equal(created.question_en, 'What is Ctrl + S?');
    assert.equal(created.opt_a_en, 'Print');
    assert.equal(created.opt_b_en, 'Save');
    assert.equal(created.correct_option, 'B');
    assert.equal(created.correct_index, 1);
    assert.equal(created.correct_answer, 'Save');
    assert.equal(created.explanation_en, 'Ctrl+S saves the document.');
    assert.equal(fakeDb.questions.length, 1);
});

test('getQuestionById returns question or throws 404', async () => {
    const fakeDb = new FakeDatabase();
    const service = new QuestionBankService(fakeDb);

    const created = await service.createQuestion({
        section: 'Excel',
        question_en: 'What is SUM?',
        opt_a_en: 'Average',
        opt_b_en: 'Addition',
        opt_c_en: 'Count',
        opt_d_en: 'Min',
        correct_option: 'B',
    });

    const found = await service.getQuestionById(created.id);
    assert.equal(found.id, created.id);
    assert.equal(found.question_en, 'What is SUM?');

    fakeDb.questions = [];
    await assert.rejects(
        () => service.getQuestionById('00000000-0000-0000-0000-000000000999'),
        (err) => err instanceof ApiError && err.statusCode === 404
    );
});

test('updateQuestion updates fields and realigns correct answer', async () => {
    const fakeDb = new FakeDatabase();
    const service = new QuestionBankService(fakeDb);

    const created = await service.createQuestion({
        section: 'PowerPoint',
        question_en: 'What is F5?',
        opt_a_en: 'Exit',
        opt_b_en: 'Start Slideshow',
        opt_c_en: 'New Slide',
        opt_d_en: 'Save',
        correct_option: 'B',
    });

    const updated = await service.updateQuestion(created.id, {
        opt_c_en: 'Slideshow from beginning',
        correct_option: 'C',
    });

    assert.equal(updated.opt_c_en, 'Slideshow from beginning');
    assert.equal(updated.correct_option, 'C');
    assert.equal(updated.correct_index, 2);
    assert.equal(updated.correct_answer, 'Slideshow from beginning');
    assert.equal(updated.opt_a_en, 'Exit'); // unchanged
});

test('deleteQuestion deletes targeted question', async () => {
    const fakeDb = new FakeDatabase();
    const service = new QuestionBankService(fakeDb);

    const created = await service.createQuestion({
        section: 'Windows',
        question_en: 'What is GUI?',
        opt_a_en: 'Graphical User Interface',
        opt_b_en: 'General User Input',
        opt_c_en: 'Global Unified Index',
        opt_d_en: 'None',
        correct_option: 'A',
    });

    const result = await service.deleteQuestion(created.id);
    assert.deepEqual(result, { deleted: true, id: created.id });
    assert.equal(fakeDb.questions.length, 0);
});
