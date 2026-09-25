export class DashboardService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async getStats() {
        return this.repository.getStats();
    }
    async getStudentAnalytics() {
        return this.repository.getStudentAnalytics();
    }
}
