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
      size: A4 portrait;
      margin: 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    body {
      background-color: #f8fafc;
      color: #0f172a;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      padding: 24px 16px;
    }
    .print-actions {
      margin-bottom: 20px;
      display: flex;
      gap: 12px;
    }
    .btn {
      background: #0f172a;
      color: #ffffff;
      border: 1px solid #0f172a;
      padding: 10px 22px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
      transition: background 0.15s ease;
    }
    .btn:hover { background: #1e293b; }
    
    .certificate-card {
      background: #ffffff;
      width: 100%;
      max-width: 820px;
      padding: 44px 48px;
      border: 1.5px solid #e2e8f0;
      border-radius: 14px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
    }
    
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 1px solid #f1f5f9;
      margin-bottom: 24px;
    }
    .inst-name {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0.8px;
      color: #0f172a;
      text-transform: uppercase;
    }
    .inst-sub {
      font-size: 12px;
      color: #64748b;
      margin-top: 5px;
      font-weight: 500;
    }
    
    .cert-title {
      font-size: 17px;
      font-weight: 700;
      letter-spacing: 0.6px;
      color: #0f172a;
      margin: 16px 0 6px 0;
      text-transform: uppercase;
      text-align: center;
    }
    .recipient-text {
      text-align: center;
      font-size: 13px;
      color: #64748b;
      margin-bottom: 6px;
    }
    .subject-title {
      text-align: center;
      font-size: 20px;
      font-weight: 800;
      color: #0284c7;
      margin-bottom: 24px;
    }
    
    .score-banner {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 26px;
    }
    .score-block {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 12px;
      text-align: center;
    }
    .score-val {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
    }
    .score-lbl {
      font-size: 10px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 4px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.3px;
      background: ${isPassed ? '#ecfdf5' : '#fef2f2'};
      color: $statusColor;
      border: 1px solid ${isPassed ? '#a7f3d0' : '#fecaca'};
    }
    
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 28px;
      font-size: 13px;
      table-layout: fixed;
    }
    .meta-table td {
      padding: 10px 14px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    .meta-table td.label {
      background: #f8fafc;
      font-weight: 600;
      color: #475569;
      width: 25%;
    }
    .meta-table td.value {
      color: #0f172a;
      width: 25%;
    }
    
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 24px;
      padding-top: 18px;
      border-top: 1px solid #f1f5f9;
    }
    .stamp-box {
      border: 1.5px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 14px;
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
      text-align: center;
      line-height: 1.4;
      background: #f8fafc;
    }
    .sig-line {
      width: 200px;
      border-top: 1.5px solid #0f172a;
      text-align: center;
      padding-top: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #0f172a;
    }

    @media print {
      body { background: #ffffff !important; padding: 0 !important; }
      .print-actions { display: none !important; }
      .certificate-card {
        border: 1px solid #cbd5e1 !important;
        box-shadow: none !important;
        padding: 24px !important;
        max-width: 100% !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <button class="btn" onclick="window.print()">Print / Save PDF</button>
  </div>
  <div class="certificate-card">
    <div class="header">
      <div class="inst-name">New Unique Computers</div>
      <div class="inst-sub">MS-CIT Authorized Learning Center • Maharashtra Knowledge Corporation Limited (MKCL)</div>
    </div>

    <div class="cert-title">Certificate of Assessment & Performance Report</div>
    <div class="recipient-text">This certifies student performance in the following MS-CIT module:</div>
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
        <div class="score-lbl">Status</div>
      </div>
    </div>

    <table class="meta-table">
      <tr>
        <td class="label">Test Mode</td>
        <td class="value">${widget.result.testMode.label}</td>
        <td class="label">Assessment Date</td>
        <td class="value">$dateStr</td>
      </tr>
      <tr>
        <td class="label">Correct Answers</td>
        <td class="value"><strong style="color: #059669;">${result.correctCount}</strong> questions</td>
        <td class="label">Incorrect Answers</td>
        <td class="value"><strong style="color: #dc2626;">${result.wrongCount}</strong> questions</td>
      </tr>
      <tr>
        <td class="label">Pass Requirement</td>
        <td class="value">Minimum 40.0% Required</td>
        <td class="label">Result ID</td>
        <td class="value" style="font-family: monospace; font-size: 11px;">${result.clientEventId}</td>
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
        ? (isDark ? const Color(0xFF064E3B).withOpacity(0.4) : const Color(0xFFECFDF5))
        : (isDark ? const Color(0xFF7F1D1D).withOpacity(0.4) : const Color(0xFFFEF2F2));
    final badgeBorder = isPassed
        ? (isDark ? const Color(0xFF059669) : const Color(0xFFA7F3D0))
        : (isDark ? const Color(0xFFEF4444) : const Color(0xFFFECACA));
    final badgeText = isPassed
        ? (isDark ? const Color(0xFF6EE7B7) : const Color(0xFF065F46))
        : (isDark ? const Color(0xFFFCA5A5) : const Color(0xFF991B1B));

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
                  // Institute Header Band - White & Clean in light mode
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E293B) : Colors.white,
                      border: Border(
                        bottom: BorderSide(color: borderColor, width: 1.0),
                      ),
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF334155) : const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(
                            Icons.school_rounded,
                            size: 18,
                            color: isDark ? const Color(0xFF60A5FA) : const Color(0xFF1D4ED8),
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
                                  color: textPrimary,
                                ),
                              ),
                              Text(
                                'MS-CIT Online Assessment • Official Result',
                                style: GoogleFonts.inter(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w400,
                                  color: textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            result.testMode.code == 'EXAM' ? 'EXAM' : 'PRACTICE',
                            style: GoogleFonts.inter(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.5,
                              color: isDark ? const Color(0xFF93C5FD) : const Color(0xFF1D4ED8),
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
                                valueColor: isDark ? const Color(0xFF34D399) : const Color(0xFF059669),
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
                                valueColor: isDark ? const Color(0xFFF87171) : const Color(0xFFDC2626),
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
