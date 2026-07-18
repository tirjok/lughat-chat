"""Scoring Library — 5 scoring algorithms for activity types (Slice 1).

Provides 5 distinct scoring functions, one per activity type, plus a
dispatch/routing function that selects the correct algorithm by `activity.type`:

  1. listen-translate      — Fuzzy string match (case-insensitive, whitespace-normalized)
  2. translate-to-english  — Same fuzzy match as above
  3. translate-to-arabic   — Fuzzy match with harakat-aware comparison
  4. introduce-characters  — Content validation (keyword match ratio)
  5. role-play             — Dialogue completion (ordered match ratio)

Usage:
    from content.scoring import score_activity

    result = score_activity(
        activity_type="listen-translate",
        user_answer="Peace be upon you",
        activity_content={...},
    )
    # result: {"score": 0.95, ...}
"""

import re
from typing import Any

from rapidfuzz import fuzz

# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------


def _normalize_text(text: str) -> str:
    """Normalize text for comparison: strip, collapse whitespace, lowercase."""
    if not text:
        return ""
    return " ".join(text.strip().lower().split())


def _strip_harakat(text: str) -> str:
    """Strip Arabic diacritics (harakat/tashkeel) from text.

    Arabic diacritical marks (U+064B–U+065F, U+0670) are removed.
    Non-Arabic text is returned unchanged.
    """
    if not text:
        return ""
    result = []
    for ch in text:
        cp = ord(ch)
        # Arabic diacritical marks (tashkeel)
        if 0x064B <= cp <= 0x065F or cp == 0x0670:
            continue
        result.append(ch)
    return "".join(result)


def _has_harakat(text: str) -> bool:
    """Check whether text contains Arabic diacritics (harakat)."""
    for ch in text:
        cp = ord(ch)
        if 0x064B <= cp <= 0x065F or cp == 0x0670:
            return True
    return False


def _fuzzy_score(normalized_user: str, normalized_expected: str) -> float:
    """Compute fuzzy match ratio between two normalized strings (0.0–1.0).

    Uses `fuzz.ratio` (exact character-level ratio) rather than
    `token_set_ratio` because translations are full-sentence comparisons:
    a partial answer should score lower than a complete one.
    """
    if not normalized_user:
        return 0.0
    if not normalized_expected:
        return 0.0
    return fuzz.ratio(normalized_user, normalized_expected) / 100.0


# ---------------------------------------------------------------------------
# 1. listen-translate scoring
# ---------------------------------------------------------------------------


def score_listen_translate(
    user_answer: str, activity_content: dict[str, Any]
) -> dict[str, Any]:
    """Score `listen-translate` activities.

    Fuzzy string match (case-insensitive, whitespace-normalized) between
    user's English translation and the expected answer.

    Supports two content structures:
      - Nested:  {"dialogue": {"scene1": {"english_expected": "..."}}}
      - Flat:    {"english_expected": "..."}

    Returns {"score": float (0.0–1.0), "feedback": str}.
    """
    normalized_user = _normalize_text(user_answer)

    # Try nested structure first (dialogue scenes)
    english_expected = None
    dialogue = activity_content.get("dialogue")
    if dialogue and isinstance(dialogue, dict):
        # Collect all expected translations from all scenes
        scene_expected = []
        for scene_key, scene_data in dialogue.items():
            if isinstance(scene_data, dict) and "english_expected" in scene_data:
                scene_expected.append(scene_data["english_expected"])
        if scene_expected:
            english_expected = " ".join(scene_expected)

    # Fall back to flat structure
    if english_expected is None:
        english_expected = activity_content.get("english_expected", "")

    score = _fuzzy_score(normalized_user, _normalize_text(english_expected))

    feedback = ""
    if score >= 0.9:
        feedback = "Excellent translation!"
    elif score >= 0.7:
        feedback = "Good translation — minor improvements possible."
    elif score >= 0.4:
        feedback = "Partial match — review the expected translation."
    else:
        feedback = "No significant match found."

    return {"score": round(score, 4), "feedback": feedback}


# ---------------------------------------------------------------------------
# 2. translate-to-english scoring
# ---------------------------------------------------------------------------


def score_translate_to_english(
    user_answer: str, activity_content: dict[str, Any]
) -> dict[str, Any]:
    """Score `translate-to-english` activities.

    Same fuzzy match as `listen-translate`: case-insensitive,
    whitespace-normalized.

    Supports:
      - Flat:  {"english_expected": "..."}
      - List:  {"sentences": [{"english_expected": "..."}, ...]}

    Returns {"score": float (0.0–1.0), "feedback": str}.
    """
    normalized_user = _normalize_text(user_answer)

    # Collect all expected translations
    english_expected = None
    sentences = activity_content.get("sentences")
    if sentences and isinstance(sentences, list):
        expected_parts = [
            s["english_expected"]
            for s in sentences
            if isinstance(s, dict) and "english_expected" in s
        ]
        english_expected = " ".join(expected_parts)

    if english_expected is None:
        english_expected = activity_content.get("english_expected", "")

    score = _fuzzy_score(normalized_user, _normalize_text(english_expected))

    feedback = ""
    if score >= 0.9:
        feedback = "Excellent translation!"
    elif score >= 0.7:
        feedback = "Good translation — minor improvements possible."
    elif score >= 0.4:
        feedback = "Partial match — review the expected translation."
    else:
        feedback = "No significant match found."

    return {"score": round(score, 4), "feedback": feedback}


# ---------------------------------------------------------------------------
# 3. translate-to-arabic scoring (harakat-aware)
# ---------------------------------------------------------------------------


def score_translate_to_arabic(
    user_answer: str, activity_content: dict[str, Any]
) -> dict[str, Any]:
    """Score `translate-to-arabic` activities.

    Fuzzy match with **harakat-aware** comparison:
      1. Strip harakat (Arabic diacritics) from both user answer and expected.
      2. Compute baseline fuzzy score on stripped text.
      3. If the expected answer contains harakat that the user omitted,
         apply a × 0.8 penalty to the score.

    Returns {"score": float (0.0–1.0), "feedback": str}.
    """
    normalized_user = _normalize_text(user_answer)

    # Collect all expected Arabic texts
    arabic_expected = None
    sentences = activity_content.get("sentences")
    if sentences and isinstance(sentences, list):
        expected_parts = [
            s["arabic_expected"]
            for s in sentences
            if isinstance(s, dict) and "arabic_expected" in s
        ]
        arabic_expected = " ".join(expected_parts)

    if arabic_expected is None:
        arabic_expected = activity_content.get("arabic_expected", "")

    if not normalized_user:
        return {"score": 0.0, "feedback": "No answer provided."}

    # Compute the baseline fuzzy score on *stripped* (harakat-removed) text.
    # This gives the true character-level match quality regardless of diacritics.
    stripped_expected = _strip_harakat(arabic_expected)
    stripped_user = _strip_harakat(user_answer)
    score = _fuzzy_score(stripped_user, _normalize_text(stripped_expected))

    # Harakat-aware penalty:
    # If the expected answer contains harakat that the user omitted,
    # apply a proportional penalty (up to × 0.8).
    if _has_harakat(arabic_expected) and not _has_harakat(user_answer):
        # User omitted all harakat that were in expected → full 0.8 penalty
        score = score * 0.8
    elif _has_harakat(arabic_expected):
        # User provided some harakat — partial penalty
        expected_harakat_count = sum(
            1
            for ch in arabic_expected
            if 0x064B <= ord(ch) <= 0x065F or ord(ch) == 0x0670
        )
        user_harakat_count = sum(
            1 for ch in user_answer if 0x064B <= ord(ch) <= 0x065F or ord(ch) == 0x0670
        )

        if expected_harakat_count > 0:
            harakat_ratio = user_harakat_count / expected_harakat_count
            # Penalty is proportional to harakat coverage.
            # Full coverage → no penalty (× 1.0). No coverage → 0.8 penalty.
            penalty = 1.0 - 0.2 * (1.0 - harakat_ratio)
            score = score * penalty
        # else: no harakat in expected → no penalty
    # else: expected has no harakat → no penalty

    feedback = ""
    if score >= 0.9:
        feedback = "Excellent translation!"
    elif score >= 0.7:
        feedback = "Good translation — consider adding harakat for clarity."
    elif score >= 0.4:
        feedback = "Partial match — review the expected Arabic text."
    else:
        feedback = "No significant match found."

    return {"score": round(score, 4), "feedback": feedback}


# ---------------------------------------------------------------------------
# 4. introduce-characters scoring (keyword match)
# ---------------------------------------------------------------------------


def score_introduce_characters(
    user_answer: str, activity_content: dict[str, Any]
) -> dict[str, Any]:
    """Score `introduce-characters` activities.

    Content validation: checks that the user's answer contains required
    keywords/phrases from the character's expected sentences.

    Score = keyword match ratio (0.0–1.0).

    Returns {"score": float (0.0–1.0), "feedback": str}.
    """
    normalized_user = _normalize_text(user_answer)

    if not normalized_user:
        return {"score": 0.0, "feedback": "No answer provided."}

    characters = activity_content.get("characters", [])
    if not characters:
        return {"score": 0.0, "feedback": "No character data available."}

    # Collect all expected sentences across all characters
    expected_sentences = []
    for char_data in characters:
        if isinstance(char_data, dict):
            sentences = char_data.get("sentences", [])
            for sent in sentences:
                if isinstance(sent, dict) and "arabic_expected" in sent:
                    expected_sentences.append(sent["arabic_expected"])

    if not expected_sentences:
        return {"score": 0.0, "feedback": "No expected sentences found."}

    # For each expected sentence, check if it appears as a substring
    # of the user's answer. This handles the case where the user writes
    # all sentences combined (e.g., "sentence1. sentence2. sentence3.")
    # by checking each expected sentence as a substring, with a fuzzy
    # ratio fallback for harakat differences.
    matched_count = 0
    for expected in expected_sentences:
        normalized_expected = _normalize_text(expected)
        # Primary: exact substring match (handles combined answers)
        if normalized_expected in normalized_user:
            matched_count += 1
        elif _fuzzy_score(normalized_user, normalized_expected) >= 0.6:
            # Fuzzy match fallback for harakat differences
            matched_count += 1

    score = matched_count / len(expected_sentences) if expected_sentences else 0.0

    feedback = ""
    if score >= 0.9:
        feedback = "Excellent character introductions!"
    elif score >= 0.6:
        feedback = "Good effort — include more character descriptions."
    elif score >= 0.3:
        feedback = "Partial match — try including more character details."
    else:
        feedback = "No matching content found."

    return {"score": round(score, 4), "feedback": feedback}


# ---------------------------------------------------------------------------
# 5. role-play scoring (ordered dialogue match)
# ---------------------------------------------------------------------------


def score_role_play(
    user_answer: str, activity_content: dict[str, Any]
) -> dict[str, Any]:
    """Score `role-play` activities.

    Dialogue completion scoring: checks that the user's answer contains
    the expected elements (greetings, self-introduction, etc.) in the
    correct order.

    Score = ordered match ratio (0.0–1.0).

    Returns {"score": float (0.0–1.0), "feedback": str}.
    """
    normalized_user = _normalize_text(user_answer)

    if not normalized_user:
        return {"score": 0.0, "feedback": "No answer provided."}

    expected_elements = activity_content.get("expected_elements", [])
    if not expected_elements:
        return {"score": 0.0, "feedback": "No expected elements defined."}

    # Extract the Arabic text patterns from expected elements.
    # Elements are strings like "Greeting (السَّلَامُ عَلَيْكُمْ)" or
    # "Self-introduction (أَنَا ...)" where "..." is a placeholder.
    # We normalize wildcards: "..." → removed, "/" → keep first option.
    arabic_patterns = []
    for element in expected_elements:
        if isinstance(element, str):
            # Extract Arabic text from parentheses: "Label (Arabic text)"
            match = re.search(r"\(([^()]+)\)", element)
            if match:
                text = match.group(1).strip()
                # Normalize wildcards:
                # "..." (placeholder for any text) → remove it
                # "/" (alternate options like حَالُكَ/حَالُكِ) → keep text before /
                text = re.sub(r"\.\.\.", "", text).strip()
                text = re.sub(r"/\s*[^(/)]+", "", text).strip()
                arabic_patterns.append(text)
            else:
                arabic_patterns.append(element.strip())

    if not arabic_patterns:
        arabic_patterns = [str(e).strip() for e in expected_elements]

    # Check which elements are present in the user's answer.
    # Use substring matching as primary (handles short patterns in long answers)
    # with fuzzy ratio fallback for harakat differences.
    matched_positions = []
    for i, pattern in enumerate(arabic_patterns):
        normalized_pattern = _normalize_text(pattern)
        # Primary: exact substring match (handles short patterns in long answers)
        if normalized_pattern in normalized_user:
            matched_positions.append(i)
        elif _fuzzy_score(normalized_user, normalized_pattern) >= 0.4:
            # Fuzzy match fallback for harakat differences
            matched_positions.append(i)

    # Compute ordered match score.
    # Check if matched elements appear in the correct relative order
    # *in the user's answer string*.
    if not matched_positions:
        score = 0.0
    else:
        # Find the position of each matched element in the user's answer string.
        # If the user wrote elements in the correct expected order, their
        # positions in the answer string should be ascending.
        answer_positions = []
        for pattern in arabic_patterns:
            normalized_pattern = _normalize_text(pattern)
            pos = normalized_user.find(normalized_pattern)
            if pos >= 0:
                answer_positions.append(pos)
            else:
                # Fuzzy match found but exact substring not found —
                # fall back to expected list index.
                idx = arabic_patterns.index(pattern)
                answer_positions.append(idx)

        # Check if positions in the answer string are ascending
        in_order = all(
            answer_positions[i] < answer_positions[i + 1]
            for i in range(len(answer_positions) - 1)
        )

        # Score = (matched / total) × order_bonus
        coverage = len(matched_positions) / len(arabic_patterns)

        if in_order:
            order_bonus = 1.0
        else:
            # Partial order bonus: elements appear in wrong order
            order_bonus = 0.5

        score = coverage * order_bonus

    feedback = ""
    if score >= 0.8:
        feedback = "Excellent role-play! You covered the key elements."
    elif score >= 0.5:
        feedback = "Good attempt — try to include all expected elements in order."
    elif score >= 0.2:
        feedback = "Partial match — review the expected dialogue structure."
    else:
        feedback = "No matching elements found."

    return {"score": round(score, 4), "feedback": feedback}


# ---------------------------------------------------------------------------
# Dispatch / routing function
# ---------------------------------------------------------------------------

# Mapping of activity type to scoring function
_SCORING_FUNCTIONS: dict[str, Any] = {
    "listen-translate": score_listen_translate,
    "translate-to-english": score_translate_to_english,
    "translate-to-arabic": score_translate_to_arabic,
    "introduce-characters": score_introduce_characters,
    "role-play": score_role_play,
}


def score_activity(
    activity_type: str,
    user_answer: str,
    activity_content: dict[str, Any],
) -> dict[str, Any]:
    """Dispatch the correct scoring algorithm by `activity.type`.

    Selects and calls the correct scoring function based on the activity type.
    Unknown types return a clear error message.

    Args:
        activity_type: One of the 5 activity type strings.
        user_answer: The user's submitted answer (string).
        activity_content: The activity's content dict (from lesson JSON).

    Returns:
        {"score": float (0.0–1.0), "feedback": str} on success,
        {"error": str} on unknown activity type.
    """
    scorer = _SCORING_FUNCTIONS.get(activity_type)
    if scorer is None:
        return {"error": f"Unknown activity type: {activity_type}"}

    return scorer(user_answer, activity_content)
