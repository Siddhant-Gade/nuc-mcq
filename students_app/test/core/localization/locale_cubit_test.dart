import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:student_app/core/localization/app_localizations.dart';
import 'package:student_app/core/localization/locale_cubit.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('LocaleCubit & AppLocalizations', () {
    test('LocaleCubit defaults to English and toggles between MR and HI', () async {
      final cubit = LocaleCubit();
      expect(cubit.state.languageCode, equals('en'));
      expect(cubit.languageName, equals('English'));

      await cubit.setLocale('mr');
      expect(cubit.state.languageCode, equals('mr'));
      expect(cubit.languageName, equals('मराठी'));

      await cubit.setLocale('hi');
      expect(cubit.state.languageCode, equals('hi'));
      expect(cubit.languageName, equals('हिंदी'));

      await cubit.close();
    });

    test('AppLocalizations provides translated strings for EN, MR, and HI', () {
      final en = AppLocalizations(const Locale('en'));
      final mr = AppLocalizations(const Locale('mr'));
      final hi = AppLocalizations(const Locale('hi'));

      expect(en.text('tab_home'), equals('Home'));
      expect(mr.text('tab_home'), equals('मुख्यपृष्ठ'));
      expect(hi.text('tab_home'), equals('मुख्य पृष्ठ'));

      expect(en.text('btn_create_test'), equals('Generate Test'));
      expect(mr.text('btn_create_test'), equals('सराव सुरू करा'));
      expect(hi.text('btn_create_test'), equals('अभ्यास शुरू करें'));

      expect(en.text('btn_start_mock'), equals('Start Mock Exam'));
      expect(mr.text('btn_start_mock'), equals('मॉक परीक्षा सुरू करा'));
      expect(hi.text('btn_start_mock'), equals('मॉक टेस्ट शुरू करें'));

      expect(en.text('question_progress', {'current': '1', 'total': '25'}),
          equals('Question 1 of 25'));
      expect(mr.text('question_progress', {'current': '1', 'total': '25'}),
          equals('प्रश्न 1 / 25'));
    });
  });
}
