import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/widgets/scale_press.dart';
import '../../question_bank/repository/question_bank_repository.dart';
import '../models/test_result_model.dart';

/// Shows a distinctive, official-styled Score Card modal bottom sheet.
Future<void> showScorecardSheet({
  required BuildContext context,
  required TestResultModel result,
  required QuestionBankRepository questionBank,
  required String langCode,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => ScorecardDialog(
      result: result,
      questionBank: questionBank,
      langCode: langCode,
    ),
  );
}

/// Distinctive MS-CIT Assessment Score Card with instant WhatsApp & Clipboard share and Printable Certificate.
class ScorecardDialog extends StatefulWidget {
  const ScorecardDialog({
    super.key,
    required this.result,
    required this.questionBank,
    required this.langCode,
  });

  final TestResultModel result;
  final QuestionBankRepository questionBank;
  final String langCode;

  @override
  State<ScorecardDialog> createState() => _ScorecardDialogState();
}

class _ScorecardDialogState extends State<ScorecardDialog> {
  bool _copied = false;
  bool _isPrinting = false;

  String _formatDuration(int seconds) {
    final m = seconds ~/ 60;
    final s = seconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  String _formatDate(DateTime dt) {
    final local = dt.toLocal();
    final months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    final day = local.day.toString().padLeft(2, '0');
    final month = months[local.month - 1];
    final year = local.year;
    final hour = local.hour > 12 ? local.hour - 12 : (local.hour == 0 ? 12 : local.hour);
    final minute = local.minute.toString().padLeft(2, '0');
    final amPm = local.hour >= 12 ? 'PM' : 'AM';
    return '$day $month $year • $hour:$minute $amPm';
  }

  String _buildShareText(String subjectTitle, String percentage, String statusText) {
    return '''
🎓 New Unique Computers - MS-CIT Test Scorecard
━━━━━━━━━━━━━━━━━━━━━━━━
📚 Subject: $subjectTitle
📝 Mode: ${widget.result.testMode.label}
🎯 Score: ${widget.result.score} / ${widget.result.totalQuestions} ($percentage%)
⏱️ Time: ${_formatDuration(widget.result.timeTakenSeconds)}
✅ Correct: ${widget.result.correctCount}  |  ❌ Incorrect: ${widget.result.wrongCount}
📊 Result: $statusText
━━━━━━━━━━━━━━━━━━━━━━━━
Practice anytime on the New Unique Computers Student Portal!
''';
  }

  Future<void> _copyToClipboard(String text) async {
    await HapticFeedback.lightImpact();
    await Clipboard.setData(ClipboardData(text: text));
    if (mounted) {
      setState(() => _copied = true);
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) setState(() => _copied = false);
      });
    }
  }

  Future<void> _shareOnWhatsApp(String text) async {
    await HapticFeedback.mediumImpact();
    final encoded = Uri.encodeComponent(text);
    final whatsappUri = Uri.parse('whatsapp://send?text=$encoded');
    final fallbackUri = Uri.parse('https://api.whatsapp.com/send?text=$encoded');

    try {
      if (await canLaunchUrl(whatsappUri)) {
        await launchUrl(whatsappUri, mode: LaunchMode.externalApplication);
        return;
      }
      if (await canLaunchUrl(fallbackUri)) {
        await launchUrl(fallbackUri, mode: LaunchMode.externalApplication);
        return;
      }
    } catch (_) {}

    // Fallback if WhatsApp is not installed
    await _copyToClipboard(text);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('WhatsApp not detected. Scorecard text copied to clipboard!'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Future<void> _printCertificate(BuildContext context) async {
    if (_isPrinting) return;
    setState(() => _isPrinting = true);
    await HapticFeedback.selectionClick();

    try {
      final result = widget.result;
      final total = result.totalQuestions;
      final percentage = (total > 0 ? (result.score / total) * 100 : 0.0).toStringAsFixed(1);
      final isPassed = result.isPassed;
      final statusGrade = isPassed
          ? (double.parse(percentage) >= 75 ? 'DISTINCTION' : 'FIRST CLASS PASS')
          : 'NEEDS PRACTICE';
      final statusColor = isPassed ? '#059669' : '#DC2626';
      final dateStr = _formatDate(result.completedAt);
      final subjectTitle = result.getDisplaySubject(
        langCode: widget.langCode,
        questionBank: widget.questionBank,
      );

      final html = '''
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MS-CIT Certificate - ${result.score} out of $total</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
    }
    body {
      background-color: #f1f5f9;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .print-actions {
      margin-bottom: 20px;
      display: flex;
      gap: 12px;
    }
    .btn {
      background: #1e3a8a;
      color: white;
      border: none;
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(30, 58, 138, 0.25);
    }
    .btn:hover { background: #1e40af; }
    .certificate-card {
      background: #ffffff;
      width: 100%;
      max-width: 960px;
      padding: 36px 48px;
      border: 8px double #1e3a8a;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      position: relative;
    }
    .corner-decor {
      position: absolute;
      width: 28px;
      height: 28px;
      border: 3px solid #d97706;
    }
    .top-left { top: 12px; left: 12px; border-right: none; border-bottom: none; }
    .top-right { top: 12px; right: 12px; border-left: none; border-bottom: none; }
    .bottom-left { bottom: 12px; left: 12px; border-right: none; border-top: none; }
    .bottom-right { bottom: 12px; right: 12px; border-left: none; border-top: none; }
    
    .header {
      text-align: center;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 18px;
      margin-bottom: 24px;
    }
    .inst-name {
      font-size: 26px;
      font-weight: 900;
      letter-spacing: 1.5px;
      color: #1e3a8a;
      text-transform: uppercase;
    }
    .inst-sub {
      font-size: 13px;
      color: #475569;
      margin-top: 4px;
      font-weight: 500;
    }
    .cert-title {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 1px;
      color: #b45309;
      margin: 18px 0 10px 0;
      text-transform: uppercase;
      text-align: center;
    }
    .recipient-text {
      text-align: center;
      font-size: 14px;
      color: #64748b;
      margin-bottom: 8px;
    }
    .subject-title {
      text-align: center;
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 22px;
    }
    .score-banner {
      display: flex;
      justify-content: space-around;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 28px;
    }
    .score-block {
      text-align: center;
    }
    .score-val {
      font-size: 28px;
      font-weight: 900;
      color: #1e3a8a;
    }
    .score-lbl {
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 800;
      background: ${isPassed ? '#ecfdf5' : '#fef2f2'};
      color: $statusColor;
      border: 1.5px solid ${isPassed ? '#a7f3d0' : '#fecaca'};
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      font-size: 13px;
    }
    .meta-table td {
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
    }
    .meta-table td.label {
      background: #f8fafc;
      font-weight: 600;
      color: #475569;
      width: 25%;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px dashed #cbd5e1;
    }
    .stamp-box {
      border: 2px dashed #94a3b8;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
      text-align: center;
    }
    .sig-line {
      width: 180px;
      border-top: 1.5px solid #0f172a;
      text-align: center;
      padding-top: 4px;
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
    }

    @media print {
      body { background: white; padding: 0; }
      .print-actions { display: none !important; }
      .certificate-card {
        border-width: 6px;
        box-shadow: none;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>
  <div class="certificate-card">
    <div class="corner-decor top-left"></div>
    <div class="corner-decor top-right"></div>
    <div class="corner-decor bottom-left"></div>
    <div class="corner-decor bottom-right"></div>

    <div class="header">
      <div class="inst-name">New Unique Computers</div>
      <div class="inst-sub">MS-CIT Authorized Learning Center • Maharashtra Knowledge Corporation Limited (MKCL)</div>
    </div>

    <div class="cert-title">Certificate of Assessment & Performance Report</div>
    <div class="recipient-text">This official assessment report card certifies student performance in:</div>
    <div class="subject-title">$subjectTitle</div>

    <div class="score-banner">
      <div class="score-block">
        <div class="score-val">${result.score} / $total</div>
        <div class="score-lbl">Total Score</div>
      </div>
      <div class="score-block">
        <div class="score-val">$percentage%</div>
        <div class="score-lbl">Percentage</div>
      </div>
      <div class="score-block">
        <div class="score-val">${_formatDuration(result.timeTakenSeconds)}</div>
        <div class="score-lbl">Time Taken</div>
      </div>
      <div class="score-block">
        <div class="status-badge">$statusGrade</div>
        <div class="score-lbl">Assessment Status</div>
      </div>
    </div>

    <table class="meta-table">
      <tr>
        <td class="label">Test Mode</td>
        <td>${widget.result.testMode.label}</td>
        <td class="label">Assessment Date</td>
        <td>$dateStr</td>
      </tr>
      <tr>
        <td class="label">Correct Answers</td>
        <td><strong style="color: #059669;">${result.correctCount}</strong> questions</td>
        <td class="label">Incorrect Answers</td>
        <td><strong style="color: #dc2626;">${result.wrongCount}</strong> questions</td>
      </tr>
      <tr>
        <td class="label">Pass Requirement</td>
        <td>Minimum 40.0% Required</td>
        <td class="label">Result ID</td>
        <td style="font-family: monospace; font-size: 11px;">${result.clientEventId}</td>
      </tr>
    </table>

    <div class="footer">
      <div class="stamp-box">
        INSTITUTE VERIFIED<br>
        NEW UNIQUE COMPUTERS
      </div>
      <div class="sig-line">
        Center Coordinator / Head
      </div>
    </div>
  </div>
  <script>
    // Auto-trigger system print dialog on open
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.print();
      }, 500);
    });
  </script>
</body>
</html>
''';

      final tempDir = await getTemporaryDirectory();
      final file = File('${tempDir.path}/MSCIT_Scorecard_${result.clientEventId.substring(0, 8)}.html');
      await file.writeAsString(html);

      await OpenFilex.open(file.path);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Could not open print certificate: $e'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isPrinting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final result = widget.result;
    final total = result.totalQuestions;
    final percentage = (total > 0 ? (result.score / total) * 100 : 0.0).toStringAsFixed(1);
    final isPassed = result.isPassed;
    final statusText = isPassed ? 'PASSED 🏆' : 'NEEDS PRACTICE ✍️';
    final subjectTitle = result.getDisplaySubject(
      langCode: widget.langCode,
      questionBank: widget.questionBank,
    );
    final shareText = _buildShareText(subjectTitle, percentage, statusText);

    // Color definitions
    final cardBg = isDark ? const Color(0xFF131D2E) : Colors.white;
    final surfaceVariant = isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC);
    final borderColor = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);
    final textPrimary = isDark ? const Color(0xFFF1F5F9) : const Color(0xFF0F172A);
    final textSecondary = isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);
    final badgeBg = isPassed
        ? (isDark ? const Color(0xFF064E3B) : const Color(0xFFECFDF5))
        : (isDark ? const Color(0xFF78350F) : const Color(0xFFFFFBEB));
    final badgeBorder = isPassed
        ? (isDark ? const Color(0xFF059669) : const Color(0xFFA7F3D0))
        : (isDark ? const Color(0xFFD97706) : const Color(0xFFFDE68A));
    final badgeText = isPassed
        ? (isDark ? const Color(0xFF34D399) : const Color(0xFF047857))
        : (isDark ? const Color(0xFFFBBF24) : const Color(0xFFB45309));

    return Container(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 8,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Drag handle
            Container(
              width: 36,
              height: 4,
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF475569) : const Color(0xFFCBD5E1),
                borderRadius: BorderRadius.circular(2),
              ),
            ),

            // Physical Scorecard Ticket / Sheet
            Container(
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: borderColor, width: 1.2),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(isDark ? 0.4 : 0.08),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Institute Header Band
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF0F172A) : const Color(0xFF1E3A8A),
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(
                            Icons.school_rounded,
                            size: 18,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'NEW UNIQUE COMPUTERS',
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.6,
                                  color: Colors.white,
                                ),
                              ),
                              Text(
                                'MS-CIT Online Assessment • Official Result',
                                style: GoogleFonts.inter(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w400,
                                  color: Colors.white.withOpacity(0.8),
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            result.testMode.code == 'EXAM' ? 'EXAM' : 'PRACTICE',
                            style: GoogleFonts.inter(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.5,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Scorecard Body
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        // Subject & Date
                        Text(
                          subjectTitle,
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.3,
                            color: textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _formatDate(result.completedAt),
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w400,
                            color: textSecondary,
                          ),
                        ),

                        const SizedBox(height: 16),

                        // Score Hero Display
                        Container(
                          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
                          decoration: BoxDecoration(
                            color: surfaceVariant,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: borderColor, width: 0.8),
                          ),
                          child: Column(
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                crossAxisAlignment: CrossAxisAlignment.baseline,
                                textBaseline: TextBaseline.alphabetic,
                                children: [
                                  Text(
                                    '${result.score}',
                                    style: GoogleFonts.inter(
                                      fontSize: 46,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: -1.5,
                                      height: 1.0,
                                      color: textPrimary,
                                    ),
                                  ),
                                  Text(
                                    ' / $total',
                                    style: GoogleFonts.inter(
                                      fontSize: 22,
                                      fontWeight: FontWeight.w600,
                                      color: textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    'Score: $percentage%',
                                    style: GoogleFonts.inter(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700,
                                      color: textPrimary,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: badgeBg,
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: badgeBorder),
                                    ),
                                    child: Text(
                                      statusText,
                                      style: GoogleFonts.inter(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: badgeText,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 14),

                        // Metrics Tri-Column
                        Row(
                          children: [
                            Expanded(
                              child: _MetricTile(
                                label: 'Correct',
                                value: '${result.correctCount}',
                                valueColor: const Color(0xFF059669),
                                icon: Icons.check_circle_outline_rounded,
                                surfaceColor: surfaceVariant,
                                borderColor: borderColor,
                                textColor: textPrimary,
                                subColor: textSecondary,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _MetricTile(
                                label: 'Incorrect',
                                value: '${result.wrongCount}',
                                valueColor: const Color(0xFFDC2626),
                                icon: Icons.highlight_off_rounded,
                                surfaceColor: surfaceVariant,
                                borderColor: borderColor,
                                textColor: textPrimary,
                                subColor: textSecondary,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _MetricTile(
                                label: 'Time Taken',
                                value: _formatDuration(result.timeTakenSeconds),
                                valueColor: isDark ? const Color(0xFF60A5FA) : const Color(0xFF2563EB),
                                icon: Icons.timer_outlined,
                                surfaceColor: surfaceVariant,
                                borderColor: borderColor,
                                textColor: textPrimary,
                                subColor: textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Actions Section
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: Column(
                      children: [
                        // Primary Actions Row: WhatsApp & Copy
                        Row(
                          children: [
                            // WhatsApp Share Action
                            Expanded(
                              flex: 3,
                              child: ScalePress(
                                onTap: () => _shareOnWhatsApp(shareText),
                                child: Container(
                                  height: 44,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF25D366),
                                    borderRadius: BorderRadius.circular(12),
                                    boxShadow: [
                                      BoxShadow(
                                        color: const Color(0xFF25D366).withOpacity(0.3),
                                        blurRadius: 8,
                                        offset: const Offset(0, 3),
                                      ),
                                    ],
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      const Icon(
                                        Icons.share_rounded,
                                        color: Colors.white,
                                        size: 18,
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        'Share WhatsApp',
                                        style: GoogleFonts.inter(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w700,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),

                            // Copy Text Action
                            Expanded(
                              flex: 2,
                              child: ScalePress(
                                onTap: () => _copyToClipboard(shareText),
                                child: Container(
                                  height: 44,
                                  decoration: BoxDecoration(
                                    color: _copied
                                        ? (isDark ? const Color(0xFF064E3B) : const Color(0xFFECFDF5))
                                        : surfaceVariant,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: _copied ? const Color(0xFF059669) : borderColor,
                                      width: 1.0,
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        _copied ? Icons.done_rounded : Icons.copy_rounded,
                                        size: 16,
                                        color: _copied ? const Color(0xFF059669) : textPrimary,
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        _copied ? 'Copied!' : 'Copy',
                                        style: GoogleFonts.inter(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                          color: _copied ? const Color(0xFF059669) : textPrimary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 10),

                        // Secondary Action: Print Certificate / Report Card
                        ScalePress(
                          onTap: () => _printCertificate(context),
                          child: Container(
                            height: 42,
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
                                width: 1.0,
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.print_rounded,
                                  size: 18,
                                  color: isDark ? const Color(0xFF93C5FD) : const Color(0xFF1E3A8A),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  _isPrinting ? 'Opening Print...' : 'Print Certificate / Report Card',
                                  style: GoogleFonts.inter(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: isDark ? const Color(0xFF93C5FD) : const Color(0xFF1E3A8A),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({
    required this.label,
    required this.value,
    required this.valueColor,
    required this.icon,
    required this.surfaceColor,
    required this.borderColor,
    required this.textColor,
    required this.subColor,
  });

  final String label;
  final String value;
  final Color valueColor;
  final IconData icon;
  final Color surfaceColor;
  final Color borderColor;
  final Color textColor;
  final Color subColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor, width: 0.8),
      ),
      child: Column(
        children: [
          Icon(icon, size: 16, color: valueColor),
          const SizedBox(height: 4),
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: textColor,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w500,
              color: subColor,
            ),
          ),
        ],
      ),
    );
  }
}
