import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ThemeCubit extends Cubit<ThemeMode> {
  ThemeCubit([super.initialMode = ThemeMode.light]) {
    _loadSavedTheme();
  }

  static const _prefKey = 'student_app_theme_mode';

  Future<void> _loadSavedTheme() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_prefKey);
      if (saved != null) {
        switch (saved) {
          case 'light':
            emit(ThemeMode.light);
            break;
          case 'dark':
            emit(ThemeMode.dark);
            break;
          case 'system':
            emit(ThemeMode.system);
            break;
        }
      }
    } catch (_) {}
  }

  Future<void> _saveTheme(ThemeMode mode) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      String value;
      switch (mode) {
        case ThemeMode.light:
          value = 'light';
          break;
        case ThemeMode.dark:
          value = 'dark';
          break;
        case ThemeMode.system:
          value = 'system';
          break;
      }
      await prefs.setString(_prefKey, value);
    } catch (_) {}
  }

  void setLightMode() {
    emit(ThemeMode.light);
    _saveTheme(ThemeMode.light);
  }

  void setDarkMode() {
    emit(ThemeMode.dark);
    _saveTheme(ThemeMode.dark);
  }

  void setSystemMode() {
    emit(ThemeMode.system);
    _saveTheme(ThemeMode.system);
  }

  void toggleTheme() {
    if (state == ThemeMode.dark) {
      setLightMode();
    } else {
      setDarkMode();
    }
  }
}
