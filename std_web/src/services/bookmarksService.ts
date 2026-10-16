const BOOKMARKS_STORAGE_KEY = 'bookmarked_question_ids_v1';

class BookmarksService {
  private bookmarkedIds: Set<string> = new Set();
  private isLoaded = false;

  private load(): void {
    if (this.isLoaded) return;
    try {
      const raw = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        this.bookmarkedIds = new Set(Array.isArray(list) ? list : []);
      }
      this.isLoaded = true;
    } catch {
      this.bookmarkedIds = new Set();
      this.isLoaded = true;
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(Array.from(this.bookmarkedIds)));
    } catch {
      // LocalStorage error
    }
  }

  getBookmarkedIds(): Set<string> {
    this.load();
    return new Set(this.bookmarkedIds);
  }

  isBookmarked(questionId: string): boolean {
    this.load();
    return this.bookmarkedIds.has(questionId);
  }

  toggleBookmark(questionId: string): boolean {
    this.load();
    const isNowBookmarked = !this.bookmarkedIds.has(questionId);
    if (isNowBookmarked) {
      this.bookmarkedIds.add(questionId);
    } else {
      this.bookmarkedIds.delete(questionId);
    }
    this.persist();
    return isNowBookmarked;
  }

  clearAll(): void {
    this.bookmarkedIds.clear();
    this.isLoaded = true;
    try {
      localStorage.removeItem(BOOKMARKS_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}

export const bookmarksService = new BookmarksService();
