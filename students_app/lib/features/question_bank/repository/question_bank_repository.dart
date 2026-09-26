import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/question_model.dart';

/// Question Bank Repository for New Unique Computers Student App.
/// Supports 100% offline practice tests with persistent local caching
/// and automatic backend synchronization when online.
class QuestionBankRepository {
  QuestionBankRepository([List<QuestionModel>? initialQuestions, Dio? dio]) : _dio = dio {
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
      final response = await client.get<Object?>('/api/v1/student/question-bank');
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
  Future<void> loadFromAsset([String assetPath = 'assets/data/question_bank.json']) async {
    try {
      final jsonStr = await rootBundle.loadString(assetPath);
      loadFromJsonString(jsonStr);
    } catch (_) {
      // Clean fallback: empty repository until admin uploads
    }
  }

  void loadFromJsonString(String jsonString) {
    final List<dynamic> list = jsonDecode(jsonString) as List<dynamic>;
    _questions = list.map((item) => parseJsonItem(item as Map<String, dynamic>)).toList();
  }

  static QuestionModel parseJsonItem(Map<String, dynamic> item) {
    final secStr = item['section'] ?? '';
    final topic = _topicFromString(secStr);
    final correctIdx = item['correct_index'] is int ? item['correct_index'] as int : 0;
    final sr = item['sr'] ?? DateTime.now().millisecondsSinceEpoch;

    return QuestionModel(
      id: 'Q_${topic.name}_$sr',
      topic: topic,
      questionText: item['question_en'] ?? item['questionText'] ?? '',
      options: [
        item['opt_a_en'] ?? '',
        item['opt_b_en'] ?? '',
        item['opt_c_en'] ?? '',
        item['opt_d_en'] ?? '',
      ],
      correctOptionIndex: correctIdx,
      explanation: item['explanation_en'] ?? item['explanation'] ?? '',
      questionTextMr: item['question_mr'] ?? item['questionTextMr'],
      optionsMr: () {
        final list = [
          (item['opt_a_mr'] ?? '').toString().trim(),
          (item['opt_b_mr'] ?? '').toString().trim(),
          (item['opt_c_mr'] ?? '').toString().trim(),
          (item['opt_d_mr'] ?? '').toString().trim(),
        ];
        return list.any((s) => s.isNotEmpty) ? list : null;
      }(),
      explanationMr: item['explanation_mr'] ?? item['explanationMr'],
      questionTextHi: item['question_hi'] ?? item['questionTextHi'],
      optionsHi: () {
        final list = [
          (item['opt_a_hi'] ?? '').toString().trim(),
          (item['opt_b_hi'] ?? '').toString().trim(),
          (item['opt_c_hi'] ?? '').toString().trim(),
          (item['opt_d_hi'] ?? '').toString().trim(),
        ];
        return list.any((s) => s.isNotEmpty) ? list : null;
      }(),
      explanationHi: item['explanation_hi'] ?? item['explanationHi'],
    );
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
