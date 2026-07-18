"""Learning Module — lesson and activity management.

Exports ``LessonService`` which encapsulates:
  - ``list_lessons()`` — lesson summaries with resolved status.
  - ``get_lesson()`` — full lesson detail with progress.
  - ``submit_activity()`` — answer submission with scoring and persistence.

All business logic (status resolution, sequential unlocking, attempt
counting, scoring dispatch, progress persistence) lives here.

Usage::

    from learning import LessonService

    service = LessonService(db_path)
    summaries = service.list_lessons()
    detail = service.get_lesson(lesson_id=1)
    result = service.submit_activity(lesson_id=1, activity_id=2, answer="...")
"""

from __future__ import annotations

import json


class LessonService:
    """High-level lesson management interface.

    Parameters
    ----------
    db_path : str
        Path to the SQLite database file (``lughat.db``).
    """

    def __init__(self, db_path: str) -> None:
        self.db_path = db_path

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def list_lessons(self) -> list[dict]:
        """Return lesson summaries with status resolved from user_progress.

        Returns
        -------
        list[dict]
            ``[{id, level, sequence, title, competency_count,
               section_count, status}, ...]`` sorted by level then
            sequence.  Returns ``[]`` when no lessons exist.

        Raises
        ------
        HTTPException
            500 when SQLite query fails.
        """
        from fastapi import HTTPException
        import sqlite3

        from db.safety import apply_safety_pragmas

        try:
            conn = sqlite3.connect(self.db_path)
            apply_safety_pragmas(conn)
            rows = conn.execute(
                "SELECT id, level, sequence, title, competency_count, "
                "section_count, activity_count "
                "FROM lessons ORDER BY level ASC, sequence ASC"
            ).fetchall()

            if not rows:
                return []

            progress_rows = conn.execute(
                "SELECT lesson_id, activity_id, status FROM user_progress"
            ).fetchall()

            lesson_activity_statuses = {}
            for lesson_id, activity_id, status in progress_rows:
                if lesson_id not in lesson_activity_statuses:
                    lesson_activity_statuses[lesson_id] = {}
                lesson_activity_statuses[lesson_id][activity_id] = status

            sorted_rows = sorted(rows, key=lambda r: (r[1].lower(), r[2]))

            first_lesson_ids = set()
            seen_levels = set()
            for row in sorted_rows:
                lesson_id, level = row[0], row[1]
                level_key = level.lower()
                if level_key not in seen_levels:
                    seen_levels.add(level_key)
                    first_lesson_ids.add(lesson_id)

            summaries = []
            for i, row in enumerate(sorted_rows):
                (
                    lesson_id,
                    level,
                    sequence,
                    title,
                    competency_count,
                    section_count,
                    activity_count,
                ) = row

                activity_statuses = lesson_activity_statuses.get(lesson_id, {})
                all_completed = activity_statuses and all(
                    s == "completed" for s in activity_statuses.values()
                )

                if all_completed:
                    status = "completed"
                elif lesson_id in first_lesson_ids:
                    status = "available"
                else:
                    status = "locked"
                    if i > 0:
                        prev_row = sorted_rows[i - 1]
                        prev_level = prev_row[1]
                        if prev_level.lower() == level.lower():
                            prev_id = prev_row[0]
                            prev_statuses = lesson_activity_statuses.get(prev_id, {})
                            if prev_statuses and all(
                                s == "completed" for s in prev_statuses.values()
                            ):
                                status = "available"

                summaries.append(
                    {
                        "id": lesson_id,
                        "level": level,
                        "sequence": sequence,
                        "title": title,
                        "competency_count": competency_count,
                        "section_count": section_count,
                        "status": status,
                    }
                )

            return summaries
        except Exception as e:
            # Re-raise HTTPException as-is (404, 403), wrap others as 500.
            if isinstance(e, HTTPException):
                raise
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            if "conn" in dir():
                conn.close()

    def get_lesson(self, lesson_id: int) -> dict:
        """Return full lesson data with progress.

        Returns
        -------
        dict
            Full lesson JSON with competencies, sections, activities,
            and progress data.

        Raises
        ------
        HTTPException
            404 for non-existent lesson IDs.
            403 for locked lessons.
            500 when SQLite query fails.
        """
        from fastapi import HTTPException
        import sqlite3

        from db.safety import apply_safety_pragmas

        try:
            conn = sqlite3.connect(self.db_path)
            apply_safety_pragmas(conn)

            row = conn.execute(
                "SELECT id, level, sequence, title, competency_count, "
                "section_count, activity_count, competencies, sections, "
                "activities "
                "FROM lessons WHERE id = ?",
                (lesson_id,),
            ).fetchone()

            if not row:
                raise HTTPException(
                    status_code=404,
                    detail=f"Lesson with id {lesson_id} not found",
                )

            (
                lesson_id_val,
                level,
                sequence,
                title,
                competency_count,
                section_count,
                activity_count,
                competencies_json,
                sections_json,
                activities_json,
            ) = row

            competencies = json.loads(competencies_json) if competencies_json else []
            sections = json.loads(sections_json) if sections_json else []
            activities = json.loads(activities_json) if activities_json else []

            progress_rows = conn.execute(
                "SELECT lesson_id, activity_id, score, status, attempts "
                "FROM user_progress WHERE lesson_id = ?",
                (lesson_id_val,),
            ).fetchall()

            activity_progress = {}
            for p_lesson_id, activity_id, score, status, attempts in progress_rows:
                activity_progress[str(activity_id)] = {
                    "score": score if score is not None else 0,
                    "status": status,
                    "attempts": attempts if attempts is not None else 0,
                }

            lesson_status = self._resolve_lesson_status(
                activity_count, activity_progress
            )

            if lesson_status == "locked":
                raise HTTPException(
                    status_code=403,
                    detail=(
                        "This lesson is locked. Complete previous lessons to unlock."
                    ),
                )

            return {
                "id": lesson_id_val,
                "level": level,
                "sequence": sequence,
                "title": title,
                "competencies": competencies,
                "sections": sections,
                "activities": activities,
                "progress": {
                    "status": lesson_status,
                    "activities": activity_progress,
                },
            }
        except Exception as e:
            # Re-raise HTTPException as-is (404, 403), wrap others as 500.
            if isinstance(e, HTTPException):
                raise
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            if "conn" in dir():
                conn.close()

    def submit_activity(
        self,
        lesson_id: int,
        activity_id: int,
        answer: str,
    ) -> dict:
        """Submit an answer for an activity and get a score.

        Returns
        -------
        dict
            ``{score, feedback, attempts_remaining, activity_complete,
              competency_impact, correct_answer}``

        Raises
        ------
        HTTPException
            404 for non-existent lesson/activity.
            403 for locked lessons.
            429 when max attempts exhausted.
            500 for unknown activity types or scoring errors.
        """
        from fastapi import HTTPException
        import sqlite3

        from db.safety import apply_safety_pragmas

        try:
            conn = sqlite3.connect(self.db_path)
            apply_safety_pragmas(conn)

            # 1. Fetch the lesson.
            lesson_row = conn.execute(
                "SELECT id, level, sequence, title, competency_count, "
                "section_count, activity_count, competencies, sections, "
                "activities "
                "FROM lessons WHERE id = ?",
                (lesson_id,),
            ).fetchone()

            if not lesson_row:
                raise HTTPException(
                    status_code=404,
                    detail=f"Lesson with id {lesson_id} not found",
                )

            (
                l_lesson_id,
                level,
                sequence,
                title,
                competency_count,
                section_count,
                activity_count,
                competencies_json,
                sections_json,
                activities_json,
            ) = lesson_row

            activities = json.loads(activities_json) if activities_json else []

            activity = None
            for act in activities:
                if isinstance(act, dict) and act.get("id") == activity_id:
                    activity = act
                    break

            if activity is None:
                raise HTTPException(
                    status_code=404,
                    detail=(
                        f"Activity with id {activity_id} not found in "
                        f"lesson {lesson_id}"
                    ),
                )

            # 2. Check if the lesson is locked.
            progress_rows = conn.execute(
                "SELECT lesson_id, activity_id, score, status, attempts "
                "FROM user_progress WHERE lesson_id = ?",
                (lesson_id,),
            ).fetchall()

            activity_progress = {}
            for p_lesson_id, a_id, score, status, attempts in progress_rows:
                activity_progress[str(a_id)] = {
                    "score": score if score is not None else 0,
                    "status": status,
                    "attempts": attempts if attempts is not None else 0,
                }

            lesson_status = self._resolve_lesson_status(
                activity_count, activity_progress
            )

            if lesson_status == "locked":
                raise HTTPException(
                    status_code=403,
                    detail=(
                        "This lesson is locked. Complete previous lessons to unlock."
                    ),
                )

            # 3. Check max attempts.
            max_attempts = activity.get("max_attempts", 3)
            activity_str_id = str(activity_id)
            existing_progress = activity_progress.get(activity_str_id, {})
            current_attempts = existing_progress.get("attempts", 0)
            current_status = existing_progress.get("status", "available")

            if current_status == "completed":
                remaining_attempts = 0
                activity_complete = True
            elif current_attempts >= max_attempts:
                remaining_attempts = 0
                activity_complete = True
            else:
                remaining_attempts = max_attempts - current_attempts
                activity_complete = False

            # 4. Score the answer.
            from content.scoring import score_activity

            activity_type = activity.get("type", "")
            activity_content = activity.get("content", {})

            scoring_result = score_activity(
                activity_type=activity_type,
                user_answer=answer,
                activity_content=activity_content,
            )

            if "error" in scoring_result:
                raise HTTPException(
                    status_code=500,
                    detail=scoring_result["error"],
                )

            score = scoring_result["score"]
            feedback = scoring_result["feedback"]

            # 5. Compute competency_impact.
            competency_map = activity.get("competency_map", {})
            competency_impact = {}
            for comp_name, weight in competency_map.items():
                competency_impact[comp_name] = round(weight, 4)

            completion_threshold = 0.7
            if score >= completion_threshold:
                activity_complete = True

            response_data = {
                "score": score,
                "feedback": feedback,
                "attempts_remaining": remaining_attempts,
                "activity_complete": activity_complete,
                "competency_impact": competency_impact,
            }

            if current_attempts >= max_attempts:
                correct_answer = _extract_correct_answer(activity)
                response_data["correct_answer"] = correct_answer

            # 6. Persist the score.
            if current_attempts < max_attempts and current_status != "completed":
                new_attempts = current_attempts + 1
                existing_score = existing_progress.get("score", 0)
                best_score = max(existing_score, score)

                if score >= completion_threshold:
                    new_status = "completed"
                elif new_attempts >= max_attempts:
                    new_status = "completed"
                else:
                    new_status = "in_progress"

                conn.execute(
                    "INSERT INTO user_progress "
                    "(lesson_id, activity_id, score, status, attempts) "
                    "VALUES (?, ?, ?, ?, ?) "
                    "ON CONFLICT(lesson_id, activity_id) "
                    "DO UPDATE SET "
                    "  score = MAX(user_progress.score, ?), "
                    "  status = ?, "
                    "  attempts = ?",
                    (
                        lesson_id,
                        activity_id,
                        best_score,
                        new_status,
                        new_attempts,
                        best_score,
                        new_status,
                        new_attempts,
                    ),
                )
                conn.commit()

            from fastapi.responses import JSONResponse

            if current_attempts >= max_attempts:
                return JSONResponse(
                    status_code=429,
                    content=response_data,
                )

            return response_data

        except Exception as e:
            # Re-raise HTTPException as-is (404, 403), wrap others as 500.
            if isinstance(e, HTTPException):
                raise
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            if "conn" in dir():
                conn.close()

    # ------------------------------------------------------------------
    # Internal helpers (shared by all public methods)
    # ------------------------------------------------------------------

    @staticmethod
    def _resolve_lesson_status(
        activity_count: int,
        activity_progress: dict,
    ) -> str:
        """Resolve the overall status for a lesson from its activity progress.

        Parameters
        ----------
        activity_count : int
            Number of activities in this lesson (from lessons table).
        activity_progress : dict
            ``{activityId: {score, status, attempts}, ...}``

        Returns
        -------
        str
            One of ``"locked"``, ``"available"``, ``"in_progress"``,
            ``"completed"``.
        """
        if activity_count == 0:
            return "available"
        if activity_progress:
            statuses = [ap["status"] for ap in activity_progress.values()]
            all_completed = all(s == "completed" for s in statuses)
            has_any_attempt = any(
                ap["attempts"] > 0 for ap in activity_progress.values()
            )

            if all_completed:
                return "completed"
            if has_any_attempt:
                return "in_progress"
            return statuses[0] if statuses else "locked"
        return "locked"


def _extract_correct_answer(activity: dict) -> str:
    """Extract the correct answer from an activity's content.

    Returns a human-readable correct answer string based on the
    activity type.

    Parameters
    ----------
    activity : dict
        The activity dict from lesson JSON (contains ``type`` and
        ``content`` keys).

    Returns
    -------
    str
        The correct answer, or empty string if not determinable.
    """
    activity_type = activity.get("type", "")
    content = activity.get("content", {})

    if activity_type == "listen-translate":
        dialogue = content.get("dialogue", {})
        if dialogue:
            translations = []
            for scene_key, scene_data in dialogue.items():
                if isinstance(scene_data, dict) and "english_expected" in scene_data:
                    translations.append(scene_data["english_expected"])
            if translations:
                return " | ".join(translations)
        return content.get("english_expected", "")

    elif activity_type == "translate-to-english":
        sentences = content.get("sentences", [])
        if sentences:
            expected = [
                s["english_expected"]
                for s in sentences
                if isinstance(s, dict) and "english_expected" in s
            ]
            return " | ".join(expected)
        return content.get("english_expected", "")

    elif activity_type == "translate-to-arabic":
        sentences = content.get("sentences", [])
        if sentences:
            expected = [
                s["arabic_expected"]
                for s in sentences
                if isinstance(s, dict) and "arabic_expected" in s
            ]
            return " | ".join(expected)
        return content.get("arabic_expected", "")

    elif activity_type == "introduce-characters":
        characters = content.get("characters", [])
        if characters:
            expected = []
            for char_data in characters:
                if isinstance(char_data, dict):
                    sentences = char_data.get("sentences", [])
                    for sent in sentences:
                        if isinstance(sent, dict) and "arabic_expected" in sent:
                            expected.append(sent["arabic_expected"])
            return " | ".join(expected)
        return ""

    elif activity_type == "role-play":
        expected_elements = content.get("expected_elements", [])
        if expected_elements:
            return " | ".join(str(e) for e in expected_elements)
        return ""

    return ""
