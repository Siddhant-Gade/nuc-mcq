import 'package:flutter_bloc/flutter_bloc.dart';
import '../repository/bookmarks_repository.dart';

class BookmarksState {
  const BookmarksState({
    required this.bookmarkedIds,
    this.isLoading = false,
  });

  final Set<String> bookmarkedIds;
  final bool isLoading;

  bool isBookmarked(String id) => bookmarkedIds.contains(id);
  bool isMaterialBookmarked(String materialId) =>
      bookmarkedIds.contains('mat_$materialId') || bookmarkedIds.contains(materialId);
  bool isQuestionBookmarked(String questionId) =>
      bookmarkedIds.contains(questionId) && !questionId.startsWith('mat_');

  int get count => bookmarkedIds.length;
  int get questionCount => bookmarkedIds.where((id) => !id.startsWith('mat_')).length;
  int get materialCount => bookmarkedIds.where((id) => id.startsWith('mat_')).length;

  BookmarksState copyWith({
    Set<String>? bookmarkedIds,
    bool? isLoading,
  }) {
    return BookmarksState(
      bookmarkedIds: bookmarkedIds ?? this.bookmarkedIds,
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

class BookmarksCubit extends Cubit<BookmarksState> {
  BookmarksCubit(this._repository)
      : super(const BookmarksState(bookmarkedIds: {}, isLoading: true)) {
    loadBookmarks();
  }

  final BookmarksRepository _repository;

  Future<void> loadBookmarks() async {
    final ids = await _repository.getBookmarkedIds();
    emit(state.copyWith(bookmarkedIds: ids, isLoading: false));
  }

  Future<bool> toggleBookmark(String id) async {
    final isNowBookmarked = await _repository.toggleBookmark(id);
    final updated = Set<String>.from(state.bookmarkedIds);
    if (isNowBookmarked) {
      updated.add(id);
    } else {
      updated.remove(id);
    }
    emit(state.copyWith(bookmarkedIds: updated));
    return isNowBookmarked;
  }

  Future<bool> toggleMaterialBookmark(String materialId) async {
    final key = 'mat_$materialId';
    return toggleBookmark(key);
  }
}
