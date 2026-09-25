import 'package:flutter/widgets.dart';

/// Lightweight, robust application localization supporting English, Marathi, and Hindi.
class AppLocalizations {
  AppLocalizations(this.locale);

  final Locale locale;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations) ??
        AppLocalizations(const Locale('en'));
  }

  static const List<Locale> supportedLocales = [
    Locale('en'),
    Locale('mr'),
    Locale('hi'),
  ];

  static final Map<String, Map<String, String>> _localizedValues = {
    'en': {
      // Navigation
      'tab_home': 'Home',
      'tab_tests': 'Tests',
      'tab_notes': 'Notes',
      'tab_results': 'Results',
      'tab_notices': 'Notices',
      'tab_settings': 'Settings',

      // Dashboard
      'greeting_student': 'Hello, Student',
      'institute_name': 'New Unique Computers',
      'course_name': 'MS-CIT Authorized Training',
      'status_enrolled': 'Enrolled',
      'tests_completed': 'Tests Completed',
      'pass_rate': 'Passing Rate',
      'assessments_title': 'Assessments & Practice',
      'mock_exam_title': 'Official MS-CIT Mock Exam',
      'mock_exam_subtitle': '25 Questions • 30 Minutes • 50% Passing Criteria',
      'mock_exam_desc': 'Standard assessment matching the final MS-CIT blueprint: Computer Basics, Word, Excel, PowerPoint, and Internet.',
      'btn_start_mock': 'Start Mock Exam',
      'practice_title': 'Practice by Subject',
      'practice_subtitle': 'Customize topics & question counts',
      'btn_configure': 'Generate Test',
      'btn_create_test': 'Generate Test',
      'test_setup_title': 'Generate Practice Test',
      'select_topics': 'Select Subject Topics',
      'question_count': 'Number of Questions',
      'btn_start_test': 'Start Test',
      'btn_cancel': 'Cancel',
      'notes_title': 'Study Materials & Guides',
      'notes_subtitle': 'Keyboard shortcuts, Excel formulas & notes',
      'study_guides_title': 'Study Guides & Notes',
      'all_topics': 'All Topics',
      'key_takeaways': 'Key Takeaways',
      'min_read': '{min} min read',
      'min_short': '{min} min',
      'no_materials': 'No study materials available.',
      'btn_browse': 'Browse',
      'btn_download_file': 'Download Document',
      'btn_read_doc': 'Read in App',
      'downloading': 'Downloading document...',
      'download_success': 'Document saved to: {path}',
      'download_failed': 'Failed to download document. Please try again.',
      'loading_doc': 'Loading document content...',
      'extract_failed': 'Could not read document contents.',
      'sync_title': 'Automatic Results Cloud Sync',
      'btn_sync_now': 'Sync Now',

      // Test Engine
      'btn_exit_test': 'Exit Test',
      'btn_next': 'Next',
      'btn_back': 'Back',
      'btn_submit': 'Submit Test',
      'question_progress': 'Question {current} of {total}',
      'mark_for_review': 'Mark for review',
      'questions_overview': 'Questions Overview',
      'legend_answered': 'Answered',
      'legend_left': 'Unanswered',
      'legend_flagged': 'Flagged',
      'dialog_submit_title': 'Submit Test?',
      'dialog_submit_desc': 'Are you sure you want to finish and submit your test?',
      'dialog_quit_title': 'Quit Test?',
      'dialog_quit_desc': 'Interrupted tests are abandoned and will not be recorded. Do you want to quit?',
      'btn_stay': 'Stay',
      'btn_quit': 'Quit Test',
      'btn_confirm_submit': 'Confirm Submit',
      'btn_keep_testing': 'Keep Testing',

      // Results & Score
      'score_report_title': 'Score Report',
      'score_passed': 'PASSED (>= 50%)',
      'score_needs_practice': 'NEEDS PRACTICE (< 50%)',
      'metric_correct': 'Correct',
      'metric_wrong': 'Wrong',
      'metric_duration': 'Duration',
      'review_all_questions': 'All Questions',
      'review_wrong_only': 'Show Wrong Only',
      'review_show_all': 'Show All',
      'btn_done': 'Done',
      'history_title': 'Test History',
      'history_summary': 'Performance Summary',
      'history_total_tests': 'Total Tests',
      'history_avg_score': 'Average Score',
      'history_pass_rate': 'Passing %',
      'no_records': 'No test records yet',
      'no_records_desc': 'Complete an exam or practice session to view history here.',

      // Settings
      'settings_title': 'Settings & Profile',
      'account_title': 'Student Account',
      'appearance_title': 'Appearance',
      'theme_light': 'Light Theme',
      'theme_dark': 'Dark Theme',
      'language_title': 'Language / भाषा',
      'notices_title': 'Institute Notices & Announcements',
      'about_title': 'Application Info',
      'btn_sign_out': 'Sign Out Account',

      // Help & Answer Hints
      'help_button': 'Help',
      'help_answer_prefix': 'Correct Answer',
      'help_tooltip': 'Show correct answer & explanation',
      'btn_hide_help': 'Hide Help',

      // Question Bank & Bookmarks
      'tab_all_questions': 'All Questions',
      'tab_bookmarks': 'Bookmarks',
      'all_questions_title': 'Question Bank',
      'bookmarks_title': 'Saved Bookmarks',
      'no_bookmarks_title': 'No Bookmarked Questions',
      'no_bookmarks_desc': 'Save important questions while practicing to review them here anytime.',
      'search_questions_hint': 'Search questions or keywords...',
      'btn_practice_bookmarks': 'Practice Bookmarked',
      'btn_show_answer': 'Show Answer',
      'btn_hide_answer': 'Hide Answer',
      'drawer_profile_title': 'Student Profile',
      'drawer_quick_links': 'Quick Navigation',
      'my_batch_title': 'My Batch',
      'batch_id_label': 'Batch ID',
      'batch_name_label': 'Batch Name',
      'bookmark_added': 'Question bookmarked',
      'bookmark_removed': 'Bookmark removed',
      'streak_badge': '{count} Streak!',
      'streak_in_a_row': '🔥 {count} in a Row! +10 XP',
      'xp_correct': '+10 XP ✨ Correct!',
    },
    'mr': {
      // Navigation
      'tab_home': 'मुख्यपृष्ठ',
      'tab_tests': 'परीक्षा',
      'tab_notes': 'अभ्यास',
      'tab_results': 'निकाल',
      'tab_notices': 'सूचना',
      'tab_settings': 'सेटिंग्ज',

      // Dashboard
      'greeting_student': 'नमस्कार, विद्यार्थी',
      'institute_name': 'न्यू युनिक कॉम्प्युटर्स',
      'course_name': 'MS-CIT अधिकृत प्रशिक्षण',
      'status_enrolled': 'प्रवेशित',
      'tests_completed': 'पूर्ण केलेल्या परीक्षा',
      'pass_rate': 'उत्तीर्ण टक्केवारी',
      'assessments_title': 'परीक्षा आणि सराव',
      'mock_exam_title': 'अधिकृत MS-CIT मॉक परीक्षा',
      'mock_exam_subtitle': '२५ प्रश्न • ३० मिनिटे • ५०% उत्तीर्ण निकष',
      'mock_exam_desc': 'अंतिम MS-CIT परीक्षेच्या आराखड्यानुसार: कॉम्प्युटर बेसिक्स, वर्ड, एक्सेल, पॉवरपॉईंट आणि इंटरनेट.',
      'btn_start_mock': 'मॉक परीक्षा सुरू करा',
      'practice_title': 'विषयानुसार सराव',
      'practice_subtitle': 'विषय आणि प्रश्नांची संख्या निवडा',
      'btn_configure': 'सराव सुरू करा',
      'btn_create_test': 'सराव सुरू करा',
      'test_setup_title': 'सराव परीक्षा तयार करा',
      'select_topics': 'विषय निवडा',
      'question_count': 'प्रश्नांची संख्या',
      'btn_start_test': 'सराव सुरू करा',
      'btn_cancel': 'रद्द करा',
      'notes_title': 'अभ्यास साहित्य आणि नोट्स',
      'notes_subtitle': 'शॉर्टकट की, एक्सेल फॉर्म्युले आणि मार्गदर्शक',
      'study_guides_title': 'अभ्यास साहित्य आणि नोट्स',
      'all_topics': 'सर्व विषय',
      'key_takeaways': 'महत्त्वाचे मुद्दे',
      'min_read': '{min} मिनिटे वाचन',
      'min_short': '{min} मि.',
      'no_materials': 'कोणतेही अभ्यास साहित्य उपलब्ध नाही.',
      'btn_browse': 'पहा',
      'btn_download_file': 'दस्तऐवज डाउनलोड करा',
      'btn_read_doc': 'ॲपमध्ये वाचा',
      'downloading': 'दस्तऐवज डाउनलोड होत आहे...',
      'download_success': 'दस्तऐवज जतन केले: {path}',
      'download_failed': 'दस्तऐवज डाउनलोड करण्यात त्रुटी आली. पुन्हा प्रयत्न करा.',
      'loading_doc': 'दस्तऐवज लोड होत आहे...',
      'extract_failed': 'दस्तऐवज वाचता आले नाही.',
      'sync_title': 'स्वयंचलित क्लाउड सिंक',
      'btn_sync_now': 'आता सिंक करा',

      // Test Engine
      'btn_exit_test': 'बाहेर पडा',
      'btn_next': 'पुढील',
      'btn_back': 'मागील',
      'btn_submit': 'परीक्षा सबमिट करा',
      'question_progress': 'प्रश्न {current} / {total}',
      'mark_for_review': 'पुनरावलोकनासाठी चिन्हांकित करा',
      'questions_overview': 'सर्व प्रश्नांचा आढावा',
      'legend_answered': 'सोडवलेले',
      'legend_left': 'शिल्लक',
      'legend_flagged': 'चिन्हांकित',
      'dialog_submit_title': 'परीक्षा सबमिट करायची?',
      'dialog_submit_desc': 'आपण खात्रीने परीक्षा पूर्ण करून निकाल नोंदवू इच्छिता?',
      'dialog_quit_title': 'परीक्षेतून बाहेर पडायचे?',
      'dialog_quit_desc': 'अपूर्ण सोडलेली परीक्षा नोंदवली जाणार नाही. बाहेर पडायचे?',
      'btn_stay': 'चालू ठेवा',
      'btn_quit': 'बाहेर पडा',
      'btn_confirm_submit': 'सबमिट करा',
      'btn_keep_testing': 'सराव सुरू ठेवा',

      // Results & Score
      'score_report_title': 'निकाल अहवाल',
      'score_passed': 'उत्तीर्ण (>= ५०%)',
      'score_needs_practice': 'अधिक सरावाची गरज (< ५०%)',
      'metric_correct': 'बरोबर',
      'metric_wrong': 'चूक',
      'metric_duration': 'वेळ',
      'review_all_questions': 'सर्व प्रश्न',
      'review_wrong_only': 'फक्त चुकीचे प्रश्न पहा',
      'review_show_all': 'सर्व दाखवा',
      'btn_done': 'पूर्ण झाले',
      'history_title': 'परीक्षा इतिहास',
      'history_summary': 'कामगिरी सारांश',
      'history_total_tests': 'एकूण परीक्षा',
      'history_avg_score': 'सरासरी गुण',
      'history_pass_rate': 'उत्तीर्ण %',
      'no_records': 'कोणतीही नोंद नाही',
      'no_records_desc': 'इथे निकाल पाहण्यासाठी मॉक परीक्षा किंवा सराव पूर्ण करा.',

      // Settings
      'settings_title': 'सेटिंग्ज आणि प्रोफाइल',
      'account_title': 'विद्यार्थी खाते',
      'appearance_title': 'दिसणे (Appearance)',
      'theme_light': 'लाइट थीम (दिवस)',
      'theme_dark': 'डार्क थीम (रात्र)',
      'language_title': 'भाषा बदला (Language)',
      'notices_title': 'संस्थेच्या महत्त्वाच्या सूचना',
      'about_title': 'अ‍ॅप माहिती',
      'btn_sign_out': 'खात्यातून बाहेर पडा (Sign Out)',

      // Help & Answer Hints
      'help_button': 'मदत (Help)',
      'help_answer_prefix': 'बरोबर उत्तर',
      'help_tooltip': 'बरोबर उत्तर आणि स्पष्टीकरण पहा',
      'btn_hide_help': 'मदत लपवा',

      // Question Bank & Bookmarks
      'tab_all_questions': 'सर्व प्रश्न',
      'tab_bookmarks': 'बुकमार्क',
      'all_questions_title': 'प्रश्नसंच अभ्यास',
      'bookmarks_title': 'जतन केलेले प्रश्न',
      'no_bookmarks_title': 'कोणताही बुकमार्क प्रश्न नाही',
      'no_bookmarks_desc': 'महत्त्वाचे प्रश्न नंतर पाहण्यासाठी सरावादरम्यान बुकमार्क करा.',
      'search_questions_hint': 'प्रश्न किंवा शब्द शोधा...',
      'btn_practice_bookmarks': 'बुकमार्कचा सराव करा',
      'btn_show_answer': 'उत्तर पहा',
      'btn_hide_answer': 'उत्तर लपवा',
      'drawer_profile_title': 'विद्यार्थी प्रोफाइल',
      'drawer_quick_links': 'जलद पर्याय',
      'my_batch_title': 'माझी बॅच',
      'batch_id_label': 'बॅच आयडी',
      'batch_name_label': 'बॅचचे नाव',
      'bookmark_added': 'प्रश्न बुकमार्क केला',
      'bookmark_removed': 'प्रश्न बुकमार्क मधून काढला',
      'streak_badge': '{count} सलग!',
      'streak_in_a_row': '🔥 सलग {count} बरोबर! +१० XP',
      'xp_correct': '+१० XP ✨ बरोबर!',
    },
    'hi': {
      // Navigation
      'tab_home': 'मुख्य पृष्ठ',
      'tab_tests': 'परीक्षा',
      'tab_notes': 'अभ्यास',
      'tab_results': 'परिणाम',
      'tab_notices': 'सूचनाएँ',
      'tab_settings': 'सेटिंग्स',

      // Dashboard
      'greeting_student': 'नमस्ते, विद्यार्थी',
      'institute_name': 'न्यू यूनिक कंप्यूटर्स',
      'course_name': 'MS-CIT अधिकृत प्रशिक्षण',
      'status_enrolled': 'नामांकित',
      'tests_completed': 'पूर्ण किए गए टेस्ट',
      'pass_rate': 'उत्तीर्ण दर',
      'assessments_title': 'परीक्षा और अभ्यास',
      'mock_exam_title': 'आधिकारिक MS-CIT मॉक टेस्ट',
      'mock_exam_subtitle': '25 प्रश्न • 30 मिनट • 50% उत्तीर्ण मानदंड',
      'mock_exam_desc': 'अंतिम MS-CIT परीक्षा के अनुसार: कंप्यूटर बेसिक्स, वर्ड, एक्सेल, पावरपॉइंट और इंटरनेट।',
      'btn_start_mock': 'मॉक टेस्ट शुरू करें',
      'practice_title': 'विषय अनुसार अभ्यास',
      'practice_subtitle': 'विषय और प्रश्नों की संख्या चुनें',
      'btn_configure': 'अभ्यास शुरू करें',
      'btn_create_test': 'अभ्यास शुरू करें',
      'test_setup_title': 'अभ्यास टेस्ट बनाएं',
      'select_topics': 'विषय चुनें',
      'question_count': 'प्रश्नों की संख्या',
      'btn_start_test': 'टेस्ट शुरू करें',
      'btn_cancel': 'रद्द करें',
      'notes_title': 'अध्ययन सामग्री और नोट्स',
      'notes_subtitle': 'शॉर्टकट की, एक्सेल फ़ॉर्मूले और मार्गदर्शिका',
      'study_guides_title': 'अध्ययन सामग्री और नोट्स',
      'all_topics': 'सभी विषय',
      'key_takeaways': 'मुख्य बिंदु',
      'min_read': '{min} मिनट पठन',
      'min_short': '{min} मि.',
      'no_materials': 'कोई अध्ययन सामग्री उपलब्ध नहीं है।',
      'btn_browse': 'देखें',
      'btn_download_file': 'दस्तावेज़ डाउनलोड करें',
      'btn_read_doc': 'ऐप में पढ़ें',
      'downloading': 'दस्तावेज़ डाउनलोड हो रहा है...',
      'download_success': 'दस्तावेज़ सहेजा गया: {path}',
      'download_failed': 'दस्तावेज़ डाउनलोड करने में विफल। पुनः प्रयास करें।',
      'loading_doc': 'दस्तावेज़ लोड हो रहा है...',
      'extract_failed': 'दस्तावेज़ सामग्री पढ़ने में असमर्थ।',
      'sync_title': 'स्वचालित क्लाउड सिंक',
      'btn_sync_now': 'अभी सिंक करें',

      // Test Engine
      'btn_exit_test': 'बाहर निकलें',
      'btn_next': 'अगला',
      'btn_back': 'पिछला',
      'btn_submit': 'टेस्ट सबमिट करें',
      'question_progress': 'प्रश्न {current} / {total}',
      'mark_for_review': 'समीक्षा के लिए चिह्नित करें',
      'questions_overview': 'सभी प्रश्नों का अवलोकन',
      'legend_answered': 'उत्तर दिया',
      'legend_left': 'शेष',
      'legend_flagged': 'चिह्नित',
      'dialog_submit_title': 'टेस्ट सबमिट करें?',
      'dialog_submit_desc': 'क्या आप वाकई टेस्ट पूरा करके परिणाम दर्ज करना चाहते हैं?',
      'dialog_quit_title': 'टेस्ट से बाहर निकलें?',
      'dialog_quit_desc': 'अधूरा छोड़ा गया टेस्ट रिकॉर्ड नहीं किया जाएगा। क्या आप बाहर निकलना चाहते हैं?',
      'btn_stay': 'जारी रखें',
      'btn_quit': 'बाहर निकलें',
      'btn_confirm_submit': 'सबमिट करें',
      'btn_keep_testing': 'अभ्यास जारी रखें',

      // Results & Score
      'score_report_title': 'स्कोर रिपोर्ट',
      'score_passed': 'उत्तीर्ण (>= 50%)',
      'score_needs_practice': 'अधिक अभ्यास की आवश्यकता (< 50%)',
      'metric_correct': 'सही',
      'metric_wrong': 'गलत',
      'metric_duration': 'समय',
      'review_all_questions': 'सभी प्रश्न',
      'review_wrong_only': 'केवल गलत प्रश्न देखें',
      'review_show_all': 'सभी दिखाएं',
      'btn_done': 'हो गया',
      'history_title': 'टेस्ट इतिहास',
      'history_summary': 'प्रदर्शन सारांश',
      'history_total_tests': 'कुल टेस्ट',
      'history_avg_score': 'औसत स्कोर',
      'history_pass_rate': 'उत्तीर्ण %',
      'no_records': 'कोई रिकॉर्ड नहीं',
      'no_records_desc': 'परिणाम देखने के लिए मॉक टेस्ट या अभ्यास पूरा करें।',

      // Settings
      'settings_title': 'सेटिंग्स और प्रोफ़ाइल',
      'account_title': 'विद्यार्थी खाता',
      'appearance_title': 'दिखावट (Appearance)',
      'theme_light': 'लाइट थीम (दिन)',
      'theme_dark': 'डार्क थीम (रात)',
      'language_title': 'भाषा बदलें (Language)',
      'notices_title': 'संस्थान की महत्वपूर्ण सूचनाएं',
      'about_title': 'ऐप जानकारी',
      'btn_sign_out': 'साइन आउट (Sign Out)',

      // Help & Answer Hints
      'help_button': 'मदद (Help)',
      'help_answer_prefix': 'सही उत्तर',
      'help_tooltip': 'सही उत्तर और व्याख्या देखें',
      'btn_hide_help': 'मदद छिपाएं',

      // Question Bank & Bookmarks
      'tab_all_questions': 'सभी प्रश्न',
      'tab_bookmarks': 'बुकमार्क',
      'all_questions_title': 'प्रश्न बैंक',
      'bookmarks_title': 'सहेजे गए प्रश्न',
      'no_bookmarks_title': 'कोई बुकमार्क प्रश्न नहीं',
      'no_bookmarks_desc': 'महत्वपूर्ण प्रश्नों को बाद में देखने के लिए अभ्यास के दौरान बुकमार्क करें।',
      'search_questions_hint': 'प्रश्न या शब्द खोजें...',
      'btn_practice_bookmarks': 'बुकमार्क का अभ्यास करें',
      'btn_show_answer': 'उत्तर देखें',
      'btn_hide_answer': 'उत्तर छिपाएं',
      'drawer_profile_title': 'विद्यार्थी प्रोफ़ाइल',
      'drawer_quick_links': 'त्वरित विकल्प',
      'my_batch_title': 'मेरा बैच',
      'batch_id_label': 'बैच आईडी',
      'batch_name_label': 'बैच का नाम',
      'bookmark_added': 'प्रश्न बुकमार्क किया गया',
      'bookmark_removed': 'प्रश्न बुकमार्क से हटाया गया',
      'streak_badge': '{count} लगातार!',
      'streak_in_a_row': '🔥 लगातार {count} सही! +10 XP',
      'xp_correct': '+10 XP ✨ सही!',
    },
  };

  String text(String key, [Map<String, String>? params]) {
    final lang = locale.languageCode;
    String value = _localizedValues[lang]?[key] ??
        _localizedValues['en']?[key] ??
        key;

    if (params != null) {
      params.forEach((paramKey, paramVal) {
        value = value.replaceAll('{$paramKey}', paramVal);
      });
    }
    return value;
  }
}

class AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => ['en', 'mr', 'hi'].contains(locale.languageCode);

  @override
  Future<AppLocalizations> load(Locale locale) {
    return Future.value(AppLocalizations(locale));
  }

  @override
  bool shouldReload(AppLocalizationsDelegate old) => false;
}
