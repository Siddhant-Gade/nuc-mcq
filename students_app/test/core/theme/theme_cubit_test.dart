import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:student_app/core/theme/theme_cubit.dart';

void main() {
  group('ThemeCubit', () {
    test('initial state defaults to light mode and toggles properly', () {
      final cubit = ThemeCubit();
      expect(cubit.state, ThemeMode.light);

      cubit.setDarkMode();
      expect(cubit.state, ThemeMode.dark);

      cubit.toggleTheme();
      expect(cubit.state, ThemeMode.light);

      cubit.setSystemMode();
      expect(cubit.state, ThemeMode.system);
    });
  });
}
