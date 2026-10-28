import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/question_model.dart';

/// Question Bank Repository for New Unique Computers Student App.
/// Supports 100% offline practice tests with persistent local caching
/// and automatic backend synchronization when online.
class QuestionBankRepository {
  QuestionBankRepository([List<QuestionModel>? initialQuestions, Dio? dio])
    : _dio = dio {
    if (initialQuestions != null && initialQuestions.isNotEmpty) {
      _questions = List<QuestionModel>.from(initialQuestions);
    }
  }

  final Dio? _dio;
  static const String version = '2.0.0';
  static const String legacyCacheKey = 'cached_offline_question_bank_v1';
  static const String _cacheKey = 'cached_offline_question_bank_v2';

  List<QuestionModel> _questions = [];

  List<QuestionModel> getAllQuestions() => List.unmodifiable(_questions);

  List<QuestionModel> getQuestionsByTopic(QuestionTopic topic) {
    return _questions.where((q) => q.topic == topic).toList();
  }

  QuestionModel? getQuestionById(String id) {
    try {
      return _questions.firstWhere((q) => q.id == id);
    } catch (_) {
      return null;
    }
  }

  int get totalCount => _questions.length;

  Map<QuestionTopic, int> getTopicCounts() {
    final map = <QuestionTopic, int>{};
    for (final topic in QuestionTopic.values) {
      map[topic] = _questions.where((q) => q.topic == topic).length;
    }
    return map;
  }

  /// Loads cached questions from local device storage for 100% offline availability.
  /// Automatically purges stale v1 cache from Question_Bank_All_Topics.xlsx.
  /// Falls back to bundled real GCC-TBC asset if no cache exists yet.
  Future<void> loadFromCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      // Invalidate and remove old seeded cache
      if (prefs.containsKey(legacyCacheKey)) {
        await prefs.remove(legacyCacheKey);
      }

      final cachedJson = prefs.getString(_cacheKey);
      if (cachedJson != null && cachedJson.isNotEmpty) {
        loadFromJsonString(cachedJson);
      } else {
        await loadFromAsset('assets/data/question_bank.json');
      }
    } catch (_) {
      try {
        await loadFromAsset('assets/data/question_bank.json');
      } catch (_) {}
    }
  }

  /// Explicitly clears local cached questions.
  Future<void> clearCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(legacyCacheKey);
      await prefs.remove(_cacheKey);
      _questions.clear();
    } catch (_) {}
  }

  /// Synchronizes questions from the institute backend and caches them locally.
  Future<int> syncFromBackend([Dio? customDio]) async {
    final client = customDio ?? _dio;
    if (client == null) return _questions.length;

    try {
      final response = await client.get<Object?>(
        '/api/v1/student/question-bank',
      );
      if (response.data is Map && (response.data as Map)['success'] == true) {
        final list = (response.data as Map)['data'];
        if (list is List && list.isNotEmpty) {
          final jsonString = jsonEncode(list);
          loadFromJsonString(jsonString);

          // Persist to local storage for 100% offline test-taking
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString(_cacheKey, jsonString);
          return _questions.length;
        }
      }
    } catch (_) {
      // Offline fallback: keep current cached questions
    }
    return _questions.length;
  }

  /// Sets questions dynamically from an uploaded dataset or server sync.
  void setQuestions(List<QuestionModel> newQuestions) {
    _questions = List<QuestionModel>.from(newQuestions);
  }

  /// Loads questions from JSON asset or raw JSON string.
  Future<void> loadFromAsset([
    String assetPath = 'assets/data/question_bank.json',
  ]) async {
    try {
      final jsonStr = await rootBundle.loadString(assetPath);
      loadFromJsonString(jsonStr);
    } catch (_) {
      // Clean fallback: empty repository until admin uploads
    }
  }

  void loadFromJsonString(String jsonString) {
    final decoded = jsonDecode(jsonString);
    final dynamic rawList = decoded is List
        ? decoded
        : decoded is Map
        ? (decoded['data'] ?? decoded['questions'])
        : null;
    if (rawList is! List) {
      throw const FormatException(
        'Question bank must contain a list of questions',
      );
    }

    final parsed = <QuestionModel>[];
    final seenIds = <String>{};
    for (final item in rawList) {
      if (item is! Map) continue;
      try {
        final question = parseJsonItem(Map<String, dynamic>.from(item));
        if (question.questionText.trim().isEmpty ||
            question.options.length < 2 ||
            question.options.every((option) => option.trim().isEmpty) ||
            !seenIds.add(question.id)) {
          continue;
        }
        parsed.add(question);
      } on FormatException {
        continue;
      }
    }
    if (parsed.isEmpty) {
      throw const FormatException('Question bank contains no valid questions');
    }
    _questions = parsed;
  }

  static QuestionModel parseJsonItem(Map<String, dynamic> item) {
    String text(dynamic value) => value == null ? '' : value.toString().trim();
    final secStr = text(item['section']);
    final topic = _topicFromString(secStr);
    final rawOptions = item['options'];
    final options = rawOptions is List
        ? rawOptions.map(text).toList()
        : [
            text(item['opt_a_en']),
            text(item['opt_b_en']),
            text(item['opt_c_en']),
            text(item['opt_d_en']),
          ];
    final normalizedOptions = _normalizeOptions(options);
    final questionText = text(item['question_en'] ?? item['questionText']);
    final serial = text(item['sr']);
    final questionId = text(item['id']).isNotEmpty
        ? text(item['id'])
        : (serial.isNotEmpty
              ? 'Q_${topic.name}_$serial'
              : 'Q_${topic.name}_${questionText.toLowerCase().replaceAll(RegExp(r'\W+'), '_').substring(0, questionText.length > 40 ? 40 : questionText.length)}');
    final rawCorrect =
        item['correct_index'] ??
        item['correctOptionIndex'] ??
        item['correct_option'];
    final correctIdx = _parseCorrectIndex(rawCorrect, normalizedOptions.length);

    List<String>? localizedOptions(String key, List<String> optionKeys) {
      final raw = item[key];
      final values = raw is List
          ? raw.map(text).toList()
          : optionKeys.map((optionKey) => text(item[optionKey])).toList();
      return values.any((value) => value.isNotEmpty) ? values : null;
    }

    return QuestionModel(
      id: questionId,
      topic: topic,
      questionText: questionText,
      options: normalizedOptions,
      correctOptionIndex: correctIdx,
      explanation: text(item['explanation_en'] ?? item['explanation']),
      questionTextMr:
          text(item['question_mr'] ?? item['questionTextMr']).isEmpty
          ? null
          : text(item['question_mr'] ?? item['questionTextMr']),
      optionsMr: localizedOptions('optionsMr', const [
        'opt_a_mr',
        'opt_b_mr',
        'opt_c_mr',
        'opt_d_mr',
      ]),
      explanationMr:
          text(item['explanation_mr'] ?? item['explanationMr']).isEmpty
          ? null
          : text(item['explanation_mr'] ?? item['explanationMr']),
      questionTextHi:
          text(item['question_hi'] ?? item['questionTextHi']).isEmpty
          ? null
          : text(item['question_hi'] ?? item['questionTextHi']),
      optionsHi: localizedOptions('optionsHi', const [
        'opt_a_hi',
        'opt_b_hi',
        'opt_c_hi',
        'opt_d_hi',
      ]),
      explanationHi:
          text(item['explanation_hi'] ?? item['explanationHi']).isEmpty
          ? null
          : text(item['explanation_hi'] ?? item['explanationHi']),
    );
  }

  static int _parseCorrectIndex(dynamic raw, int optionCount) {
    final value = raw?.toString().trim() ?? '';
    if (RegExp(r'^[A-D]$', caseSensitive: false).hasMatch(value)) {
      return value.toUpperCase().codeUnitAt(0) - 65;
    }

    final parsed = int.tryParse(value);
    if (parsed == null || optionCount == 0) return 0;
    return parsed.clamp(0, optionCount - 1);
  }

  static List<String> _normalizeOptions(List<String> options) {
    final cleaned = options.map((option) => option.trim()).toList();
    final nonEmpty = cleaned.where((option) => option.isNotEmpty).toList();
    final isTrueFalse =
        nonEmpty.length >= 2 &&
        RegExp(r'^(true|false)$', caseSensitive: false).hasMatch(nonEmpty[0]) &&
        RegExp(r'^(true|false)$', caseSensitive: false).hasMatch(nonEmpty[1]) &&
        nonEmpty[0].toLowerCase() != nonEmpty[1].toLowerCase();
    return isTrueFalse ? nonEmpty.take(2).toList() : cleaned;
  }

  static QuestionTopic _topicFromString(String section) {
    switch (section.trim().toLowerCase()) {
      case 'power-point':
      case 'powerpoint':
        return QuestionTopic.powerpoint;
      case 'computer fundamentals':
      case 'computerfundamentals':
        return QuestionTopic.computerFundamentals;
      case 'ms word':
      case 'word':
        return QuestionTopic.word;
      case 'ms excel':
      case 'excel':
        return QuestionTopic.excel;
      case 'pagemaker':
        return QuestionTopic.pagemaker;
      case 'internet':
        return QuestionTopic.internet;
      case 'operating system':
      case 'os':
        return QuestionTopic.os;
      case 'ms outlook':
      case 'outlook':
        return QuestionTopic.outlook;
      default:
        return QuestionTopic.computerFundamentals;
    }
  }
}
