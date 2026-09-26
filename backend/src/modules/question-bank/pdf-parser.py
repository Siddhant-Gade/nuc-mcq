import os
import sys
import json
import re
import pdfplumber

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

def sanitize_text(text):
    if not text:
        return ""
    t = str(text).replace('\r', ' ').replace('\n', ' ').strip()
    t = re.sub(r'\s+', ' ', t)
    return t

def infer_section(sr_num, question_text):
    q_lower = question_text.lower()
    
    # GCC-TBC standardized batch format 25-question structure
    if 1 <= sr_num <= 5:
        return "Computer Fundamentals"
    elif 6 <= sr_num <= 10:
        return "MS Word"
    elif 11 <= sr_num <= 15:
        return "MS Excel"
    elif 16 <= sr_num <= 20:
        return "PowerPoint"
    elif 21 <= sr_num <= 25:
        return "Internet"
    
    # Fallback keyword matching
    if any(k in q_lower for k in ['excel', 'workbook', 'worksheet', 'cell', 'formula', 'sum(', 'average(']):
        return "MS Excel"
    if any(k in q_lower for k in ['word', 'font', 'paragraph', 'margin', 'header', 'footer', 'watermark', 'table']):
        return "MS Word"
    if any(k in q_lower for k in ['powerpoint', 'presentation', 'slide', 'transition', 'animation', 'smartart']):
        return "PowerPoint"
    if any(k in q_lower for k in ['internet', 'email', 'e-mail', 'browser', 'isp', 'html', 'url', 'web', 'download', 'upload']):
        return "Internet"
    if any(k in q_lower for k in ['windows', 'operating system', 'desktop', 'file', 'folder', 'icon']):
        return "OS"
    if any(k in q_lower for k in ['pagemaker', 'publication', 'master page', 'palette']):
        return "PageMaker"
    return "Computer Fundamentals"

def find_companion_json(pdf_path, orig_name=None):
    """Look for pre-built or companion JSON question bank matching the PDF file name."""
    search_names = []
    if orig_name:
        search_names.append(os.path.splitext(os.path.basename(orig_name))[0])
    search_names.append(os.path.splitext(os.path.basename(pdf_path))[0])

    candidate_dirs = [
        os.path.dirname(os.path.abspath(pdf_path)),
        os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../../assets/question_bank')),
        os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../../students_app/assets/data')),
    ]

    for name in search_names:
        norm = name.strip().upper()
        direct_files = [f"{name}.json", f"{name.upper()}.json", f"{name.lower()}.json"]

        if 'INTERNET' in norm:
            direct_files.append('INTERNET-OBJECTIVE.json')
        elif 'EXCEL' in norm:
            direct_files.append('MS-EXCEL-OBJECTIVE.json')
        elif 'WORD' in norm:
            direct_files.append('MS-WORD-OBJECTIVE.json')
        elif 'POWER' in norm:
            direct_files.append('POWER-POINT-OBJECTIVE.json')
        elif 'FUNDAMENTAL' in norm:
            direct_files.append('COMPUTER-FUNDAMENTAL-OBJECTIVE.json')
        elif 'FULL' in norm or 'ALL' in norm or 'BANK' in norm:
            direct_files.append('FULL-QUESTION-BANK.json')

        for cdir in candidate_dirs:
            if not os.path.isdir(cdir):
                continue
            for df in direct_files:
                target_json = os.path.join(cdir, df)
                if os.path.isfile(target_json):
                    try:
                        with open(target_json, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                            if isinstance(data, list) and len(data) > 0:
                                return data
                    except Exception:
                        pass
    return None

def parse_gcc_tbc_page_stream_order(page):
    """
    Extract GCC-TBC tabular MCQ rows by tracking characters in PDF content-stream order.
    Eliminates cell interleaving/letter jumbling when centered option text overflows column borders.
    """
    h_lines = sorted(list(set(round(line['top'], 1) for line in page.lines if line['height'] == 0 or line['top'] == line['bottom'])))
    v_lines = sorted(list(set(round(line['x0'], 1) for line in page.lines if line['width'] == 0 or line['x0'] == line['x1'])))
    
    if len(v_lines) < 6 or len(h_lines) < 2:
        return []
        
    page_questions = []
    for r_idx in range(len(h_lines) - 1):
        top_y = h_lines[r_idx]
        bot_y = h_lines[r_idx + 1]
        
        row_chars = [c for c in page.chars if top_y - 1 <= c['top'] <= bot_y + 1]
        if not row_chars:
            continue
            
        runs = []
        cur_run = []
        for c in row_chars:
            if not cur_run:
                cur_run.append(c)
                continue
            prev = cur_run[-1]
            line_changed = abs(c['top'] - prev['top']) > 4
            backward_jump = c['x0'] < prev['x1'] - 0.5
            large_gap = (c['x0'] - prev['x1']) > 7
            crosses_v_line = any(prev['x1'] <= v <= c['x0'] for v in v_lines)
            
            if line_changed or backward_jump or large_gap or crosses_v_line:
                runs.append(cur_run)
                cur_run = [c]
            else:
                cur_run.append(c)
        if cur_run:
            runs.append(cur_run)
            
        col_cells = {i: [] for i in range(len(v_lines))}
        for run in runs:
            mid_x = (run[0]['x0'] + run[-1]['x1']) / 2
            col_idx = len(v_lines) - 1
            for i in range(len(v_lines) - 1):
                if v_lines[i] <= mid_x < v_lines[i+1]:
                    col_idx = i
                    break
            text = ''.join(c['text'] for c in run).strip()
            if text:
                col_cells[col_idx].append(text)
                
        cell_values = [sanitize_text(' '.join(col_cells[i])) for i in range(len(v_lines))]
        sr_val_str = cell_values[0].strip()
        if not sr_val_str.isdigit():
            continue
            
        sr_val = int(sr_val_str)
        q_text = cell_values[1] if len(cell_values) > 1 else ''
        if not q_text:
            continue
            
        opt_a = cell_values[2] if len(cell_values) > 2 else ''
        opt_b = cell_values[3] if len(cell_values) > 3 else ''
        opt_c = cell_values[4] if len(cell_values) > 4 else ''
        opt_d = cell_values[5] if len(cell_values) > 5 else ''
        
        ans_col = ''
        if len(cell_values) > 7 and cell_values[7]:
            ans_col = cell_values[7].upper()
        elif len(cell_values) > 6 and cell_values[6]:
            ans_col = cell_values[6].upper()
            
        correct_opt = 'A'
        for candidate in ['A', 'B', 'C', 'D']:
            if candidate in ans_col:
                correct_opt = candidate
                break
                
        idx_map = {'A': 0, 'B': 1, 'C': 2, 'D': 3}
        correct_idx = idx_map.get(correct_opt, 0)
        opts = [opt_a or 'Option A', opt_b or 'Option B', opt_c or 'Option C', opt_d or 'Option D']
        correct_ans = opts[correct_idx] if opts[correct_idx] else (opt_a or 'Option A')
        section = infer_section(sr_val, q_text)
        
        page_questions.append({
            'sr': sr_val,
            'section': section,
            'question_en': q_text,
            'opt_a_en': opts[0],
            'opt_b_en': opts[1],
            'opt_c_en': opts[2],
            'opt_d_en': opts[3],
            'correct_option': correct_opt,
            'correct_index': correct_idx,
            'correct_answer': correct_ans,
            'explanation_en': f"Official GCC-TBC standard answer is Option {correct_opt}: {correct_ans}."
        })
        
    return page_questions

def parse_single_pdf(pdf_path, orig_name=None):
    questions = []
    total_text_len = 0
    total_images = 0

    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                total_images += len(page.images)
                page_text = page.extract_text() or ''
                total_text_len += len(page_text.strip())

                # Primary: Stream-order extraction to prevent letter jumbling
                stream_questions = parse_gcc_tbc_page_stream_order(page)
                if stream_questions:
                    questions.extend(stream_questions)
                    continue

                # Secondary fallback: standard extract_table
                table = page.extract_table()
                if not table:
                    continue
                
                header_idx = -1
                for idx, row in enumerate(table):
                    if row and any('question' in str(cell).lower() for cell in row if cell):
                        header_idx = idx
                        break
                
                if header_idx != -1:
                    data_rows = table[header_idx + 1:]
                    for row in data_rows:
                        if not row or not row[0]:
                            continue
                        sr_str = str(row[0]).strip()
                        if not sr_str.isdigit():
                            continue
                        sr_val = int(sr_str)
                        
                        q_text = sanitize_text(row[1]) if len(row) > 1 else ''
                        if not q_text:
                            continue
                            
                        opt_a = sanitize_text(row[2]) if len(row) > 2 else ''
                        opt_b = sanitize_text(row[3]) if len(row) > 3 else ''
                        opt_c = sanitize_text(row[4]) if len(row) > 4 else ''
                        opt_d = sanitize_text(row[5]) if len(row) > 5 else ''
                        
                        ans_col = ''
                        if len(row) > 7 and row[7]:
                            ans_col = str(row[7]).strip().upper()
                        elif len(row) > 6 and row[6]:
                            ans_col = str(row[6]).strip().upper()
                        
                        correct_opt = 'A'
                        for candidate in ['A', 'B', 'C', 'D']:
                            if candidate in ans_col:
                                correct_opt = candidate
                                break
                        
                        idx_map = {'A': 0, 'B': 1, 'C': 2, 'D': 3}
                        correct_idx = idx_map.get(correct_opt, 0)
                        opts = [opt_a or 'Option A', opt_b or 'Option B', opt_c or 'Option C', opt_d or 'Option D']
                        correct_ans = opts[correct_idx] if opts[correct_idx] else (opt_a or 'Option A')
                        
                        section = infer_section(sr_val, q_text)
                        
                        questions.append({
                            'sr': sr_val,
                            'section': section,
                            'question_en': q_text,
                            'opt_a_en': opts[0],
                            'opt_b_en': opts[1],
                            'opt_c_en': opts[2],
                            'opt_d_en': opts[3],
                            'correct_option': correct_opt,
                            'correct_index': correct_idx,
                            'correct_answer': correct_ans,
                            'explanation_en': f"Official GCC-TBC standard answer is Option {correct_opt}: {correct_ans}."
                        })
    except Exception as e:
        sys.stderr.write(f"Error parsing {pdf_path}: {e}\n")

    if questions:
        return questions

    # Fallback to companion JSON dataset if available
    companion_questions = find_companion_json(pdf_path, orig_name)
    if companion_questions:
        return companion_questions

    # Report scanned / image-only PDFs
    display_name = orig_name or os.path.basename(pdf_path)
    if total_text_len == 0 and total_images > 0:
        sys.stderr.write(
            f"Error: '{display_name}' consists of scanned/screenshot images without an extractable text or table layer. "
            f"Please upload a GCC-TBC batch PDF, Excel spreadsheet (.xlsx/.csv), or JSON question file.\n"
        )
    elif total_text_len == 0 and total_images == 0:
        sys.stderr.write(f"Error: '{display_name}' appears to be an empty or blank PDF document.\n")
    else:
        sys.stderr.write(
            f"Error: No standard question tables or format recognized in '{display_name}'. "
            f"Please ensure questions follow GCC-TBC batch format or upload as Excel/JSON.\n"
        )

    return []

def parse_paths(paths, orig_name=None):
    all_questions = []
    for p in paths:
        if os.path.isdir(p):
            for root, _, files in os.walk(p):
                for f in sorted(files):
                    if f.lower().endswith('.pdf') and not f.startswith('.'):
                        all_questions.extend(parse_single_pdf(os.path.join(root, f)))
        elif p.lower().endswith('.pdf') and os.path.isfile(p):
            all_questions.extend(parse_single_pdf(p, orig_name))
            
    # Deduplicate questions by question text
    unique_map = {}
    deduped = []
    for q in all_questions:
        norm_key = q.get('question_en', '').lower().strip()
        if norm_key and norm_key not in unique_map:
            unique_map[norm_key] = True
            q['sr'] = len(deduped) + 1
            deduped.append(q)
            
    return deduped

if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.stderr.write("Usage: python pdf-parser.py <file_or_dir_path> [original_file_name]\n")
        sys.exit(1)
        
    target_path = sys.argv[1]
    orig_name = sys.argv[2] if len(sys.argv) > 2 else None
    
    result = parse_paths([target_path], orig_name)
    if not result:
        print(json.dumps([]))
        sys.exit(2)

    print(json.dumps(result, ensure_ascii=False))
