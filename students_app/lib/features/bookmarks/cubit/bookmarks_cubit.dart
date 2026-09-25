import 'package:flutter_bloc/flutter_bloc.dart';
import '../repository/bookmarks_repository.dart';

class BookmarksState {
  const BookmarksState({
    required this.bookmarkedIds,
    this.isLoading = false,
  });

  final Set<String> bookmarkedIds;
  final bool isLoading;

  bool isBookmarked(String questionId) => bookmarkedIds.contains(questionId);
  int get count => bookmarkedIds.length;

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

  Future<bool> toggleBookmark(String questionId) async {
    final isNowBookmarked = await _repository.toggleBookmark(questionId);
    final updated = Set<String>.from(state.bookmarkedIds);
    if (isNowBookmarked) {
      updated.add(questionId);
    } else {
      updated.remove(questionId);
    }
    emit(state.copyWith(bookmarkedIds: updated));
    return isNowBookmarked;
  }
}
