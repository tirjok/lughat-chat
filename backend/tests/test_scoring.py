"""Tests for the Scoring Library (Slice 1).

Covers 5 scoring algorithms:
  1. listen-translate  — Fuzzy string match (case-insensitive, whitespace-normalized)
  2. translate-to-english — Fuzzy string match (case-insensitive, whitespace-normalized)
  3. translate-to-arabic  — Fuzzy match with harakat-aware comparison
  4. introduce-characters — Content validation (keyword match ratio)
  5. role-play           — Dialogue completion (ordered match ratio)

Plus the dispatch/routing function `score_activity`.
"""

import pytest

from content.scoring import (
    score_activity,
    score_listen_translate,
    score_translate_to_english,
    score_translate_to_arabic,
    score_introduce_characters,
    score_role_play,
)


# ===========================================================================
# 1. listen-translate scoring
# ===========================================================================


class TestListenTranslate:
    """Score `listen-translate` activities (fuzzy string match, case-insensitive, whitespace-normalized)."""

    def test_exact_match_returns_1_0(self):
        """Exact match should return score 1.0."""
        result = score_listen_translate(
            user_answer="Peace be upon you",
            activity_content={
                "dialogue": {"scene1": {"english_expected": "Peace be upon you"}}
            },
        )
        assert result["score"] == pytest.approx(1.0)
        assert result["feedback"] == "Excellent translation!"

    def test_case_insensitive(self):
        """Differing case should still score high."""
        result = score_listen_translate(
            user_answer="PEACE BE UPON YOU",
            activity_content={
                "dialogue": {"scene1": {"english_expected": "Peace be upon you"}}
            },
        )
        assert result["score"] == pytest.approx(1.0, abs=0.01)
        assert result["feedback"] == "Excellent translation!"

    def test_whitespace_normalized(self):
        """Extra/missing whitespace should not significantly affect score."""
        result = score_listen_translate(
            user_answer="  Peace   be  upon  you  ",
            activity_content={
                "dialogue": {"scene1": {"english_expected": "Peace be upon you"}}
            },
        )
        assert result["score"] == pytest.approx(1.0, abs=0.01)
        assert result["feedback"] == "Excellent translation!"

    def test_partial_match_returns_intermediate_score(self):
        """Partial answer should score below a complete answer."""
        result = score_listen_translate(
            user_answer="Peace",
            activity_content={
                "dialogue": {
                    "scene1": {
                        "english_expected": "Peace be upon you and Allah's mercy"
                    }
                }
            },
        )
        # fuzz.ratio("peace", "peace be upon you and allah's mercy") ≈ 0.46
        assert result["score"] < 0.5
        assert "match" in result["feedback"].lower()

    def test_empty_user_answer(self):
        """Empty user answer should return score 0.0."""
        result = score_listen_translate(
            user_answer="",
            activity_content={
                "dialogue": {"scene1": {"english_expected": "Hello world"}}
            },
        )
        assert result["score"] == 0.0
        assert result["feedback"] == "No significant match found."

    def test_completely_unrelated(self):
        """Completely unrelated text should score well below threshold."""
        result = score_listen_translate(
            user_answer="The quick brown fox jumps over the lazy dog",
            activity_content={
                "dialogue": {"scene1": {"english_expected": "Peace be upon you"}}
            },
        )
        # Shared common words (the, be, upon) give ~0.32 with fuzz.ratio
        # This is well below the 0.7 completion threshold
        assert result["score"] < 0.4
        assert result["feedback"] == "No significant match found."

    def test_no_dialogue_key_falls_back_to_content(self):
        """When no 'dialogue' key exists, fall back to top-level 'english_expected'."""
        result = score_listen_translate(
            user_answer="Hello world",
            activity_content={"english_expected": "Hello world"},
        )
        assert result["score"] == pytest.approx(1.0)
        assert result["feedback"] == "Excellent translation!"


# ===========================================================================
# 2. translate-to-english scoring
# ===========================================================================


class TestTranslateToEnglish:
    """Score `translate-to-english` activities (fuzzy string match, case-insensitive, whitespace-normalized)."""

    def test_exact_match_returns_1_0(self):
        """Exact match should return score 1.0."""
        result = score_translate_to_english(
            user_answer="I am a Muslim",
            activity_content={"sentences": [{"english_expected": "I am a Muslim"}]},
        )
        assert result["score"] == pytest.approx(1.0)
        assert result["feedback"] == "Excellent translation!"

    def test_case_insensitive(self):
        """Differing case should still score high."""
        result = score_translate_to_english(
            user_answer="I AM A MUSLIM",
            activity_content={"sentences": [{"english_expected": "I am a Muslim"}]},
        )
        assert result["score"] == pytest.approx(1.0, abs=0.01)
        assert result["feedback"] == "Excellent translation!"

    def test_whitespace_normalized(self):
        """Extra whitespace should not significantly affect score."""
        result = score_translate_to_english(
            user_answer="  I  am  a  Muslim  ",
            activity_content={"sentences": [{"english_expected": "I am a Muslim"}]},
        )
        assert result["score"] == pytest.approx(1.0, abs=0.01)
        assert result["feedback"] == "Excellent translation!"

    def test_empty_user_answer(self):
        """Empty user answer should return score 0.0."""
        result = score_translate_to_english(
            user_answer="",
            activity_content={"sentences": [{"english_expected": "Hello"}]},
        )
        assert result["score"] == 0.0
        assert result["feedback"] == "No significant match found."

    def test_partial_match_returns_intermediate_score(self):
        """Partial answer should score below a complete answer."""
        result = score_translate_to_english(
            user_answer="I am",
            activity_content={"sentences": [{"english_expected": "I am a Muslim"}]},
        )
        # fuzz.ratio("i am", "i am a muslim") ≈ 0.53
        assert result["score"] < 0.5
        assert result["feedback"] == "Partial match — review the expected translation."


# ===========================================================================
# 3. translate-to-arabic scoring (harakat-aware)
# ===========================================================================


class TestTranslateToArabic:
    """Score `translate-to-arabic` activities (fuzzy match with harakat penalty)."""

    def test_exact_match_with_harakat_returns_1_0(self):
        """Exact match with harakat should return 1.0."""
        result = score_translate_to_arabic(
            user_answer="أَنَا مُسْلِم",
            activity_content={"sentences": [{"arabic_expected": "أَنَا مُسْلِم"}]},
        )
        assert result["score"] == pytest.approx(1.0)
        assert result["feedback"] == "Excellent translation!"

    def test_without_harakat_gets_penalty(self):
        """Answer without harakat when expected has harakat should get × 0.8 penalty."""
        result = score_translate_to_arabic(
            user_answer="انا مسلم",  # no harakat
            activity_content={
                "sentences": [
                    {"arabic_expected": "أَنَا مُسْلِم"}  # with harakat
                ]
            },
        )
        # Stripped score is ~0.875, × 0.8 penalty = ~0.7
        assert result["score"] == pytest.approx(0.7, abs=0.05)
        assert (
            "harakat" in result["feedback"].lower()
            or "good" in result["feedback"].lower()
        )

    def test_partial_with_harakat(self):
        """Partial match with harakat should score between 0 and 1."""
        result = score_translate_to_arabic(
            user_answer="أَنَا",  # partial
            activity_content={"sentences": [{"arabic_expected": "أَنَا مُسْلِم"}]},
        )
        assert 0.0 < result["score"] < 1.0

    def test_empty_user_answer(self):
        """Empty user answer should return score 0.0."""
        result = score_translate_to_arabic(
            user_answer="",
            activity_content={"sentences": [{"arabic_expected": "أَنَا مُسْلِم"}]},
        )
        assert result["score"] == 0.0
        assert result["feedback"] == "No answer provided."

    def test_no_harakat_when_expected_has_no_harakat(self):
        """When expected answer has no harakat, no penalty should apply."""
        result = score_translate_to_arabic(
            user_answer="انا مسلم",  # no harakat
            activity_content={
                "sentences": [
                    {"arabic_expected": "انا مسلم"}  # also no harakat
                ]
            },
        )
        assert result["score"] == pytest.approx(1.0, abs=0.01)
        assert result["feedback"] == "Excellent translation!"

    def test_mixed_harakat_penalty(self):
        """If user provides some but not all harakat, partial penalty applies."""
        result = score_translate_to_arabic(
            user_answer="أَنَا مسلم",  # partial harakat
            activity_content={
                "sentences": [
                    {"arabic_expected": "أَنَا مُسْلِم"}  # full harakat
                ]
            },
        )
        # Should get partial penalty (less than 0.8 penalty since some harakat provided)
        assert 0.0 < result["score"] < 0.95


# ===========================================================================
# 4. introduce-characters scoring (keyword match)
# ===========================================================================


class TestIntroduceCharacters:
    """Score `introduce-characters` activities (keyword match ratio)."""

    def test_all_keywords_present(self):
        """Answer containing all expected sentences should score near 1.0."""
        result = score_introduce_characters(
            user_answer="هُوَ مُحَمَّد. هُمَا مُحَمَّدٌ وَعَائِشَةُ. هُمْ مُسْلِمُونَ",
            activity_content={
                "characters": [
                    {
                        "name": "Muhammad",
                        "sentences": [
                            {"arabic_expected": "هُوَ مُحَمَّد"},
                            {"arabic_expected": "هُمَا مُحَمَّدٌ وَعَائِشَةُ"},
                            {"arabic_expected": "هُمْ مُسْلِمُونَ"},
                        ],
                    }
                ]
            },
        )
        assert result["score"] == pytest.approx(1.0, abs=0.05)
        assert "Excellent" in result["feedback"]

    def test_partial_keywords(self):
        """Answer with only some keywords should score between 0 and 1."""
        result = score_introduce_characters(
            user_answer="هُوَ مُحَمَّد",  # only 1 of 3
            activity_content={
                "characters": [
                    {
                        "name": "Muhammad",
                        "sentences": [
                            {"arabic_expected": "هُوَ مُحَمَّد"},
                            {"arabic_expected": "هُمَا مُحَمَّدٌ وَعَائِشَةُ"},
                            {"arabic_expected": "هُمْ مُسْلِمُونَ"},
                        ],
                    }
                ]
            },
        )
        assert 0.0 < result["score"] < 1.0
        assert (
            "character" in result["feedback"].lower()
            or "include" in result["feedback"].lower()
        )

    def test_no_keywords_match(self):
        """Answer with no matching keywords should score near 0."""
        result = score_introduce_characters(
            user_answer="مرحبا بالعالم",  # unrelated
            activity_content={
                "characters": [
                    {
                        "name": "Muhammad",
                        "sentences": [
                            {"arabic_expected": "هُوَ مُحَمَّد"},
                        ],
                    }
                ]
            },
        )
        assert result["score"] < 0.3
        assert "No matching" in result["feedback"]

    def test_empty_user_answer(self):
        """Empty user answer should return score 0.0."""
        result = score_introduce_characters(
            user_answer="",
            activity_content={
                "characters": [
                    {
                        "name": "Muhammad",
                        "sentences": [
                            {"arabic_expected": "هُوَ مُحَمَّد"},
                        ],
                    }
                ]
            },
        )
        assert result["score"] == 0.0
        assert result["feedback"] == "No answer provided."

    def test_missing_character_data_returns_zero(self):
        """No characters key should return score 0.0 with feedback."""
        result = score_introduce_characters(
            user_answer="some text",
            activity_content={},
        )
        assert result["score"] == 0.0
        assert "No character data" in result["feedback"]

    def test_multiple_characters(self):
        """Should aggregate keyword matches across multiple characters."""
        result = score_introduce_characters(
            user_answer="هُوَ مُحَمَّد. هِيَ عَائِشَةُ",
            activity_content={
                "characters": [
                    {
                        "name": "Muhammad",
                        "sentences": [
                            {"arabic_expected": "هُوَ مُحَمَّد"},
                            {"arabic_expected": "هُمَا مُحَمَّدٌ وَعَائِشَةُ"},
                        ],
                    },
                    {
                        "name": "Aisha",
                        "sentences": [
                            {"arabic_expected": "هِيَ عَائِشَةُ"},
                            {"arabic_expected": "هُنَّ مُسْلِمَات"},
                        ],
                    },
                ]
            },
        )
        # Matches 2 of 4 total sentences
        assert 0.0 < result["score"] < 1.0


# ===========================================================================
# 5. role-play scoring (ordered dialogue match)
# ===========================================================================


class TestRolePlay:
    """Score `role-play` activities (ordered dialogue match ratio)."""

    def test_all_elements_present_in_order(self):
        """Answer containing all expected elements in order should score near 1.0."""
        result = score_role_play(
            user_answer="السَّلَامُ عَلَيْكُمْ. أَنَا أحمد. كَيْفَ حَالُكَ؟ اَلْحَمْدُ لِلَّهِ، أَنَا بِخَيْرٍ",
            activity_content={
                "expected_elements": [
                    "Greeting (السَّلَامُ عَلَيْكُمْ)",
                    "Self-introduction (أَنَا ...)",
                    "Asking how they are (كَيْفَ حَالُكَ/حَالُكِ؟)",
                    "Response (اَلْحَمْدُ لِلَّهِ، أَنَا بِخَيْرٍ)",
                ]
            },
        )
        assert result["score"] == pytest.approx(1.0, abs=0.05)
        assert "Excellent" in result["feedback"]

    def test_elements_in_wrong_order(self):
        """Elements in wrong order should score significantly lower."""
        result = score_role_play(
            user_answer="اَلْحَمْدُ لِلَّهِ، أَنَا بِخَيْرٍ. السَّلَامُ عَلَيْكُمْ",
            activity_content={
                "expected_elements": [
                    "Greeting (السَّلَامُ عَلَيْكُمْ)",
                    "Self-introduction (أَنَا ...)",
                    "Asking how they are (كَيْفَ حَالُكَ/حَالُكِ؟)",
                    "Response (اَلْحَمْدُ لِلَّهِ، أَنَا بِخَيْرٍ)",
                ]
            },
        )
        # Has 2 of 4 elements but in wrong order → 2/4 × 0.5 order_bonus = 0.25
        assert result["score"] < 0.5
        assert "Partial" in result["feedback"]

    def test_partial_elements(self):
        """Answer with only some elements should score between 0 and 1."""
        result = score_role_play(
            user_answer="السَّلَامُ عَلَيْكُمْ",  # only 1 of 5
            activity_content={
                "expected_elements": [
                    "Greeting (السَّلَامُ عَلَيْكُمْ)",
                    "Response (وَعَلَيْكُمُ السَّلَام)",
                    "Self-introduction (أَنَا ...)",
                    "Asking how they are (كَيْفَ حَالُكَ/حَالُكِ؟)",
                    "Response (اَلْحَمْدُ لِلَّهِ، أَنَا بِخَيْرٍ)",
                ]
            },
        )
        assert 0.0 < result["score"] < 1.0

    def test_empty_user_answer(self):
        """Empty user answer should return score 0.0."""
        result = score_role_play(
            user_answer="",
            activity_content={
                "expected_elements": [
                    "Greeting (السَّلَامُ عَلَيْكُمْ)",
                ]
            },
        )
        assert result["score"] == 0.0
        assert result["feedback"] == "No answer provided."

    def test_no_matching_elements(self):
        """Answer with no matching elements should score near 0."""
        result = score_role_play(
            user_answer="مرحبا بالعالم",
            activity_content={
                "expected_elements": [
                    "Greeting (السَّلَامُ عَلَيْكُمْ)",
                ]
            },
        )
        assert result["score"] < 0.3
        assert "No matching" in result["feedback"]

    def test_missing_expected_elements_returns_zero(self):
        """No expected_elements key should return score 0.0 with feedback."""
        result = score_role_play(
            user_answer="some text",
            activity_content={},
        )
        assert result["score"] == 0.0
        assert "No expected elements" in result["feedback"]


# ===========================================================================
# 6. Dispatch / routing function
# ===========================================================================


class TestScoreActivity:
    """Test the dispatch/routing function `score_activity`."""

    def test_listen_translate_dispatch(self):
        """Correct algorithm dispatched for listen-translate."""
        result = score_activity(
            activity_type="listen-translate",
            user_answer="Peace be upon you",
            activity_content={
                "dialogue": {"scene1": {"english_expected": "Peace be upon you"}}
            },
        )
        assert "score" in result
        assert "feedback" in result
        assert result["score"] == pytest.approx(1.0)

    def test_translate_to_english_dispatch(self):
        """Correct algorithm dispatched for translate-to-english."""
        result = score_activity(
            activity_type="translate-to-english",
            user_answer="I am a Muslim",
            activity_content={"sentences": [{"english_expected": "I am a Muslim"}]},
        )
        assert "score" in result
        assert "feedback" in result
        assert result["score"] == pytest.approx(1.0)

    def test_translate_to_arabic_dispatch(self):
        """Correct algorithm dispatched for translate-to-arabic."""
        result = score_activity(
            activity_type="translate-to-arabic",
            user_answer="أَنَا مُسْلِم",
            activity_content={"sentences": [{"arabic_expected": "أَنَا مُسْلِم"}]},
        )
        assert "score" in result
        assert "feedback" in result
        assert result["score"] == pytest.approx(1.0)

    def test_introduce_characters_dispatch(self):
        """Correct algorithm dispatched for introduce-characters."""
        result = score_activity(
            activity_type="introduce-characters",
            user_answer="هُوَ مُحَمَّد",
            activity_content={
                "characters": [{"sentences": [{"arabic_expected": "هُوَ مُحَمَّد"}]}]
            },
        )
        assert "score" in result
        assert "feedback" in result
        assert result["score"] == pytest.approx(1.0, abs=0.05)

    def test_role_play_dispatch(self):
        """Correct algorithm dispatched for role-play."""
        result = score_activity(
            activity_type="role-play",
            user_answer="السَّلَامُ عَلَيْكُمْ",
            activity_content={"expected_elements": ["Greeting (السَّلَامُ عَلَيْكُمْ)"]},
        )
        assert "score" in result
        assert "feedback" in result

    def test_unknown_activity_type_returns_error(self):
        """Unknown activity type should return a clear error."""
        result = score_activity(
            activity_type="nonexistent-type",
            user_answer="hello",
            activity_content={},
        )
        assert "error" in result
        assert "Unknown activity type" in result["error"]
        assert "nonexistent-type" in result["error"]

    def test_different_types_produce_different_scores_for_same_input(self):
        """Each activity type dispatches to a different algorithm (different scores for same input)."""
        # Same user answer, same activity_content shape → different algorithms produce different scores
        listen_result = score_activity(
            activity_type="listen-translate",
            user_answer="Peace be upon you",
            activity_content={
                "dialogue": {"scene1": {"english_expected": "Hello world"}}
            },
        )
        roleplay_result = score_activity(
            activity_type="role-play",
            user_answer="Peace be upon you",
            activity_content={"expected_elements": ["Greeting (السَّلَامُ عَلَيْكُمْ)"]},
        )
        # Different algorithms → different scores (one is fuzzy string match, other is ordered dialogue)
        assert listen_result["score"] != roleplay_result["score"]

    def test_dispatch_returns_feedback_for_all_types(self):
        """Every dispatched type returns a 'feedback' string."""
        for activity_type in [
            "listen-translate",
            "translate-to-english",
            "translate-to-arabic",
            "introduce-characters",
            "role-play",
        ]:
            result = score_activity(
                activity_type=activity_type,
                user_answer="test answer",
                activity_content={},
            )
            assert "feedback" in result, (
                f"Dispatch for '{activity_type}' did not return 'feedback'"
            )
            assert isinstance(result["feedback"], str), (
                f"Feedback for '{activity_type}' is not a string"
            )


# ===========================================================================
# 7. Utility functions (harakat handling)
# ===========================================================================


class TestHarakatUtilities:
    """Unit tests for harakat utility functions exposed via scoring functions.

    These test the core Arabic text processing logic: stripping and detecting
    diacritics (harakat/tashkeel).
    """

    def test_strip_harakat_removes_diacritics(self):
        """Text with full harakat should strip to base letters."""
        from content.scoring import _strip_harakat

        result = _strip_harakat("أَنَا مُسْلِم")
        # Harakat (diacritics) are removed but base letters remain
        assert result == "أنا مسلم"  # Unicode U+0623 (أ) is a letter, not a diacritic

    def test_strip_harakat_unchanged_without_diacritics(self):
        """Text without harakat should be unchanged."""
        from content.scoring import _strip_harakat

        result = _strip_harakat("انا مسلم")
        assert result == "انا مسلم"

    def test_strip_harakat_empty_string(self):
        """Empty string should return empty string."""
        from content.scoring import _strip_harakat

        result = _strip_harakat("")
        assert result == ""

    def test_strip_harakat_non_arabic_unchanged(self):
        """Non-Arabic text should pass through unchanged."""
        from content.scoring import _strip_harakat

        result = _strip_harakat("Hello world")
        assert result == "Hello world"

    def test_has_harakat_detects_diacritics(self):
        """Text with harakat should return True."""
        from content.scoring import _has_harakat

        assert _has_harakat("أَنَا مُسْلِم") is True

    def test_has_harakat_no_diacritics(self):
        """Text without harakat should return False."""
        from content.scoring import _has_harakat

        assert _has_harakat("انا مسلم") is False

    def test_has_harakat_empty_string(self):
        """Empty string should return False."""
        from content.scoring import _has_harakat

        assert _has_harakat("") is False

    def test_has_harakat_non_arabic(self):
        """Non-Arabic text should return False."""
        from content.scoring import _has_harakat

        assert _has_harakat("Hello world") is False

    def test_normalize_text_strips_and_lowercases(self):
        """Extra whitespace should be collapsed and text lowercased."""
        from content.scoring import _normalize_text

        result = _normalize_text("  Hello   World  ")
        assert result == "hello world"

    def test_normalize_text_empty_string(self):
        """Empty string should return empty string."""
        from content.scoring import _normalize_text

        result = _normalize_text("")
        assert result == ""

    def test_normalize_text_arabic(self):
        """Arabic text should be whitespace-normalized."""
        from content.scoring import _normalize_text

        result = _normalize_text("  أَنَا   مُسْلِم  ")
        assert result == "أَنَا مُسْلِم"
