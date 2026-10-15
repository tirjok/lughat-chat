#!/usr/bin/env python3
"""
PDF-to-Lesson CLI: Converts PDF study materials into structured JSON lesson files.

Usage (single lesson):
    python scripts/pdf-to-lesson.py resources/lesson-01 \
        --sections "dialogue:1 vocabulary:2 pronouns:3 expressions:4 grammar:5" \
        --competency-pages 6 \
        --output frontend/app/data

Usage (batch mode):
    python scripts/pdf-to-lesson.py resources \
        --sections "dialogue:1 vocabulary:2 pronouns:3 expressions:4 grammar:5" \
        --competency-pages 6 \
        --output frontend/app/data

Usage (migration mode — convert existing curriculum.ts data to JSON):
    python scripts/pdf-to-lesson.py --migrate --output frontend/app/data
"""

import argparse
import glob
import json
import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class DialogueLine:
    speaker: str
    arabic: str
    english: str
    notes: Optional[str] = None


@dataclass
class DialogueScene:
    label: str
    lines: list[DialogueLine] = field(default_factory=list)


@dataclass
class VocabWord:
    arabic: str
    english: str
    singular: Optional[str] = None
    plural: Optional[str] = None


@dataclass
class VocabCategory:
    label: str
    words: list[VocabWord] = field(default_factory=list)


@dataclass
class PronounEntry:
    arabic: str
    english: str
    example: str


@dataclass
class ExpressionEntry:
    arabic: str
    english: str


@dataclass
class GrammarExample:
    arabic: str
    english: str


@dataclass
class GrammarTopic:
    name: str
    description: str
    examples: list[GrammarExample] = field(default_factory=list)


@dataclass
class Activity:
    id: int
    type: str
    title: str
    description: str
    order: int
    competency_map: dict[str, float] = field(default_factory=dict)
    max_attempts: int = 3
    content: dict = field(default_factory=dict)


@dataclass
class Section:
    type: str
    title: str = ""
    scenes: list[DialogueScene] = field(default_factory=list)
    categories: list[VocabCategory] = field(default_factory=list)
    pronouns: list[PronounEntry] = field(default_factory=list)
    expressions: list[ExpressionEntry] = field(default_factory=list)
    topics: list[GrammarTopic] = field(default_factory=list)


@dataclass
class Lesson:
    id: int
    level: str
    sequence: Optional[int] = None
    title: str = ""
    arabic_title: str = ""
    description: str = ""
    competencies: list[str] = field(default_factory=list)
    sections: list[Section] = field(default_factory=list)
    activities: list[Activity] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Text cleanup
# ---------------------------------------------------------------------------

# Common OCR noise patterns to strip
_OCR_NOISE = re.compile(r'[￼\x00-\x1F\x7F-\x9F]')
# Page header/footer patterns (Arabic lesson references + page numbers)
_PAGE_HEADER = re.compile(
    r'^\s*\d+\s*[-–]\s*\d+\s*$'  # page number lines like "10 - 11"
    r'|^الدرس\s+\d+$'  # "الدرس 1"
    r'|^Lesson\s+\d+\s*$',  # "Lesson 1"
    re.MULTILINE,
)
# Extra whitespace between Arabic characters
_ARABIC_SPACING = re.compile(r'([\u0600-\u06FF\u0670-\u06FF])\s+([\u0600-\u06FF\u0670-\u06FF])')


def clean_text(text: str) -> str:
    """Apply full text cleanup: strip noise, normalize spacing, remove headers."""
    # Remove OCR noise characters
    text = _OCR_NOISE.sub('', text)

    # Remove page header/footer lines
    text = _PAGE_HEADER.sub('', text)

    # Normalize spacing between Arabic characters (collapse multiple spaces)
    text = _ARABIC_SPACING.sub(r'\1\2', text)

    # Collapse multiple blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)

    # Strip leading/trailing whitespace from each line
    lines = [line.strip() for line in text.splitlines()]
    text = '\n'.join(lines)

    return text.strip()


# ---------------------------------------------------------------------------
# PDF text extraction (using pypdf)
# ---------------------------------------------------------------------------

def extract_pdf_text(pdf_path: str, pages: Optional[list[int]] = None) -> str:
    """Extract text from a PDF file, optionally limited to specific pages (1-indexed)."""
    try:
        from pypdf import PdfReader
    except ImportError:
        print("Error: pypdf is required. Install with: pip install pypdf", file=sys.stderr)
        sys.exit(1)

    reader = PdfReader(pdf_path)
    text_parts: list[str] = []

    for page_num in range(len(reader.pages)):
        if pages is not None and (page_num + 1) not in pages:
            continue
        page = reader.pages[page_num]
        text = page.extract_text()
        if text:
            text_parts.append(clean_text(text))

    return '\n'.join(text_parts)


# ---------------------------------------------------------------------------
# Section parsers (heuristic extraction from cleaned text)
# ---------------------------------------------------------------------------

def parse_dialogue(text: str) -> list[DialogueScene]:
    """Parse dialogue sections from cleaned text.

    Heuristic: looks for scene markers (e.g., 'Scene 1:', 'Scene 2:')
    and extracts speaker-arabic-english-notes patterns.
    """
    scenes: list[DialogueScene] = []
    current_scene: Optional[DialogueScene] = None

    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue

        # Detect scene headers
        scene_match = re.match(
            r'Scene\s+(\d+)[:\s]+(.+?)(?:\s*\(.*?\))?\s*$',
            line, re.IGNORECASE,
        )
        if scene_match:
            if current_scene:
                scenes.append(current_scene)
            scene_label = scene_match.group(2).strip()
            current_scene = DialogueScene(label=f"Scene {scene_match.group(1)}: {scene_label}")
            continue

        # Detect dialogue lines (speaker: arabic — english / notes)
        if current_scene and ':' in line:
            parts = line.split(':', 1)
            speaker = parts[0].strip()
            rest = parts[1].strip()

            # Try to split arabic and english
            # Pattern: arabic text — english translation (notes)
            text_match = re.match(
                r'(.+?)\s*—\s*(.+?)(?:\s*\(.*?\))?\s*$',
                rest,
            )
            if text_match:
                arabic = text_match.group(1).strip()
                english = text_match.group(2).strip()
                # Extract notes from parentheses
                notes_match = re.search(r'\((.+)\)\s*$', english)
                notes = None
                if notes_match:
                    notes = notes_match.group(1)
                    english = english[:notes_match.start()].strip()
                current_scene.lines.append(
                    DialogueLine(speaker=speaker, arabic=arabic, english=english, notes=notes),
                )
            else:
                # Single line (arabic only)
                current_scene.lines.append(
                    DialogueLine(speaker=speaker, arabic=rest, english='', notes=None),
                )

    if current_scene and current_scene.lines:
        scenes.append(current_scene)

    return scenes


def parse_vocabulary(text: str) -> list[VocabCategory]:
    """Parse vocabulary sections from cleaned text.

    Heuristic: looks for category headers (e.g., 'Salutations', 'Nouns')
    and extracts arabic-english pairs.
    """
    categories: list[VocabCategory] = []
    current_category: Optional[VocabCategory] = None

    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue

        # Detect category headers (capitalized words, possibly with dash)
        if re.match(r'^[A-Z][a-z]+(?:\s+[a-z]+)*$', line) and len(line) < 40:
            if current_category and current_category.words:
                categories.append(current_category)
            current_category = VocabCategory(label=line)
            continue

        # Detect vocabulary entries (arabic — english)
        if current_category:
            text_match = re.match(
                r'(.+?)\s*—\s*(.+?)(?:\s*/\s*(.+))?\s*$',
                line,
            )
            if text_match:
                arabic = text_match.group(1).strip()
                english = text_match.group(2).strip()
                singular = text_match.group(3).strip() if text_match.group(3) else None
                current_category.words.append(
                    VocabWord(arabic=arabic, english=english, singular=singular),
                )

    if current_category and current_category.words:
        categories.append(current_category)

    return categories


def parse_pronouns(text: str) -> list[PronounEntry]:
    """Parse pronoun sections from cleaned text."""
    pronouns: list[PronounEntry] = []

    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue

        # Pattern: arabic — english (example)
        text_match = re.match(
            r'(.+?)\s*—\s*(.+?)(?:\s*\((.+)\))?\s*$',
            line,
        )
        if text_match:
            arabic = text_match.group(1).strip()
            english = text_match.group(2).strip()
            example = text_match.group(3).strip() if text_match.group(3) else ''
            pronouns.append(PronounEntry(arabic=arabic, english=english, example=example))

    return pronouns


def parse_expressions(text: str) -> list[ExpressionEntry]:
    """Parse expression sections from cleaned text."""
    expressions: list[ExpressionEntry] = []

    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue

        # Pattern: arabic — english
        text_match = re.match(r'(.+?)\s*—\s*(.+)$', line)
        if text_match:
            expressions.append(
                ExpressionEntry(
                    arabic=text_match.group(1).strip(),
                    english=text_match.group(2).strip(),
                ),
            )

    return expressions


def parse_grammar(text: str) -> list[GrammarTopic]:
    """Parse grammar sections from cleaned text."""
    topics: list[GrammarTopic] = []
    current_topic: Optional[GrammarTopic] = None

    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue

        # Detect topic headers (capitalized, possibly with Arabic in parentheses)
        topic_match = re.match(
            r'^(.+?)(?:\s*\((.+?)\))?\s*$',
            line,
        )
        if topic_match and len(line) < 80:
            if current_topic and current_topic.examples:
                topics.append(current_topic)
            name = topic_match.group(1).strip()
            current_topic = GrammarTopic(name=name, description='')
            continue

        # Detect example lines (arabic — english)
        if current_topic:
            text_match = re.match(r'(.+?)\s*—\s*(.+)$', line)
            if text_match:
                current_topic.examples.append(
                    GrammarExample(
                        arabic=text_match.group(1).strip(),
                        english=text_match.group(2).strip(),
                    ),
                )

    if current_topic and current_topic.examples:
        topics.append(current_topic)

    return topics


def parse_competencies(text: str) -> list[str]:
    """Extract learning competencies from Instructor Call PDF text.

    Looks for 'Final learning goals checklist' or similar headings
    and extracts bullet-pointed competencies.
    """
    competencies: list[str] = []
    in_checklist = False

    for line in text.splitlines():
        line = line.strip()

        # Detect checklist heading
        if re.search(r'final\s+learning\s+goals?\s+checklist', line, re.IGNORECASE):
            in_checklist = True
            continue

        if in_checklist:
            # Skip section headers (all caps, short)
            if re.match(r'^[A-Z][A-Z\s]+$', line) and len(line) > 20:
                continue

            # Detect competency bullets
            bullet_match = re.match(r'^[-*•]\s+(.+)$', line)
            if bullet_match:
                competencies.append(bullet_match.group(1).strip())
            elif line and not re.match(r'^\d+$', line):
                # Non-empty, non-numeric line during checklist = competency
                competencies.append(line)

    return competencies


# ---------------------------------------------------------------------------
# Section type routing
# ---------------------------------------------------------------------------

SECTION_PARSERS = {
    'dialogue': parse_dialogue,
    'vocabulary': parse_vocabulary,
    'pronouns': parse_pronouns,
    'expressions': parse_expressions,
    'grammar': parse_grammar,
}


def parse_section_content(section_type: str, text: str) -> dict:
    """Parse text into the appropriate section content structure."""
    parser = SECTION_PARSERS.get(section_type)
    if not parser:
        # Unknown section type — store raw text
        return {'raw_text': text}

    result = parser(text)

    if section_type == 'dialogue':
        return {'scenes': [{'label': s.label, 'lines': [
            {'speaker': l.speaker, 'arabic': l.arabic, 'english': l.english, 'notes': l.notes}
            for l in s.lines
        ]} for s in result]}
    elif section_type == 'vocabulary':
        return {'categories': [{'label': c.label, 'words': [
            {'arabic': w.arabic, 'english': w.english, 'singular': w.singular, 'plural': w.plural}
            for w in c.words
        ]} for c in result]}
    elif section_type == 'pronouns':
        return {'pronouns': [
            {'arabic': p.arabic, 'english': p.english, 'example': p.example}
            for p in result
        ]}
    elif section_type == 'expressions':
        return {'expressions': [
            {'arabic': e.arabic, 'english': e.english}
            for e in result
        ]}
    elif section_type == 'grammar':
        return {'topics': [
            {'name': t.name, 'description': t.description, 'examples': [
                {'arabic': ex.arabic, 'english': ex.english}
                for ex in t.examples
            ]} for t in result
        ]}

    return {}


# ---------------------------------------------------------------------------
# Page range parsing
# ---------------------------------------------------------------------------

def parse_page_range(range_str: str) -> list[int]:
    """Parse a page range specification like '1-3' or '5' into a list of page numbers."""
    pages: list[int] = []
    for part in range_str.split(','):
        part = part.strip()
        if '-' in part:
            start, end = part.split('-', 1)
            pages.extend(range(int(start.strip()), int(end.strip()) + 1))
        else:
            pages.append(int(part))
    return pages


def parse_sections_spec(spec: str) -> list[tuple[str, list[int]]]:
    """Parse section specification like 'dialogue:1-2 vocabulary:3' into [(type, pages), ...]."""
    sections: list[tuple[str, list[int]]] = []
    for part in spec.split():
        if ':' in part:
            section_type, page_range = part.split(':', 1)
            sections.append((section_type.strip(), parse_page_range(page_range)))
        else:
            # No page range specified — use all pages
            sections.append((part.strip(), []))
    return sections


# ---------------------------------------------------------------------------
# Lesson ID derivation
# ---------------------------------------------------------------------------

def derive_lesson_id(source_dir: str) -> tuple[str, str, int]:
    """Derive lesson ID, level, and sequence from source directory name.

    Examples:
        resources/lesson-01/ → ('a1-01', 'A1', 1)
        resources/lesson-02/ → ('a1-02', 'A1', 2)
        resources/lesson-10/ → ('b1-10', 'B1', 10)
    """
    dir_name = Path(source_dir).name

    # Extract number from directory name (e.g., 'lesson-01' → 1)
    num_match = re.search(r'(\d+)', dir_name)
    if not num_match:
        raise ValueError(f"Cannot derive lesson number from directory name: {dir_name}")

    sequence = int(num_match.group(1))

    # Derive level from directory name pattern
    # Common patterns: lesson-01 (A1), lesson-02 (A1), lesson-10 (B1), etc.
    # Map sequence ranges to CEFR levels
    level_map = {
        (1, 10): 'A1',
        (11, 20): 'A2',
        (21, 30): 'B1',
        (31, 40): 'B2',
        (41, 50): 'C1',
        (51, 60): 'C2',
    }

    level = 'A1'  # default
    for (low, high), lvl in level_map.items():
        if low <= sequence <= high:
            level = lvl
            break

    lesson_id = f"{level.lower()}-{sequence:02d}"
    return lesson_id, level, sequence


# ---------------------------------------------------------------------------
# JSON output generation
# ---------------------------------------------------------------------------

def generate_json_lesson(
    lesson: Lesson,
    sections_spec: list[tuple[str, list[int]]],
    source_dir: str,
) -> dict:
    """Generate the JSON lesson object matching the lesson-01.json schema."""
    lesson_id, level, sequence = derive_lesson_id(source_dir)

    # Build sections from parsed text
    sections: list[dict] = []
    for section_type, pages in sections_spec:
        # This is called after text extraction; the caller passes parsed content
        pass

    return {
        'id': lesson.id,
        'level': lesson.level,
        'sequence': lesson.sequence,
        'title': lesson.title,
        'arabicTitle': lesson.arabic_title,
        'description': lesson.description,
        'competencies': lesson.competencies,
        'sections': sections,
        'activities': [
            {
                'id': a.id,
                'type': a.type,
                'title': a.title,
                'description': a.description,
                'order': a.order,
                'competency_map': a.competency_map,
                'max_attempts': a.max_attempts,
                'content': a.content,
            } for a in lesson.activities
        ],
    }


# ---------------------------------------------------------------------------
# Merge mode: preserve existing activities
# ---------------------------------------------------------------------------

def merge_activities(existing: dict, new: dict) -> dict:
    """Merge new lesson data with existing JSON, preserving activities."""
    merged = dict(new)
    if 'activities' in existing and existing['activities']:
        merged['activities'] = existing['activities']
    return merged


# ---------------------------------------------------------------------------
# Migration mode: convert curriculum.ts embedded data to JSON
# ---------------------------------------------------------------------------

def migrate_from_curriculum(
    output_dir: str,
    curriculum_data: list[dict],
) -> list[str]:
    """Migrate embedded curriculum data from curriculum.ts to JSON files.

    This is used when there are no PDFs but we need to generate JSON
    from the existing curriculum.ts data.
    """
    generated: list[str] = []

    for level_data in curriculum_data:
        level_code = level_data.get('code', 'A1')
        for lesson_data in level_data.get('lessons', []):
            lesson_id = lesson_data.get('id', '')
            seq_match = re.search(r'(\d+)$', lesson_id)
            if not seq_match:
                continue

            sequence = int(seq_match.group(1))

            # Build sections from nested data
            sections: list[dict] = []
            for section in lesson_data.get('sections', []):
                section_type = section.get('type', 'unknown')
                content = section.get('content', {})

                section_obj: dict = {
                    'type': section_type,
                    'title': section.get('title', ''),
                }

                if section_type == 'dialogue':
                    section_obj['content'] = {
                        'scenes': content.get('scenes', []),
                    }
                elif section_type == 'vocabulary':
                    section_obj['content'] = {
                        'categories': content.get('categories', []),
                    }
                elif section_type == 'pronouns':
                    section_obj['content'] = {
                        'pronouns': content.get('pronouns', []),
                    }
                elif section_type == 'expressions':
                    section_obj['content'] = {
                        'expressions': content.get('expressions', []),
                    }
                elif section_type == 'grammar':
                    section_obj['content'] = {
                        'topics': content.get('topics', []),
                    }
                else:
                    section_obj['content'] = content

                sections.append(section_obj)

            # Build activities
            activities: list[dict] = []
            for activity in lesson_data.get('activities', []):
                activities.append({
                    'id': activity.get('id'),
                    'type': activity.get('type'),
                    'title': activity.get('title'),
                    'description': activity.get('description'),
                    'order': activity.get('order'),
                    'competency_map': activity.get('competencyMap', {}),
                    'max_attempts': activity.get('maxAttempts', 3),
                    'content': activity.get('content', {}),
                })

            lesson_json = {
                'id': sequence,
                'level': level_code,
                'sequence': sequence,
                'title': lesson_data.get('title', ''),
                'arabicTitle': lesson_data.get('arabicTitle', ''),
                'description': lesson_data.get('description', ''),
                'competencies': lesson_data.get('competencies'),
                'sections': sections,
                'activities': activities,
            }

            output_path = os.path.join(output_dir, f'lesson-{sequence:02d}.json')
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(lesson_json, f, ensure_ascii=False, indent=2)
                f.write('\n')

            generated.append(output_path)
            print(f"  Generated: {output_path}")

    return generated


# ---------------------------------------------------------------------------
# Single lesson processing
# ---------------------------------------------------------------------------

def process_single_lesson(
    source_dir: str,
    sections_spec: list[tuple[str, list[int]]],
    competency_pages: Optional[list[int]],
    output_dir: str,
) -> str:
    """Process a single lesson directory into a JSON file."""
    lesson_id, level, sequence = derive_lesson_id(source_dir)

    # Find PDF files
    student_pdf = os.path.join(source_dir, f'lesson-{sequence:02d}.pdf')
    instructor_pdf = os.path.join(source_dir, 'Instructor Call Lesson ' + str(sequence) + '.pdf')

    # Fallback: try common naming patterns
    if not os.path.exists(student_pdf):
        pdf_files = glob.glob(os.path.join(source_dir, '*.pdf'))
        instructor_files = glob.glob(os.path.join(source_dir, 'Instructor*'))
        if pdf_files:
            student_pdf = pdf_files[0]
        if instructor_files:
            instructor_pdf = instructor_files[0]

    # Extract text from student PDF sections
    lesson = Lesson(id=sequence, level=level, sequence=sequence)

    for section_type, pages in sections_spec:
        text = extract_pdf_text(student_pdf, pages if pages else None)
        if not text.strip():
            print(f"  Warning: No text extracted for section '{section_type}'", file=sys.stderr)
            continue

        content = parse_section_content(section_type, text)
        section = Section(type=section_type, title=f'{section_type.title()} — {section_type.title()}')
        if section_type == 'dialogue':
            section.scenes = content.get('scenes', [])
        elif section_type == 'vocabulary':
            section.categories = content.get('categories', [])
        elif section_type == 'pronouns':
            section.pronouns = content.get('pronouns', [])
        elif section_type == 'expressions':
            section.expressions = content.get('expressions', [])
        elif section_type == 'grammar':
            section.topics = content.get('topics', [])

        lesson.sections.append(section)

    # Extract competencies from Instructor Call PDF
    if competency_pages and os.path.exists(instructor_pdf):
        comp_text = extract_pdf_text(instructor_pdf, competency_pages)
        lesson.competencies = parse_competencies(comp_text)

    # Build JSON output
    lesson_json = {
        'id': lesson.id,
        'level': lesson.level,
        'sequence': lesson.sequence,
        'title': lesson.title,
        'arabicTitle': lesson.arabic_title,
        'description': lesson.description,
        'competencies': lesson.competencies,
        'sections': [
            {
                'type': s.type,
                'title': s.title,
                'content': _section_to_dict(s),
            } for s in lesson.sections
        ],
        'activities': [],  # Activities are hand-crafted; CLI outputs empty array
    }

    # Merge with existing JSON if it exists (preserve activities)
    output_path = os.path.join(output_dir, f'lesson-{sequence:02d}.json')
    if os.path.exists(output_path):
        with open(output_path, 'r', encoding='utf-8') as f:
            existing = json.load(f)
        lesson_json = merge_activities(existing, lesson_json)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(lesson_json, f, ensure_ascii=False, indent=2)
        f.write('\n')

    print(f"  Generated: {output_path}")
    return output_path


def _section_to_dict(section: Section) -> dict:
    """Convert a Section dataclass to a JSON-serializable dict."""
    result: dict = {}
    if section.type == 'dialogue':
        result['scenes'] = [
            {'label': s.label, 'lines': [
                {'speaker': l.speaker, 'arabic': l.arabic, 'english': l.english, 'notes': l.notes}
                for l in s.lines
            ]} for s in section.scenes
        ]
    elif section.type == 'vocabulary':
        result['categories'] = [
            {'label': c.label, 'words': [
                {'arabic': w.arabic, 'english': w.english, 'singular': w.singular, 'plural': w.plural}
                for w in c.words
            ]} for c in section.categories
        ]
    elif section.type == 'pronouns':
        result['pronouns'] = [
            {'arabic': p.arabic, 'english': p.english, 'example': p.example}
            for p in section.pronouns
        ]
    elif section.type == 'expressions':
        result['expressions'] = [
            {'arabic': e.arabic, 'english': e.english}
            for e in section.expressions
        ]
    elif section.type == 'grammar':
        result['topics'] = [
            {'name': t.name, 'description': t.description, 'examples': [
                {'arabic': ex.arabic, 'english': ex.english}
                for ex in t.examples
            ]} for t in section.topics
        ]
    return result


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description='Convert PDF study materials to structured JSON lesson files.',
    )
    parser.add_argument(
        'source_dir',
        nargs='?',
        default=None,
        help='Source directory containing lesson PDFs (e.g., resources/lesson-01)',
    )
    parser.add_argument(
        '--sections',
        required=True,
        help='Section specifications: "dialogue:1 vocabulary:2 pronouns:3"',
    )
    parser.add_argument(
        '--competency-pages',
        help='Pages of Instructor Call PDF containing learning goals (e.g., "6" or "6-7")',
    )
    parser.add_argument(
        '--level',
        help='Override level code (e.g., A1, A2)',
    )
    parser.add_argument(
        '--sequence',
        type=int,
        help='Override sequence number',
    )
    parser.add_argument(
        '--output',
        default='frontend/app/data',
        help='Output directory for JSON files (default: frontend/app/data)',
    )
    parser.add_argument(
        '--migrate',
        action='store_true',
        help='Migration mode: convert existing curriculum.ts data to JSON files',
    )

    args = parser.parse_args()

    if args.migrate:
        # Migration mode: read curriculum.ts embedded data and convert to JSON
        print("Migration mode: converting curriculum.ts data to JSON files...")
        print(f"  Output directory: {args.output}")

        # The curriculum data is now loaded from JSON files via data-loader.ts
        # For migration, we need the original embedded data.
        # This mode is for one-time conversion of existing lessons.
        print("Error: Migration mode requires the original curriculum.ts data.")
        print("Please run this tool once per lesson using PDF source files.")
        sys.exit(1)

    if not args.source_dir:
        parser.print_help()
        sys.exit(1)

    # Parse section specifications
    sections_spec = parse_sections_spec(args.sections)

    # Parse competency pages
    competency_pages = None
    if args.competency_pages:
        competency_pages = parse_page_range(args.competency_pages)

    # Ensure output directory exists
    os.makedirs(args.output, exist_ok=True)

    # Check if source_dir is a lesson directory or a resources directory
    source_path = Path(args.source_dir)

    if source_path.is_dir() and source_path.name.startswith('lesson-'):
        # Single lesson mode
        print(f"Processing: {args.source_dir}")
        process_single_lesson(
            source_dir=args.source_dir,
            sections_spec=sections_spec,
            competency_pages=competency_pages,
            output_dir=args.output,
        )
    elif source_path.is_dir():
        # Batch mode: process all lesson-XX subdirectories
        lesson_dirs = sorted(source_path.glob('lesson-*'))
        if not lesson_dirs:
            print(f"No lesson directories found in {args.source_dir}", file=sys.stderr)
            sys.exit(1)

        print(f"Batch mode: processing {len(lesson_dirs)} lessons...")
        for lesson_dir in lesson_dirs:
            try:
                process_single_lesson(
                    source_dir=str(lesson_dir),
                    sections_spec=sections_spec,
                    competency_pages=competency_pages,
                    output_dir=args.output,
                )
            except Exception as e:
                print(f"  Error processing {lesson_dir}: {e}", file=sys.stderr)
    else:
        print(f"Source directory not found: {args.source_dir}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
