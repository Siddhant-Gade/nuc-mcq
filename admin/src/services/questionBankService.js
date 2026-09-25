import * as XLSX from 'xlsx';
import apiClient, { request } from './api';
export async function getQuestionBankSummary() {
    return request('get', '/admin/question-bank/summary');
}
export async function getQuestionList(params) {
    const res = await apiClient.get('/admin/question-bank/questions', { params });
    return { questions: res.data.data, total: res.data.total ?? res.data.data.length };
}
export async function uploadQuestionBank(questions, replaceAll = true, version = '2.0.0') {
    return request('post', '/admin/question-bank/upload', { questions, replaceAll, version });
}
export async function clearQuestionBank() {
    await request('delete', '/admin/question-bank/clear');
}
export async function getPrebuiltQuestionBank(topic = 'FULL') {
    const res = await apiClient.get(`/admin/question-bank/prebuilt/${topic}`);
    const data = res.data?.data;
    if (!Array.isArray(data)) {
        throw new Error('Failed to load pre-built question bank.');
    }
    return data.map(normalizeRow);
}
export async function parseQuestionBankFile(file) {
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.pdf')) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await apiClient.post('/admin/question-bank/parse-file', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        const data = res.data?.data;
        if (!Array.isArray(data)) {
            throw new Error('Server did not return a valid question array.');
        }
        return data.map(normalizeRow);
    }
    if (fileName.endsWith('.json')) {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!Array.isArray(data)) {
            throw new Error('JSON file must contain an array of question objects.');
        }
        return data.map(normalizeRow);
    }
    // Parse Excel (.xlsx, .xls) or CSV
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
        throw new Error('The workbook contains no sheets.');
    }
    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet);
    return rawRows.map(normalizeRow);
}
function normalizeRow(row, index) {
    const section = String(row.section || row.Section || row.SECTION || row.topic || row.Topic || 'General').trim();
    const questionEn = String(row.question_en ||
        row.questionText ||
        row.questionEn ||
        row['ENGLISH QUESTION'] ||
        row['English Question'] ||
        row.Question ||
        row.question ||
        '').trim();
    const optAEn = String(row.opt_a_en ||
        row.optAEn ||
        row['OPTION A (EN)'] ||
        row['Option A (EN)'] ||
        row.OptionA ||
        row.option_a ||
        row.A ||
        '').trim();
    const optBEn = String(row.opt_b_en ||
        row.optBEn ||
        row['OPTION B (EN)'] ||
        row['Option B (EN)'] ||
        row.OptionB ||
        row.option_b ||
        row.B ||
        '').trim();
    const optCEn = String(row.opt_c_en ||
        row.optCEn ||
        row['OPTION C (EN)'] ||
        row['Option C (EN)'] ||
        row.OptionC ||
        row.option_c ||
        row.C ||
        '').trim();
    const optDEn = String(row.opt_d_en ||
        row.optDEn ||
        row['OPTION D (EN)'] ||
        row['Option D (EN)'] ||
        row.OptionD ||
        row.option_d ||
        row.D ||
        '').trim();
    let correctIdx = 0;
    if (typeof row.correct_index === 'number') {
        correctIdx = row.correct_index;
    }
    else if (typeof row.correctIndex === 'number') {
        correctIdx = row.correctIndex;
    }
    else if (row.correct_option || row.correctOption || row['CORRECT OPTION'] || row.CorrectOption || row.Answer) {
        const letter = String(row.correct_option || row.correctOption || row['CORRECT OPTION'] || row.CorrectOption || row.Answer)
            .trim()
            .toUpperCase();
        if (letter === 'B' || letter === '2')
            correctIdx = 1;
        else if (letter === 'C' || letter === '3')
            correctIdx = 2;
        else if (letter === 'D' || letter === '4')
            correctIdx = 3;
        else
            correctIdx = 0;
    }
    const optLetters = ['A', 'B', 'C', 'D'];
    const correctOptLetter = optLetters[correctIdx] || 'A';
    const opts = [optAEn, optBEn, optCEn, optDEn];
    const explanationEn = row.explanation_en ||
        row['ONE LINE EXPLANATION (EN)'] ||
        row['One Line Explanation (EN)'] ||
        row.explanation ||
        row.explanationEn;
    const questionMr = row.question_mr || row['MARATHI QUESTION'] || row['Marathi Question'] || row.questionMr;
    const optAMr = row.opt_a_mr || row['OPTION A (MR)'] || row['Option A (MR)'] || row.optAMr;
    const optBMr = row.opt_b_mr || row['OPTION B (MR)'] || row['Option B (MR)'] || row.optBMr;
    const optCMr = row.opt_c_mr || row['OPTION C (MR)'] || row['Option C (MR)'] || row.optCMr;
    const optDMr = row.opt_d_mr || row['OPTION D (MR)'] || row['Option D (MR)'] || row.optDMr;
    const explanationMr = row.explanation_mr ||
        row['ONE LINE EXPLANATION (MR)'] ||
        row['One Line Explanation (MR)'] ||
        row.explanationMr;
    const questionHi = row.question_hi || row['HINDI QUESTION'] || row['Hindi Question'] || row.questionHi;
    const optAHi = row.opt_a_hi || row['OPTION A (HI)'] || row['Option A (HI)'] || row.optAHi;
    const optBHi = row.opt_b_hi || row['OPTION B (HI)'] || row['Option B (HI)'] || row.optBHi;
    const optCHi = row.opt_c_hi || row['OPTION C (HI)'] || row['Option C (HI)'] || row.optCHi;
    const optDHi = row.opt_d_hi || row['OPTION D (HI)'] || row['Option D (HI)'] || row.optDHi;
    const explanationHi = row.explanation_hi ||
        row['ONE LINE EXPLANATION (HI)'] ||
        row['One Line Explanation (HI)'] ||
        row.explanationHi;
    const sr = typeof row.sr === 'number'
        ? row.sr
        : typeof row['Sr. No.'] === 'number'
            ? row['Sr. No.']
            : typeof row['Sr.No.'] === 'number'
                ? row['Sr.No.']
                : index + 1;
    return {
        sr,
        section,
        question_en: questionEn,
        opt_a_en: optAEn,
        opt_b_en: optBEn,
        opt_c_en: optCEn,
        opt_d_en: optDEn,
        correct_option: correctOptLetter,
        correct_index: correctIdx,
        correct_answer: String(row.correct_answer ||
            row['CORRECT ANSWER'] ||
            row['Correct Answer'] ||
            row.correctAnswer ||
            opts[correctIdx] ||
            optAEn).trim(),
        explanation_en: explanationEn ? String(explanationEn).trim() : null,
        question_mr: questionMr ? String(questionMr).trim() : null,
        opt_a_mr: optAMr ? String(optAMr).trim() : null,
        opt_b_mr: optBMr ? String(optBMr).trim() : null,
        opt_c_mr: optCMr ? String(optCMr).trim() : null,
        opt_d_mr: optDMr ? String(optDMr).trim() : null,
        explanation_mr: explanationMr ? String(explanationMr).trim() : null,
        question_hi: questionHi ? String(questionHi).trim() : null,
        opt_a_hi: optAHi ? String(optAHi).trim() : null,
        opt_b_hi: optBHi ? String(optBHi).trim() : null,
        opt_c_hi: optCHi ? String(optCHi).trim() : null,
        opt_d_hi: optDHi ? String(optDHi).trim() : null,
        explanation_hi: explanationHi ? String(explanationHi).trim() : null,
    };
}
