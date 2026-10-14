import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:student_app/features/bookmarks/cubit/bookmarks_cubit.dart';
import 'package:student_app/features/bookmarks/repository/bookmarks_repository.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('BookmarksRepository & BookmarksCubit', () {
    late BookmarksRepository repository;

    setUp(() {
      SharedPreferences.setMockInitialValues({
        'bookmarked_question_ids_v1': ['Q_CF_001', 'Q_WD_001'],
      });
      repository = BookmarksRepository();
    });

    test('Loads initial bookmarked question IDs from SharedPreferences', () async {
      final bookmarks = await repository.getBookmarkedIds();
      expect(bookmarks, contains('Q_CF_001'));
      expect(bookmarks, contains('Q_WD_001'));
      expect(bookmarks.length, 2);
    });

    test('toggleBookmark adds and removes question IDs', () async {
      // Toggle new question (add)
      final added = await repository.toggleBookmark('Q_EX_001');
      expect(added, isTrue);
      var current = await repository.getBookmarkedIds();
      expect(current.contains('Q_EX_001'), isTrue);
      expect(current.length, 3);

      // Toggle existing question (remove)
      final removed = await repository.toggleBookmark('Q_CF_001');
      expect(removed, isFalse);
      current = await repository.getBookmarkedIds();
      expect(current.contains('Q_CF_001'), isFalse);
      expect(current.length, 2);
    });

    test('BookmarksCubit loads and reacts to bookmark toggles', () async {
      final cubit = BookmarksCubit(repository);
      await cubit.loadBookmarks();

      expect(cubit.state.isBookmarked('Q_CF_001'), isTrue);
      expect(cubit.state.count, 2);

      // Toggle via cubit
      final isBookmarked = await cubit.toggleBookmark('Q_PP_001');
      expect(isBookmarked, isTrue);
      expect(cubit.state.isBookmarked('Q_PP_001'), isTrue);
      expect(cubit.state.count, 3);
    });

    test('BookmarksCubit handles study material bookmarks and separates counts', () async {
      final cubit = BookmarksCubit(repository);
      await cubit.loadBookmarks();

      // Initial state: 2 questions, 0 materials
      expect(cubit.state.questionCount, 2);
      expect(cubit.state.materialCount, 0);

      // Bookmark a material using toggleMaterialBookmark
      final added = await cubit.toggleMaterialBookmark('doc_123');
      expect(added, isTrue);
      expect(cubit.state.isMaterialBookmarked('doc_123'), isTrue);
      expect(cubit.state.isMaterialBookmarked('mat_doc_123'), isTrue);
      expect(cubit.state.isQuestionBookmarked('doc_123'), isFalse);
      expect(cubit.state.materialCount, 1);
      expect(cubit.state.questionCount, 2);

      // Unbookmark the material
      final removed = await cubit.toggleMaterialBookmark('doc_123');
      expect(removed, isFalse);
      expect(cubit.state.isMaterialBookmarked('doc_123'), isFalse);
      expect(cubit.state.materialCount, 0);
      expect(cubit.state.questionCount, 2);
    });
  });
}
