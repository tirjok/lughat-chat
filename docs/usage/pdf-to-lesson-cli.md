# PDF-to-Lesson CLI — Usage Guide

Converts PDF study materials into structured JSON lesson files for LughatChat.

## Prerequisites

Install the PDF parsing library:

```bash
pip install pypdf
```

## Directory Structure

Each lesson lives in `resources/lesson-XX/` with two PDF files:

```
resources/
  lesson-01/
    lesson-01.pdf              # Student study material
    Instructor Call Lesson 1.pdf # Instructor call recording transcript
  lesson-02/
    lesson-02.pdf
    Instructor Call Lesson 02.pdf
```

## Single-Lesson Mode

Generate a JSON file from one lesson's PDFs:

```bash
python scripts/pdf-to-lesson.py resources/lesson-01 \
    --sections "dialogue:1 vocabulary:2 pronouns:3 expressions:4 grammar:5" \
    --competency-pages 6 \
    --output frontend/app/data
```

**Arguments:**

| Flag | Required | Description |
|---|---|---|
| `source_dir` | Yes | Path to a `lesson-XX/` directory (e.g., `resources/lesson-01`) |
| `--sections` | Yes | Section specs: `"dialogue:1 vocabulary:2 pronouns:3"` — maps section types to PDF page numbers |
| `--competency-pages` | No | Pages of the Instructor Call PDF containing the "Final learning goals checklist" (e.g., `"6"` or `"6-7"`) |
| `--level` | No | Override level code (e.g., `A1`, `A2`). Auto-derived from directory name if omitted |
| `--sequence` | No | Override sequence number. Auto-derived from directory name if omitted |
| `--output` | No | Output directory (default: `frontend/app/data`) |

### Section Specifications

Format: `<type>:<page>[,<page>...]` — one per section, space-separated.

Supported section types: `dialogue`, `vocabulary`, `pronouns`, `expressions`, `grammar`. Custom types are accepted (rendered as "Content coming soon" in the UI).

Examples:

```bash
# Each section on a single page
--sections "dialogue:1 vocabulary:2 pronouns:3 expressions:4 grammar:5"

# Sections spanning multiple pages
--sections "dialogue:1-2 vocabulary:3 pronouns:4-5 expressions:6 grammar:7"

# Custom section type
--sections "dialogue:1 vocabulary:2 culture:3"
```

### Page Ranges

Pages are 1-indexed within the PDF. Use `start-end` syntax:

```bash
--sections "dialogue:1-2 vocabulary:3"
--competency-pages "6-7"
```

## Batch Mode

Process all lessons in `resources/` at once:

```bash
python scripts/pdf-to-lesson.py resources \
    --sections "dialogue:1 vocabulary:2 pronouns:3 expressions:4 grammar:5" \
    --competency-pages 6 \
    --output frontend/app/data
```

The CLI discovers all `lesson-XX/` subdirectories under `resources/` and processes each one.

## Merge Mode (Preserving Activities)

When a JSON file already exists, the CLI **preserves the `activities` array** from the existing file. This means hand-crafted exercises (role-play, fill-blank, matching, etc.) are not lost when regenerating a lesson's content sections.

```bash
# Regenerate lesson-01's content sections but keep existing activities
python scripts/pdf-to-lesson.py resources/lesson-01 \
    --sections "dialogue:1 vocabulary:2 pronouns:3 expressions:4 grammar:5" \
    --competency-pages 6 \
    --output frontend/app/data
```

## Output

The CLI generates `frontend/app/data/lesson-XX.json` files matching the schema:

```json
{
  "id": 1,
  "level": "A1",
  "sequence": 1,
  "title": "The Salutations — التحيّة الأولى",
  "arabicTitle": "التحيّة الأولى",
  "description": "",
  "competencies": ["Can read fluently short paragraphs with harakat", ...],
  "sections": [
    {
      "type": "dialogue",
      "title": "Dialogue",
      "content": {
        "scenes": [
          {
            "label": "Scene 1: Muhammad ↔ Ali",
            "lines": [
              { "speaker": "Muhammad", "arabic": "...", "english": "...", "notes": "..." }
            ]
          }
        ]
      }
    }
  ],
  "activities": []
}
```

## How It Works

1. **Text extraction** — Reads specified pages from the student PDF using `pypdf`.
2. **Text cleanup** — Strips OCR noise, removes page headers/footers, normalizes Arabic spacing.
3. **Section parsing** — Heuristically extracts dialogue scenes, vocabulary words, pronouns, expressions, and grammar topics from the cleaned text.
4. **Competency extraction** — Reads the "Final learning goals checklist" from the Instructor Call PDF.
5. **JSON output** — Writes a structured JSON file matching the `lesson-01.json` schema.

## Workflow for New Lessons

1. Place student PDF and Instructor Call PDF in `resources/lesson-XX/`.
2. Run the CLI with section specs mapping pages to section types.
3. Review the generated JSON file — adjust manually if needed.
4. Hand-craft activities (role-play, fill-blank, matching) and add them to the JSON file.
5. The Nuxt dev server automatically picks up the new JSON file and hot-reloads.
