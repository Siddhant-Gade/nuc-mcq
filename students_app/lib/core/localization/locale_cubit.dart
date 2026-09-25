import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LocaleCubit extends Cubit<Locale> {
  LocaleCubit([Locale? initialLocale])
      : super(initialLocale ?? const Locale('en')) {
    _loadSavedLocale();
  }

  static const _prefKey = 'student_app_locale';

  Future<void> _loadSavedLocale() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final code = prefs.getString(_prefKey);
      if (code != null && ['en', 'mr', 'hi'].contains(code)) {
        emit(Locale(code));
      }
    } catch (_) {}
  }

  Future<void> setLocale(String languageCode) async {
    if (!['en', 'mr', 'hi'].contains(languageCode)) return;
    emit(Locale(languageCode));
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefKey, languageCode);
    } catch (_) {}
  }

  String get languageName {
    switch (state.languageCode) {
      case 'mr':
        return 'मराठी';
      case 'hi':
        return 'हिंदी';
      case 'en':
      default:
        return 'English';
    }
  }
}
