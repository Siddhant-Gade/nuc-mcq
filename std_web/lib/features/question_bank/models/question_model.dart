/// Represents a Question Subject / Topic category according to MS-CIT syllabus.
enum QuestionTopic {
  computerFundamentals('Computer Fundamentals', 'Hardware, Memory, CPU & Architecture', 'कॉम्प्युटर फंडामेंटल्स', 'कंप्यूटर फंडामेंटल्स'),
  os('OS', 'Windows, File System, OS Settings', 'ऑपरेटिंग सिस्टीम (OS)', 'ऑपरेटिंग सिस्टम (OS)'),
  excel('MS Excel', 'Formulas, Spreadsheets, Functions & Charts', 'एमएस एक्सेल', 'एमएस एक्सेल'),
  word('MS Word', 'Documents, Formatting, Layout & Tables', 'एमएस वर्ड', 'एमएस वर्ड'),
  powerpoint('PowerPoint', 'Slides, Design, Animations & Transitions', 'पॉवरपॉईंट', 'पावरपॉइंट'),
  outlook('MS Outlook', 'Emails, Calendars, Contacts & Scheduling', 'एमएस आउटलुक', 'एमएस आउटलुक'),
  internet('Internet', 'Browsing, Web Safety, Cloud & Search', 'इंटरनेट', 'इंटरनेट'),
  pagemaker('PageMaker', 'Desktop Publishing, Layouts & Typography', 'पेजमेकर', 'पेजमेकर');

  const QuestionTopic(this.label, this.description, this.labelMr, this.labelHi);
  final String label;
  final String description;
  final String labelMr;
  final String labelHi;

  String localizedLabel(String lang) {
    if (lang == 'mr') return labelMr;
    if (lang == 'hi') return labelHi;
    return label;
  }

  String get assetImagePath {
    switch (this) {
      case QuestionTopic.computerFundamentals:
        return 'assets/subjects/computer_fundamentals.png';
      case QuestionTopic.os:
        return 'assets/subjects/os.png';
      case QuestionTopic.word:
        return 'assets/subjects/word.png';
      case QuestionTopic.excel:
        return 'assets/subjects/excel.png';
      case QuestionTopic.powerpoint:
        return 'assets/subjects/powerpoint.png';
      case QuestionTopic.outlook:
        return 'assets/subjects/outlook.png';
      case QuestionTopic.internet:
        return 'assets/subjects/internet.png';
      case QuestionTopic.pagemaker:
        return 'assets/subjects/pagemaker.png';
    }
  }
}

/// Represents an offline-capable MCQ question bundled with the student app.
class QuestionModel {
  const QuestionModel({
    required this.id,
    required this.topic,
    required this.questionText,
    required this.options,
    required this.correctOptionIndex,
    required this.explanation,
    this.questionTextMr,
    this.optionsMr,
    this.explanationMr,
    this.questionTextHi,
    this.optionsHi,
    this.explanationHi,
  });

  final String id;
  final QuestionTopic topic;
  final String questionText;
  final List<String> options;
  final int correctOptionIndex;
  final String explanation;

  final String? questionTextMr;
  final List<String>? optionsMr;
  final String? explanationMr;
  final String? questionTextHi;
  final List<String>? optionsHi;
  final String? explanationHi;

  String get correctOptionLetter => String.fromCharCode(65 + correctOptionIndex);

  String localizedQuestionText(String lang) {
    if (lang == 'mr' && questionTextMr != null && questionTextMr!.trim().isNotEmpty) {
      return questionTextMr!.trim();
    }
    if (lang == 'hi' && questionTextHi != null && questionTextHi!.trim().isNotEmpty) {
      return questionTextHi!.trim();
    }
    return questionText;
  }

  List<String> localizedOptions(String lang) {
    final localized = lang == 'mr' ? optionsMr : (lang == 'hi' ? optionsHi : null);
    if (localized != null && localized.length == options.length && localized.any((o) => o.trim().isNotEmpty)) {
      return List<String>.generate(options.length, (i) {
        final opt = localized[i].trim();
        return opt.isNotEmpty ? opt : options[i];
      });
    }
    return options;
  }

  String localizedExplanation(String lang) {
    if (lang == 'mr' && explanationMr != null && explanationMr!.trim().isNotEmpty) {
      return explanationMr!.trim();
    }
    if (lang == 'hi' && explanationHi != null && explanationHi!.trim().isNotEmpty) {
      return explanationHi!.trim();
    }
    return explanation;
  }

  factory QuestionModel.fromMap(Map<String, dynamic> map) {
    return QuestionModel(
      id: map['id'] as String,
      topic: QuestionTopic.values.firstWhere(
        (t) => t.name == map['topic'],
        orElse: () => QuestionTopic.computerFundamentals,
      ),
      questionText: map['questionText'] as String,
      options: List<String>.from(map['options'] as List),
      correctOptionIndex: map['correctOptionIndex'] as int,
      explanation: map['explanation'] as String,
      questionTextMr: map['questionTextMr'] as String?,
      optionsMr: (map['optionsMr'] as List?)?.cast<String>(),
      explanationMr: map['explanationMr'] as String?,
      questionTextHi: map['questionTextHi'] as String?,
      optionsHi: (map['optionsHi'] as List?)?.cast<String>(),
      explanationHi: map['explanationHi'] as String?,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'topic': topic.name,
      'questionText': questionText,
      'options': options,
      'correctOptionIndex': correctOptionIndex,
      'explanation': explanation,
      if (questionTextMr != null) 'questionTextMr': questionTextMr,
      if (optionsMr != null) 'optionsMr': optionsMr,
      if (explanationMr != null) 'explanationMr': explanationMr,
      if (questionTextHi != null) 'questionTextHi': questionTextHi,
      if (optionsHi != null) 'optionsHi': optionsHi,
      if (explanationHi != null) 'explanationHi': explanationHi,
    };
  }
}
