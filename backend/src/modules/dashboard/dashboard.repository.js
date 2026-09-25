import { eq, sql, desc } from 'drizzle-orm';
import { authorizationRequests, batches, studentAccess, studentProfiles, testResults, questions } from '../../database/schema/index.js';
export class DrizzleDashboardRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    /**
     * All figures are computed inside PostgreSQL — no table is ever loaded
     * into Node just to be counted.
     *
     * Batch ACTIVE/FULL follow the same derived rule as the batches module:
     * stored INACTIVE wins, otherwise a batch is FULL when its aggregated
     * enrollment reaches capacity, otherwise ACTIVE.
     */
    async getStats() {
        const [accessRow] = await this.database
            .select({
            totalStudents: sql `count(*)::int`,
            activeStudents: sql `count(*) filter (where ${studentAccess.status} = 'ACTIVE')::int`,
        })
            .from(studentProfiles)
            .leftJoin(studentAccess, eq(studentAccess.studentProfileId, studentProfiles.id));
        const [requestRow] = await this.database
            .select({
            pendingAuthorizations: sql `count(*) filter (where ${authorizationRequests.status} = 'PENDING')::int`,
        })
            .from(authorizationRequests);
        // One grouped subquery computes per-batch enrollment; the outer select
        // classifies each batch once instead of loading rows into Node.
        const enrollmentSubquery = this.database
            .select({
            batchId: batches.batchId,
            status: batches.status,
            capacity: batches.capacity,
            enrolled: sql `count(${studentProfiles.id})::int`.as('enrolled'),
        })
            .from(batches)
            .leftJoin(studentProfiles, sql `${studentProfiles.batchId} = ${batches.batchId}`)
            .groupBy(batches.batchId)
            .as('batch_enrollment');
        const [batchRow] = await this.database
            .select({
            totalBatches: sql `count(*)::int`,
            activeBatches: sql `count(*) filter (where ${enrollmentSubquery.status} = 'ACTIVE' and ${enrollmentSubquery.enrolled} < ${enrollmentSubquery.capacity})::int`,
            fullBatches: sql `count(*) filter (where ${enrollmentSubquery.status} <> 'INACTIVE' and ${enrollmentSubquery.enrolled} >= ${enrollmentSubquery.capacity})::int`,
        })
            .from(enrollmentSubquery);
        return {
            totalStudents: accessRow?.totalStudents ?? 0,
            activeStudents: accessRow?.activeStudents ?? 0,
            pendingAuthorizations: requestRow?.pendingAuthorizations ?? 0,
            totalBatches: batchRow?.totalBatches ?? 0,
            activeBatches: batchRow?.activeBatches ?? 0,
            fullBatches: batchRow?.fullBatches ?? 0,
        };
    }

    async getStudentAnalytics() {
        const [overallRow] = await this.database
            .select({
                totalTests: sql`count(*)::int`,
                passedCount: sql`count(*) filter (where (${testResults.score} / nullif(${testResults.totalQuestions}, 0)::float) >= 0.4)::int`,
                practiceCount: sql`count(*) filter (where ${testResults.mode} = 'PRACTICE')::int`,
                examCount: sql`count(*) filter (where ${testResults.mode} = 'EXAM')::int`,
                uniqueStudents: sql`count(distinct ${testResults.studentProfileId})::int`,
            })
            .from(testResults);

        const totalTests = overallRow?.totalTests ?? 0;
        const passedCount = overallRow?.passedCount ?? 0;
        const passRate = totalTests > 0 ? Math.round((passedCount / totalTests) * 100) : 0;

        const [avgRow] = await this.database
            .select({
                avgPercentage: sql`coalesce(round(avg((${testResults.score} / nullif(${testResults.totalQuestions}, 0)::float) * 100)::numeric, 1), 0)::float`,
            })
            .from(testResults);
        const avgScore = avgRow?.avgPercentage ?? 0;

        const recentSubmissionsRaw = await this.database
            .select({
                id: testResults.id,
                studentProfileId: testResults.studentProfileId,
                studentName: studentProfiles.name,
                studentId: studentProfiles.studentId,
                batchId: studentProfiles.batchId,
                mode: testResults.mode,
                score: testResults.score,
                correctCount: testResults.correctCount,
                wrongCount: testResults.wrongCount,
                totalQuestions: testResults.totalQuestions,
                wrongQuestionIds: testResults.wrongQuestionIds,
                completedAt: testResults.completedAt,
            })
            .from(testResults)
            .leftJoin(studentProfiles, eq(testResults.studentProfileId, studentProfiles.id))
            .orderBy(desc(testResults.completedAt))
            .limit(20);

        const bankSections = await this.database
            .select({
                section: questions.section,
                count: sql`count(*)::int`,
            })
            .from(questions)
            .groupBy(questions.section);

        const allWrongIdsRows = await this.database
            .select({
                wrongQuestionIds: testResults.wrongQuestionIds,
            })
            .from(testResults);

        const defaultSections = [
            'Computer Fundamentals',
            'Operating System',
            'MS Word',
            'MS Excel',
            'Power-Point',
            'PageMaker',
            'Internet'
        ];

        const topicErrors = {};
        for (const s of defaultSections) {
            topicErrors[s] = 0;
        }
        for (const bs of bankSections) {
            if (bs.section && topicErrors[bs.section] === undefined) {
                topicErrors[bs.section] = 0;
            }
        }

        let totalWrongAnswers = 0;
        for (const row of allWrongIdsRows) {
            const arr = Array.isArray(row.wrongQuestionIds) ? row.wrongQuestionIds : [];
            for (const qId of arr) {
                totalWrongAnswers++;
                const str = String(qId).toLowerCase();
                if (str.includes('excel')) {
                    topicErrors['MS Excel'] = (topicErrors['MS Excel'] || 0) + 1;
                } else if (str.includes('word')) {
                    topicErrors['MS Word'] = (topicErrors['MS Word'] || 0) + 1;
                } else if (str.includes('os') || str.includes('operating')) {
                    topicErrors['Operating System'] = (topicErrors['Operating System'] || 0) + 1;
                } else if (str.includes('powerpoint') || str.includes('power-point') || str.includes('power')) {
                    topicErrors['Power-Point'] = (topicErrors['Power-Point'] || 0) + 1;
                } else if (str.includes('pagemaker') || str.includes('page')) {
                    topicErrors['PageMaker'] = (topicErrors['PageMaker'] || 0) + 1;
                } else if (str.includes('internet')) {
                    topicErrors['Internet'] = (topicErrors['Internet'] || 0) + 1;
                } else if (str.includes('computer') || str.includes('fundamental')) {
                    topicErrors['Computer Fundamentals'] = (topicErrors['Computer Fundamentals'] || 0) + 1;
                } else {
                    topicErrors['General'] = (topicErrors['General'] || 0) + 1;
                }
            }
        }

        const bankSectionCounts = {};
        bankSections.forEach(b => {
            bankSectionCounts[b.section] = b.count;
        });

        const recommendationsMap = {
            'MS Excel': 'Schedule a workshop on Excel Formulas, IF conditions & cell referencing.',
            'Operating System': 'Conduct hands-on session for Windows shortcut keys, file extensions & control panel.',
            'Computer Fundamentals': 'Review CPU architectures, memory units (KB, MB, GB), and I/O devices.',
            'MS Word': 'Practice table formatting, mail merge, and header/footer margins with students.',
            'Power-Point': 'Demonstrate slide transitions, slide master, and presentation layout presets.',
            'PageMaker': 'Guide students through desktop publishing palettes, text blocks & document setup.',
            'Internet': 'Cover URL structures, email protocols (SMTP/POP3), and web browser security.'
        };

        const topicBreakdown = Object.entries(topicErrors)
            .map(([topic, errors]) => {
                const totalInBank = bankSectionCounts[topic] ?? 50;
                const percentage = totalWrongAnswers > 0 ? Math.round((errors / totalWrongAnswers) * 100) : 0;
                return {
                    topic,
                    errorCount: errors,
                    percentage,
                    totalQuestionsInBank: totalInBank,
                    recommendation: recommendationsMap[topic] || 'Review core chapter concepts with students.',
                };
            })
            .sort((a, b) => b.errorCount - a.errorCount);

        const weakestTopic = topicBreakdown.length > 0 && topicBreakdown[0].errorCount > 0 
            ? topicBreakdown[0].topic 
            : 'None Identified';

        const strongestTopic = topicBreakdown.length > 0 
            ? [...topicBreakdown].reverse().find(t => t.errorCount === 0 || t.errorCount < (topicBreakdown[0].errorCount / 2))?.topic || topicBreakdown[topicBreakdown.length - 1].topic
            : 'None';

        const actionableInsights = [];
        if (topicBreakdown.length > 0 && topicBreakdown[0].errorCount > 0) {
            actionableInsights.push({
                id: 'action-1',
                priority: 'HIGH',
                title: `Intensive Revision: ${topicBreakdown[0].topic}`,
                description: `${topicBreakdown[0].topic} accounts for ${topicBreakdown[0].percentage}% of student mistakes (${topicBreakdown[0].errorCount} wrong answers). Schedule a doubt-clearing session or practical lab.`,
                actionType: 'study_material',
                actionLabel: 'Upload Study Material',
                actionLink: '/study-materials',
            });
        }
        if (topicBreakdown.length > 1 && topicBreakdown[1].errorCount > 0) {
            actionableInsights.push({
                id: 'action-2',
                priority: 'MEDIUM',
                title: `Secondary Focus: ${topicBreakdown[1].topic}`,
                description: `Students show repeated confusion in ${topicBreakdown[1].topic} (${topicBreakdown[1].errorCount} errors). Send practice tips or video tutorial links to active batches.`,
                actionType: 'broadcast',
                actionLabel: 'Broadcast Announcement',
                actionLink: '/broadcasts',
            });
        }
        if (passRate < 70 && totalTests > 0) {
            actionableInsights.push({
                id: 'action-3',
                priority: 'HIGH',
                title: 'Mock Exam Drill Recommended',
                description: `Current overall pass rate is ${passRate}%. Encourage students to complete at least 3 Practice Tests before their scheduled final exam.`,
                actionType: 'questions',
                actionLabel: 'Manage Question Bank',
                actionLink: '/question-bank',
            });
        } else {
            actionableInsights.push({
                id: 'action-3',
                priority: 'LOW',
                title: 'Maintain Practice Consistency',
                description: 'Ensure all students continue weekly mock tests to retain speed and accuracy across all syllabus modules.',
                actionType: 'students',
                actionLabel: 'View Active Students',
                actionLink: '/students',
            });
        }

        const recentSubmissions = recentSubmissionsRaw.map(r => {
            const pct = r.totalQuestions > 0 ? Math.round((r.score / r.totalQuestions) * 100) : 0;
            return {
                id: r.id,
                studentProfileId: r.studentProfileId,
                studentName: r.studentName || 'Student',
                studentId: r.studentId || 'N/A',
                batchId: r.batchId || 'Unassigned',
                mode: r.mode,
                score: r.score,
                totalQuestions: r.totalQuestions,
                correctCount: r.correctCount,
                wrongCount: r.wrongCount,
                percentage: pct,
                isPassed: pct >= 40,
                completedAt: r.completedAt,
            };
        });

        return {
            summary: {
                totalTests,
                avgScore,
                passRate,
                practiceCount: overallRow?.practiceCount ?? 0,
                examCount: overallRow?.examCount ?? 0,
                uniqueStudents: overallRow?.uniqueStudents ?? 0,
                totalWrongAnswers,
                weakestTopic,
                strongestTopic,
            },
            topicBreakdown,
            actionableInsights,
            recentSubmissions,
        };
    }
}
