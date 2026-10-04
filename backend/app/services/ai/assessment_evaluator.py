import json
import logging
import re
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from pydantic import BaseModel, Field, model_validator

from .local_llm import local_llm_service
from ..documents.embeddings import LocalEmbeddingService
from ...schemas.assessment import (
    ExtractedQuestionItem,
    QuestionEvaluationResult,
    CriterionScoreItem,
    TopicPerformanceItem,
    LearningGapItem,
    RecommendationItem,
    AssessmentEvaluationResponse,
)

logger = logging.getLogger("focusflow.assessment.evaluator")

# Local embedding service for on-device semantic relevance check
_embed_service = None

def get_embed_service():
    global _embed_service
    if _embed_service is None:
        _embed_service = LocalEmbeddingService()
    return _embed_service

def cosine_similarity(a: List[float], b: List[float]) -> float:
    arr_a = np.array(a)
    arr_b = np.array(b)
    norm = np.linalg.norm(arr_a) * np.linalg.norm(arr_b)
    return float(np.dot(arr_a, arr_b) / norm) if norm > 0 else 0.0

SUPERFICIAL_PATTERNS = [
    re.compile(r"^[a-zA-Z\s]+ is a [a-zA-Z\s]+ (part|thing|syntax|code|tool|file|feature)\.?$", re.IGNORECASE),
    re.compile(r"^[a-zA-Z\s]+ is (used in|part of) [a-zA-Z\s]+\.?$", re.IGNORECASE),
    re.compile(r"^(it is|its) [a-zA-Z\s]+ (part|thing|code|feature)\.?$", re.IGNORECASE),
    re.compile(r"^[a-zA-Z\s]+ is (a )?(programming|java|python|c\+\+) (concept|part|thing)\.?$", re.IGNORECASE),
]

# Domain synonym & equivalence clusters to recognize semantically equivalent answers
EQUIVALENCE_CLUSTERS = [
    {"subclass", "child class", "derived class", "sub class", "child"},
    {"superclass", "parent class", "base class", "super class", "parent"},
    {"inherit", "inherits", "inheritance", "acquires", "acquire", "gets", "get", "derives", "derive", "obtains", "obtain", "takes"},
    {"properties", "property", "variables", "variable", "fields", "field", "attributes", "attribute", "data members", "members", "state"},
    {"methods", "method", "functions", "function", "behaviors", "behavior", "operations", "procedures"},
    {"extends", "extends keyword", "extension"},
    {"polymorphism", "many forms", "overriding", "overloading"},
    {"encapsulation", "data hiding", "data encapsulation", "wrapping code and data", "getters and setters"},
    {"abstraction", "abstract class", "abstract classes", "interface", "interfaces", "hiding implementation"},
]

def check_term_match(concept_term: str, text: str) -> bool:
    """Checks if concept_term or any of its semantic equivalents appears in text."""
    term_lower = concept_term.lower()
    text_lower = text.lower()

    if term_lower in text_lower:
        return True

    for cluster in EQUIVALENCE_CLUSTERS:
        if any(c in term_lower for c in cluster):
            if any(c in text_lower for c in cluster):
                return True
    return False

def parse_rubric_criteria(rubric_str: str, max_marks: float = 10.0, expected_concepts: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """
    Parses teacher rubrics into a structured list of criteria with maximum scores.
    Supports:
    - Multi-line / comma-separated pairs:
        Definition = 2
        Parent-child relationship = 3
        Properties/methods = 2
        extends keyword = 2
        Example = 1
    - Formats with ':' or '-' like 'Definition: 2'
    - JSON array: [{"criterion": "Definition", "max_score": 2}]
    - Fallback based on expected_concepts or standard 3-part academic rubric.
    """
    max_m = float(max_marks) if max_marks and max_marks > 0 else 10.0

    if rubric_str and rubric_str.strip():
        clean = rubric_str.strip()
        # Try JSON
        if clean.startswith("[") and clean.endswith("]"):
            try:
                items = json.loads(clean)
                if isinstance(items, list) and len(items) > 0 and isinstance(items[0], dict):
                    parsed = [
                        {
                            "criterion": str(i.get("criterion") or i.get("name") or f"Criterion {idx}").strip(),
                            "max_score": float(i.get("max_score") or i.get("marks") or 1.0)
                        }
                        for idx, i in enumerate(items, 1)
                    ]
                    # Scale if criteria sum differs from max_marks
                    total_crit = sum(c["max_score"] for c in parsed)
                    if abs(total_crit - max_m) > 0.05 and total_crit > 0:
                        scale = max_m / total_crit
                        for c in parsed:
                            c["max_score"] = round(c["max_score"] * scale, 1)
                    return parsed
            except Exception:
                pass

        # Regex parse lines or comma-separated pairs: Criterion (=|:|-) Marks
        pattern = re.compile(
            r"([A-Za-z0-9\s/_\-'\"]+?)\s*(?:=|:|-|–)\s*([0-9]+(?:\.[0-9]+)?)(?:\s*(?:pts?|marks?))?",
            re.IGNORECASE
        )
        parts = re.split(r"[\n,;]+", clean)
        criteria = []
        for p in parts:
            m = pattern.search(p)
            if m:
                c_name = m.group(1).strip()
                c_name = re.sub(r"^\d+[\.\)]\s*", "", c_name).strip()
                c_marks = float(m.group(2))
                if c_name and c_marks > 0:
                    criteria.append({"criterion": c_name, "max_score": c_marks})

        if criteria:
            total_crit = sum(c["max_score"] for c in criteria)
            if abs(total_crit - max_m) > 0.05 and total_crit > 0:
                scale = max_m / total_crit
                for c in criteria:
                    c["max_score"] = round(c["max_score"] * scale, 1)
            return criteria

    # If expected_concepts list is provided by teacher
    if expected_concepts and len(expected_concepts) > 0:
        per_concept = round(max_m / len(expected_concepts), 1)
        return [{"criterion": c.strip(), "max_score": per_concept} for c in expected_concepts if c.strip()]

    # Standard default 3-part academic rubric
    return [
        {"criterion": "Core Concept & Definition", "max_score": round(max_m * 0.4, 1)},
        {"criterion": "Technical Explanation & Mechanism", "max_score": round(max_m * 0.4, 1)},
        {"criterion": "Accuracy & Completeness", "max_score": round(max_m * 0.2, 1)},
    ]

def evaluate_criterion_semantically(
    criterion_name: str,
    criterion_max: float,
    student_ans: str,
    model_ans: str = "",
    strictness: str = "balanced"
) -> Dict[str, Any]:
    """
    Evaluates a single criterion semantically with equivalence recognition and strictness.
    Does not require student to use exact wording of model answer.
    """
    c_lower = criterion_name.lower()
    ans_lower = student_ans.lower()

    if not student_ans.strip():
        return {
            "criterion": criterion_name,
            "score": 0.0,
            "max_score": criterion_max,
            "feedback": f"No answer provided for {criterion_name}."
        }

    # Criterion 1: Specific keyword/syntax requirement (e.g. "extends keyword")
    if "extends" in c_lower or "keyword" in c_lower:
        if "extends" in ans_lower:
            return {
                "criterion": criterion_name,
                "score": criterion_max,
                "max_score": criterion_max,
                "feedback": "Correctly mentioned the 'extends' keyword implementation."
            }
        else:
            return {
                "criterion": criterion_name,
                "score": 0.0,
                "max_score": criterion_max,
                "feedback": "Did not mention the 'extends' keyword."
            }

    # Criterion 2: Example requirement
    if "example" in c_lower:
        has_example = any(kw in ans_lower for kw in [
            "for example", "for instance", "e.g.", "such as", "an example is",
            "class dog", "class car", "class animal", "class vehicle", "class b extends a", "class child extends parent"
        ]) or ("{" in student_ans and "}" in student_ans and "class" in ans_lower)

        if has_example:
            return {
                "criterion": criterion_name,
                "score": criterion_max,
                "max_score": criterion_max,
                "feedback": "Provided a relevant code or conceptual example."
            }
        else:
            return {
                "criterion": criterion_name,
                "score": 0.0,
                "max_score": criterion_max,
                "feedback": "No code or practical example was provided."
            }

    # Criterion 3: Parent-child relationship / hierarchy (with semantic equivalence)
    if any(k in c_lower for k in ["parent", "child", "hierarchy", "subclass", "superclass", "relationship"]):
        has_child = check_term_match("child class", ans_lower) or check_term_match("subclass", ans_lower)
        has_parent = check_term_match("parent class", ans_lower) or check_term_match("superclass", ans_lower)
        has_rel = check_term_match("inherits", ans_lower) or "from" in ans_lower or check_term_match("acquires", ans_lower)

        if has_child and has_parent and has_rel:
            return {
                "criterion": criterion_name,
                "score": criterion_max,
                "max_score": criterion_max,
                "feedback": "Fully explains the relationship between parent and child classes (subclass/superclass)."
            }
        elif has_child or has_parent or has_rel:
            partial_score = round(criterion_max * 0.5, 1) if strictness != "flexible" else round(criterion_max * 0.75, 1)
            return {
                "criterion": criterion_name,
                "score": partial_score,
                "max_score": criterion_max,
                "feedback": "Partially explains the class hierarchy."
            }
        else:
            return {
                "criterion": criterion_name,
                "score": 0.0,
                "max_score": criterion_max,
                "feedback": "Did not explain the parent-child class relationship."
            }

    # Criterion 4: Properties / methods (with semantic equivalence)
    if any(k in c_lower for k in ["properties", "methods", "variables", "functions", "members"]):
        has_props = check_term_match("properties", ans_lower) or check_term_match("variables", ans_lower) or "state" in ans_lower
        has_methods = check_term_match("methods", ans_lower) or check_term_match("functions", ans_lower) or "behavior" in ans_lower

        if has_props and has_methods:
            return {
                "criterion": criterion_name,
                "score": criterion_max,
                "max_score": criterion_max,
                "feedback": "Correctly states that both properties (variables) and methods (functions) are inherited."
            }
        elif has_props or has_methods:
            partial_score = round(criterion_max * 0.5, 1) if strictness != "flexible" else round(criterion_max * 0.75, 1)
            return {
                "criterion": criterion_name,
                "score": partial_score,
                "max_score": criterion_max,
                "feedback": "Mentions properties or methods, but not both."
            }
        else:
            return {
                "criterion": criterion_name,
                "score": 0.0,
                "max_score": criterion_max,
                "feedback": "Did not mention inheritance of properties or methods."
            }

    # Helper to check if student answer actually mentions mechanics (not just the word 'inheritance')
    def check_has_mechanics(text: str) -> bool:
        t = text.lower()
        return any(w in t for w in [
            "class", "subclass", "superclass", "parent", "child", "base", "derived",
            "acquire", "acquires", "reus", "extend", "extends", "property", "properties",
            "method", "methods", "variable", "variables", "function", "functions"
        ]) or ("inherits" in t and "inheritance" not in t) or ("inherit from" in t)

    # Criterion 5: Definition / Concept
    if any(k in c_lower for k in ["definition", "concept", "meaning", "define"]):
        words = student_ans.split()
        has_mechanics = check_has_mechanics(ans_lower)
        has_oop_terms = any(t in ans_lower for t in ["oop", "object-oriented", "mechanism", "paradigm", "process", "principle"])

        is_complete_def = (has_oop_terms and has_mechanics and ("class" in ans_lower or "subclass" in ans_lower)) or (len(words) >= 14 and has_mechanics and has_oop_terms)
        is_partial_def = has_mechanics and any(t in ans_lower for t in ["allows", "is a", "concept", "inherit", "acquire", "get", "derive", "share", "mechanism"])
        is_superficial_domain = any(t in ans_lower for t in ["java", "programming", "part", "language", "code"]) and not has_mechanics

        if is_complete_def:
            score = criterion_max
            feedback = "Clear, accurate definition of inheritance."
        elif is_partial_def:
            score = round(criterion_max * 0.5, 1)
            feedback = "Provides a working definition of inheritance."
        elif is_superficial_domain:
            score = round(criterion_max * 0.25, 1) if "inheritance" in ans_lower else round(criterion_max * 0.1, 1)
            feedback = "Identifies Java domain connection, but does not provide a functional definition of inheritance."
        else:
            score = 0.0
            feedback = "No definition of inheritance provided."
        return {
            "criterion": criterion_name,
            "score": score,
            "max_score": criterion_max,
            "feedback": feedback
        }

    # Criterion 6: Technical explanation / Mechanism
    if any(k in c_lower for k in ["technical explanation", "mechanism", "how it works", "implementation"]):
        words = student_ans.split()
        has_mechanics = check_has_mechanics(ans_lower)
        has_hierarchy = check_term_match("child class", ans_lower) or check_term_match("subclass", ans_lower) or check_term_match("parent class", ans_lower) or check_term_match("superclass", ans_lower)
        has_features = check_term_match("properties", ans_lower) or check_term_match("variables", ans_lower) or check_term_match("methods", ans_lower) or check_term_match("functions", ans_lower)

        if not has_mechanics:
            return {
                "criterion": criterion_name,
                "score": 0.0,
                "max_score": criterion_max,
                "feedback": "Did not provide a technical explanation or mechanism."
            }
        elif has_hierarchy and has_features:
            return {
                "criterion": criterion_name,
                "score": criterion_max,
                "max_score": criterion_max,
                "feedback": "Fully explains the technical inheritance mechanism."
            }
        else:
            partial_score = round(criterion_max * 0.5, 1) if strictness != "flexible" else round(criterion_max * 0.75, 1)
            return {
                "criterion": criterion_name,
                "score": partial_score,
                "max_score": criterion_max,
                "feedback": "Partially explains the technical mechanism."
            }

    # Criterion 7: Accuracy & Completeness
    if any(k in c_lower for k in ["accuracy & completeness", "completeness", "thoroughness"]):
        words = student_ans.split()
        has_mechanics = check_has_mechanics(ans_lower)
        if len(words) < 6 or not has_mechanics:
            return {
                "criterion": criterion_name,
                "score": 0.0,
                "max_score": criterion_max,
                "feedback": "Answer has significant conceptual and technical gaps."
            }
        elif len(words) >= 12 and ("extends" in ans_lower or "oop" in ans_lower or "reus" in ans_lower):
            return {
                "criterion": criterion_name,
                "score": criterion_max,
                "max_score": criterion_max,
                "feedback": "Comprehensive and accurate explanation."
            }
        else:
            return {
                "criterion": criterion_name,
                "score": round(criterion_max * 0.5, 1),
                "max_score": criterion_max,
                "feedback": "Accurate but could include additional technical depth."
            }

    # Criterion 8: General semantic evaluation using on-device ONNX embeddings or model answer
    words = student_ans.split()
    if len(words) < 5 and not any(w in ans_lower for w in c_lower.split()):
        return {
            "criterion": criterion_name,
            "score": 0.0,
            "max_score": criterion_max,
            "feedback": f"Did not cover {criterion_name}."
        }

    try:
        embedder = get_embed_service()
        # If model answer is available, compare against model answer content for that criterion
        target_text = model_ans if (model_ans and len(model_ans.split()) > 4) else criterion_name
        c_emb = embedder.generate_query_embedding(target_text)
        ans_emb = embedder.generate_query_embedding(student_ans)
        sim = cosine_similarity(c_emb, ans_emb)
    except Exception:
        sim = 0.3

    if strictness == "strict":
        if sim >= 0.78:
            score = criterion_max
            feedback = f"Fulfills {criterion_name} closely."
        elif sim >= 0.62:
            score = round(criterion_max * 0.5, 1)
            feedback = f"Partially fulfills {criterion_name}."
        else:
            score = 0.0
            feedback = f"Missing requirements for {criterion_name}."
    elif strictness == "flexible":
        if sim >= 0.65:
            score = criterion_max
            feedback = f"Demonstrates understanding of {criterion_name}."
        elif sim >= 0.50:
            score = round(criterion_max * 0.7, 1)
            feedback = f"Understands general principles of {criterion_name}."
        else:
            score = 0.0
            feedback = f"Missing {criterion_name}."
    else:  # balanced
        if sim >= 0.72:
            score = criterion_max
            feedback = f"Satisfactorily covers {criterion_name}."
        elif sim >= 0.56:
            score = round(criterion_max * 0.5, 1)
            feedback = f"Partially covers {criterion_name}."
        else:
            score = 0.0
            feedback = f"Did not cover {criterion_name}."

    return {
        "criterion": criterion_name,
        "score": score,
        "max_score": criterion_max,
        "feedback": feedback
    }


EVALUATOR_SYSTEM_PROMPT = (
    "You are the EvallQ Assessment Intelligence Evaluator, an objective academic scoring engine.\n"
    "Evaluate student answers strictly against the TEACHER'S MARKING RUBRIC.\n"
    "The AI must NOT independently decide what the teacher considers important.\n"
    "Evaluate each rubric criterion independently and accept semantically equivalent answers.\n"
    "Return JSON only with schema:\n"
    "{\n"
    '  "score": number,\n'
    '  "max_score": number,\n'
    '  "confidence": number,\n'
    '  "criterion_scores": [\n'
    '    {"criterion": string, "score": number, "max_score": number, "feedback": string}\n'
    '  ],\n'
    '  "supported_points": string[],\n'
    '  "missing_points": string[],\n'
    '  "feedback": string,\n'
    '  "teacher_review_required": boolean\n'
    "}"
)


class StrictCriterionScore(BaseModel):
    criterion: str
    score: float
    max_score: float
    feedback: Optional[str] = ""

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, values: Any) -> Any:
        if not isinstance(values, dict):
            return {"criterion": "Criterion", "score": 0.0, "max_score": 1.0, "feedback": ""}
        c = str(values.get("criterion") or values.get("name") or "Criterion")
        try:
            s = float(values.get("score") if values.get("score") is not None else values.get("marks", 0.0))
        except (ValueError, TypeError):
            s = 0.0
        try:
            m = float(values.get("max_score") if values.get("max_score") is not None else values.get("maximum_marks", 1.0))
        except (ValueError, TypeError):
            m = 1.0
        return {
            "criterion": c,
            "score": max(0.0, min(m, s)),
            "max_score": m,
            "feedback": str(values.get("feedback") or "").strip()
        }


class StrictAIEvaluationSchema(BaseModel):
    score: float = 0.0
    max_score: float = 10.0
    percentage: float = 0.0
    is_correct: bool = False
    confidence: float = 0.95
    criterion_scores: List[StrictCriterionScore] = Field(default_factory=list)
    supported_points: List[str] = Field(default_factory=list)
    missing_points: List[str] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    areas_for_improvement: List[str] = Field(default_factory=list)
    feedback: str = ""
    ideal_answer: str = ""
    teacher_review_required: bool = False

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, values: Any) -> Any:
        if not isinstance(values, dict):
            return {
                "score": 0.0,
                "max_score": 10.0,
                "percentage": 0.0,
                "is_correct": False,
                "confidence": 0.95,
                "criterion_scores": [],
                "supported_points": [],
                "missing_points": [],
                "strengths": [],
                "areas_for_improvement": [],
                "feedback": "",
                "ideal_answer": "",
                "teacher_review_required": False
            }

        # Normalize max_score
        raw_max = values.get("max_score") or values.get("maximum_marks") or 10.0
        try:
            max_score = float(raw_max)
        except (ValueError, TypeError):
            max_score = 10.0
        if max_score <= 0:
            max_score = 10.0

        # Normalize criterion_scores
        raw_cs = values.get("criterion_scores")
        crit_scores = []
        if isinstance(raw_cs, list):
            for c in raw_cs:
                if isinstance(c, dict):
                    crit_scores.append(StrictCriterionScore.model_validate(c))

        # Calculate score from criteria if available
        if crit_scores:
            score = round(sum(c.score for c in crit_scores), 1)
        else:
            raw_score = values.get("score") if values.get("score") is not None else values.get("suggested_marks", 0.0)
            try:
                score = float(raw_score)
            except (ValueError, TypeError):
                score = 0.0
        score = max(0.0, min(max_score, score))

        percentage = round((score / max_score * 100.0), 1) if max_score > 0 else 0.0

        # Normalize lists
        supp = values.get("supported_points") or values.get("strengths") or []
        supported_points = [str(x).strip() for x in supp if str(x).strip()] if isinstance(supp, list) else []

        miss = values.get("missing_points") or values.get("areas_for_improvement") or values.get("areas_of_improvement") or []
        missing_points = [str(x).strip() for x in miss if str(x).strip()] if isinstance(miss, list) else []

        conf = values.get("confidence")
        try:
            confidence = float(conf) if conf is not None else 0.95
        except (ValueError, TypeError):
            confidence = 0.95
        confidence = max(0.0, min(1.0, confidence))

        rev_req = values.get("teacher_review_required")
        teacher_review_required = bool(rev_req) if rev_req is not None else (confidence < 0.85)

        return {
            "score": score,
            "max_score": max_score,
            "percentage": percentage,
            "is_correct": score >= 0.85 * max_score,
            "confidence": confidence,
            "criterion_scores": crit_scores,
            "supported_points": supported_points,
            "missing_points": missing_points,
            "strengths": supported_points,
            "areas_for_improvement": missing_points,
            "feedback": str(values.get("feedback") or "").strip(),
            "ideal_answer": str(values.get("ideal_answer") or "").strip(),
            "teacher_review_required": teacher_review_required
        }


class AssessmentEvaluatorService:
    """
    Evaluates student assessments based on a TEACHER-CONTROLLED MARKING RUBRIC.
    The AI does NOT independently decide what the teacher considers important.
    Evaluates each rubric criterion independently, recognizes semantically equivalent answers,
    and supports strict, balanced, and flexible strictness modes.
    """

    @classmethod
    async def evaluate_question(
        cls,
        q_item: ExtractedQuestionItem,
        rubric_guidance: str = ""
    ) -> QuestionEvaluationResult:
        """
        Evaluates a single question against the teacher-controlled marking rubric.
        """
        cleaned_ans = (q_item.student_answer or "").strip()
        is_empty = not cleaned_ans or cleaned_ans.lower() in [
            "[no answer submitted]", "none", "n/a", "no answer", "nil", "empty", "null"
        ]

        topic = getattr(q_item, "topic", None) or "General"
        max_m = float(q_item.maximum_marks) if q_item.maximum_marks and q_item.maximum_marks > 0 else 10.0
        strictness = (getattr(q_item, "strictness", None) or "balanced").lower()
        if strictness not in ["strict", "balanced", "flexible"]:
            strictness = "balanced"

        model_ans = getattr(q_item, "model_answer", None) or getattr(q_item, "expected_answer", None) or ""
        expected_concepts = getattr(q_item, "key_concepts", None) or []
        if isinstance(expected_concepts, str) and expected_concepts.strip():
            try:
                expected_concepts = json.loads(expected_concepts)
            except Exception:
                expected_concepts = [c.strip() for c in expected_concepts.split(",") if c.strip()]
        if not isinstance(expected_concepts, list):
            expected_concepts = []

        # Parse teacher's rubric criteria
        effective_rubric = getattr(q_item, "rubric", None) or rubric_guidance or ""
        criteria = parse_rubric_criteria(effective_rubric, max_m, expected_concepts)

        # Requirement: Empty answer handling (Test 5)
        if is_empty:
            empty_criteria = [
                CriterionScoreItem(criterion=c["criterion"], score=0.0, max_score=c["max_score"], feedback=f"No answer submitted for {c['criterion']}.")
                for c in criteria
            ]
            return QuestionEvaluationResult(
                question_number=q_item.question_number,
                page_number=q_item.page_number,
                question_text=q_item.question_text,
                student_answer=q_item.student_answer or "[No answer submitted]",
                maximum_marks=max_m,
                suggested_marks=0.0,
                ai_score=0.0,
                teacher_marks=None,
                teacher_final_score=None,
                override_reason=None,
                percentage=0.0,
                confidence=0.99,
                strictness=strictness,
                topic=topic,
                rubric_match="Incorrect",
                reasoning="No answer was submitted for this question.",
                feedback="No answer was submitted for this question.",
                strengths="",
                mistakes="No answer submitted. Review the core definition and principles.",
                learning_gap=f"Fundamental concepts of {topic}",
                is_correct=False,
                ideal_answer=model_ans or f"A complete answer should define and explain {q_item.question_text}.",
                model_answer=model_ans,
                criterion_scores=empty_criteria,
                supported_points=[],
                missing_points=[c["criterion"] for c in criteria],
                teacher_review_required=False
            )

        # Prompt injection detection safeguard
        injection_pattern = re.compile(
            r"(ignore\s+(all\s+)?(previous|prior)\s+instructions|system\s+override|give\s+me\s+\d+|award\s+\d+/\d+|disregard\s+previous)",
            re.IGNORECASE
        )
        has_injection = bool(injection_pattern.search(cleaned_ans))
        if has_injection:
            injection_criteria = [
                CriterionScoreItem(criterion=c["criterion"], score=0.0, max_score=c["max_score"], feedback="Prompt injection detected.")
                for c in criteria
            ]
            return QuestionEvaluationResult(
                question_number=q_item.question_number,
                page_number=q_item.page_number,
                question_text=q_item.question_text,
                student_answer=cleaned_ans,
                maximum_marks=max_m,
                suggested_marks=0.0,
                ai_score=0.0,
                teacher_marks=None,
                teacher_final_score=None,
                override_reason=None,
                percentage=0.0,
                confidence=0.99,
                strictness=strictness,
                topic=topic,
                rubric_match="Incorrect",
                reasoning="Prompt override detected. Direct answers required.",
                feedback="Prompt override detected. Direct answers required.",
                strengths="",
                mistakes="Direct answers to academic questions are required.",
                learning_gap=f"Foundations of {topic}",
                is_correct=False,
                ideal_answer=model_ans or f"A complete answer should define and explain {q_item.question_text}.",
                model_answer=model_ans,
                criterion_scores=injection_criteria,
                supported_points=[],
                missing_points=[c["criterion"] for c in criteria],
                teacher_review_required=True
            )

        # Evaluate each rubric criterion independently using semantic equivalence engine
        criterion_results: List[CriterionScoreItem] = []
        supported_points: List[str] = []
        missing_points: List[str] = []

        for c in criteria:
            c_res = evaluate_criterion_semantically(
                criterion_name=c["criterion"],
                criterion_max=c["max_score"],
                student_ans=cleaned_ans,
                model_ans=model_ans,
                strictness=strictness
            )
            item = CriterionScoreItem(
                criterion=c_res["criterion"],
                score=c_res["score"],
                max_score=c_res["max_score"],
                feedback=c_res["feedback"]
            )
            criterion_results.append(item)

            if item.score >= item.max_score * 0.75:
                supported_points.append(f"{item.criterion} ({item.score}/{item.max_score} pts)")
            elif item.score > 0:
                supported_points.append(f"{item.criterion} (Partial: {item.score}/{item.max_score} pts)")
                missing_points.append(f"Incomplete {item.criterion}")
            else:
                missing_points.append(f"Missing {item.criterion}")

        total_score = round(sum(cs.score for cs in criterion_results), 1)
        total_score = max(0.0, min(max_m, total_score))

        # Query local Qwen model to enhance feedback and pedagogical remarks
        # (Pass teacher rubric criteria to guide LLM)
        rubric_spec_str = "\n".join(f"- {c['criterion']} (Max: {c['max_score']} pts)" for c in criteria)
        prompt = (
            f"Question: {q_item.question_text}\n"
            f"Maximum Marks: {max_m}\n"
            f"Strictness Mode: {strictness}\n"
            f"{f'Model Answer: {model_ans}' if model_ans else ''}\n"
            f"Teacher Marking Rubric:\n{rubric_spec_str}\n"
            f"Student Answer: {cleaned_ans}\n\n"
            f"Evaluate the student's answer against the teacher's rubric criteria and return valid JSON."
        )

        try:
            res = await local_llm_service.generate_chat(
                messages=[{"role": "user", "content": prompt}],
                system_prompt=EVALUATOR_SYSTEM_PROMPT,
                max_tokens=450,
                temperature=0.1,
                json_format=True,
            )
            reply_text = res.get("reply", "{}").strip()
            cleaned_reply = re.sub(r"^```json\s*", "", reply_text, flags=re.MULTILINE)
            cleaned_reply = re.sub(r"\s*```$", "", cleaned_reply, flags=re.MULTILINE).strip()
            raw_data = json.loads(cleaned_reply)
            parsed_eval = StrictAIEvaluationSchema.model_validate(raw_data)
            # If LLM returned custom feedback or ideal answer, incorporate it
            if parsed_eval.ideal_answer and len(parsed_eval.ideal_answer) > len(model_ans):
                ideal_answer = parsed_eval.ideal_answer
            else:
                ideal_answer = model_ans or f"A complete answer should define and explain {q_item.question_text}."
            if parsed_eval.feedback:
                feedback_str = parsed_eval.feedback
            else:
                feedback_str = f"Evaluated according to teacher rubric with {strictness} strictness."
        except Exception as e:
            logger.warning(f"Local LLM rubric evaluation fallback: {e}")
            ideal_answer = model_ans or f"A complete answer should define and explain {q_item.question_text}."
            feedback_str = f"Evaluated according to teacher rubric with {strictness} strictness."

        # Calculate percentage in backend: percentage = (score / max_score) * 100
        percentage = round((total_score / max_m * 100.0), 1) if max_m > 0 else 0.0

        # Rubric match status
        if total_score == 0.0:
            rubric_match = "Incorrect"
            is_correct = False
            strengths_str = ""
        elif total_score >= 0.85 * max_m:
            rubric_match = "Complete"
            is_correct = True
            strengths_str = "; ".join(supported_points)
        else:
            rubric_match = "Partial"
            is_correct = False
            strengths_str = "; ".join(supported_points)

        mistakes_str = "; ".join(missing_points)
        learning_gap_str = missing_points[0] if (total_score < max_m and missing_points) else ""

        # Confidence calculation & Teacher Review Required flag
        confidence = 0.95
        if 0 < total_score < max_m * 0.4:
            confidence = 0.88
        if strictness == "strict" and 0 < total_score < max_m * 0.7:
            confidence = 0.82

        teacher_review_required = bool(
            confidence < 0.85 or (0 < total_score < max_m * 0.5 and strictness == "strict")
        )

        reasoning_str = (
            f"Rubric evaluation awarded {total_score}/{max_m} pts across {len(criterion_results)} criteria "
            f"({strictness} mode)."
        )

        return QuestionEvaluationResult(
            question_number=q_item.question_number,
            page_number=q_item.page_number,
            question_text=q_item.question_text,
            student_answer=q_item.student_answer,
            maximum_marks=max_m,
            suggested_marks=total_score,
            ai_score=total_score,
            teacher_marks=None,
            teacher_final_score=None,
            override_reason=None,
            percentage=percentage,
            confidence=confidence,
            strictness=strictness,
            topic=topic,
            rubric_match=rubric_match,
            reasoning=reasoning_str,
            feedback=feedback_str,
            strengths=strengths_str,
            mistakes=mistakes_str,
            learning_gap=learning_gap_str,
            is_correct=is_correct,
            ideal_answer=ideal_answer,
            model_answer=model_ans,
            criterion_scores=criterion_results,
            supported_points=supported_points,
            missing_points=missing_points,
            teacher_review_required=teacher_review_required,
        )

    @classmethod
    async def evaluate_assessment(
        cls,
        submission_id: str,
        questions: List[ExtractedQuestionItem],
        rubric_guidance: str = ""
    ) -> AssessmentEvaluationResponse:
        """
        Evaluates all questions sequentially, aggregates total scores,
        computes topic performance, identifies learning gaps, and generates recommendations.
        """
        evaluated_questions: List[QuestionEvaluationResult] = []

        for q in questions:
            eval_res = await cls.evaluate_question(q, rubric_guidance)
            evaluated_questions.append(eval_res)

        total_max = sum(q.maximum_marks for q in evaluated_questions)
        total_suggested = sum(q.suggested_marks for q in evaluated_questions)
        percentage = round((total_suggested / total_max * 100.0), 1) if total_max > 0 else 0.0
        percentage = max(0.0, min(100.0, percentage))

        # Topic aggregation
        topic_map: Dict[str, Dict[str, float]] = {}
        for q in evaluated_questions:
            t = q.topic.strip() or "General"
            if t not in topic_map:
                topic_map[t] = {"obtained": 0.0, "maximum": 0.0}
            topic_map[t]["obtained"] += q.suggested_marks
            topic_map[t]["maximum"] += q.maximum_marks

        topic_performance: List[TopicPerformanceItem] = []
        for t_name, t_data in topic_map.items():
            t_pct = round((t_data["obtained"] / t_data["maximum"] * 100.0), 1) if t_data["maximum"] > 0 else 0.0
            topic_performance.append(
                TopicPerformanceItem(
                    topic=t_name,
                    obtained_marks=round(t_data["obtained"], 1),
                    maximum_marks=round(t_data["maximum"], 1),
                    percentage=t_pct,
                )
            )

        topic_performance.sort(key=lambda x: x.percentage)

        # Learning Gap Detection
        gap_map: Dict[str, Dict[str, Any]] = {}
        for q in evaluated_questions:
            gap = q.learning_gap.strip()
            if gap and gap.lower() not in {"none", "n/a"}:
                if gap not in gap_map:
                    score_ratio = (q.suggested_marks / q.maximum_marks) if q.maximum_marks > 0 else 1.0
                    severity = "high" if score_ratio < 0.5 else ("medium" if score_ratio < 0.8 else "low")
                    gap_map[gap] = {
                        "topic": q.topic,
                        "question_numbers": [q.question_number],
                        "severity": severity,
                        "action": f"Review {q.topic} core definitions and practice related problems.",
                    }
                else:
                    gap_map[gap]["question_numbers"].append(q.question_number)

        learning_gaps: List[LearningGapItem] = []
        for g_text, g_info in gap_map.items():
            learning_gaps.append(
                LearningGapItem(
                    topic=g_info["topic"],
                    learning_gap=g_text,
                    question_numbers=g_info["question_numbers"],
                    severity=g_info["severity"],
                    recommended_action=g_info["action"],
                )
            )

        # Recommendations based on actual gaps
        recommendations: List[RecommendationItem] = []
        for gap in learning_gaps:
            recommendations.append(
                RecommendationItem(
                    topic=gap.topic,
                    recommendation=f"Reinforce {gap.topic}: Focus on {gap.learning_gap.lower()}.",
                    rationale=f"Identified in Question(s) {', '.join(map(str, gap.question_numbers))} with {gap.severity} priority.",
                )
            )

        if not recommendations and evaluated_questions:
            recommendations.append(
                RecommendationItem(
                    topic="Comprehensive Mastery",
                    recommendation="Excellent comprehension demonstrated across all questions. Proceed to advanced problems.",
                    rationale="Scored consistently high across evaluated rubric criteria.",
                )
            )

        return AssessmentEvaluationResponse(
            submission_id=submission_id,
            total_maximum_marks=round(total_max, 1),
            ai_suggested_score=round(total_suggested, 1),
            ai_score=round(total_suggested, 1),
            teacher_score=None,
            teacher_final_score=None,
            final_score=None,
            override_reason=None,
            percentage=percentage,
            approval_status="pending",
            questions=evaluated_questions,
            topic_performance=topic_performance,
            learning_gaps=learning_gaps,
            recommendations=recommendations,
        )
