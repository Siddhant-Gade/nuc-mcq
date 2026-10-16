import 'package:shared_preferences/shared_preferences.dart';

/// Repository for managing persistent offline bookmarked questions.
class BookmarksRepository {
  BookmarksRepository({SharedPreferences? prefs}) : _prefsInstance = prefs;

  SharedPreferences? _prefsInstance;
  static const String _storageKey = 'bookmarked_question_ids_v1';

  Future<SharedPreferences> _getPrefs() async {
    _prefsInstance ??= await SharedPreferences.getInstance();
    return _prefsInstance!;
  }

  /// Loads the set of bookmarked question IDs.
  Future<Set<String>> getBookmarkedIds() async {
    final prefs = await _getPrefs();
    final list = prefs.getStringList(_storageKey) ?? <String>[];
    return list.toSet();
  }

  /// Toggles a question's bookmark status, persisting changes immediately.
  Future<bool> toggleBookmark(String questionId) async {
    final prefs = await _getPrefs();
    final current = (prefs.getStringList(_storageKey) ?? <String>[]).toSet();
    final isNowBookmarked = !current.contains(questionId);

    if (isNowBookmarked) {
      current.add(questionId);
    } else {
      current.remove(questionId);
    }

    await prefs.setStringList(_storageKey, current.toList());
    return isNowBookmarked;
  }

  /// Saves the complete set of bookmarked question IDs.
  Future<void> saveBookmarks(Set<String> bookmarkIds) async {
    final prefs = await _getPrefs();
    await prefs.setStringList(_storageKey, bookmarkIds.toList());
  }

  /// Clears all bookmarks.
  Future<void> clearAll() async {
    final prefs = await _getPrefs();
    await prefs.remove(_storageKey);
  }
}
