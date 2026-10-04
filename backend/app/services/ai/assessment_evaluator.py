import json
import logging
import re
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from pydantic import BaseModel, Field, model_validator

from .local_llm import local_llm_service
from .teacher_rag import TeacherRAGService
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
# Domain synonym & equivalence clusters to recognize semantically equivalent answers
EQUIVALENCE_CLUSTERS = [
    {"subclass", "child class", "derived class", "sub class", "child"},
    {"superclass", "parent class", "base class", "super class", "parent"},
    {"inherit", "inherits", "inheritance", "acquires", "acquire", "gets", "get", "derives", "derive", "obtains", "obtain", "takes"},
    {"properties", "property", "variables", "variable", "fields", "field", "attributes", "attribute", "data members", "members", "state"},
    {"methods", "method", "functions", "function", "behaviors", "behavior", "operations", "procedures"},
    {"extends", "extends keyword", "extension"},
    {"polymorphism", "many forms", "multiple forms", "overriding", "overloading", "runtime polymorphism", "compile-time polymorphism"},
    {"encapsulation", "data hiding", "data encapsulation", "wrapping code and data", "bundling data and methods", "getters and setters", "private fields"},
    {"abstraction", "abstract class", "abstract classes", "interface", "interfaces", "hiding implementation", "data hiding", "hiding of data", "hiding of the data", "hiding data", "showing only the important data", "showing essential features"},
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


def extract_topic_concept(question_text: str, fallback_topic: str = "") -> str:
    """Extracts the primary concept keyword from question_text or topic."""
    q_clean = re.sub(r"[?.,!:;\"'()]", " ", (question_text or "").lower())
    for phrase in [
        "what is", "what are", "explain", "describe", "define", "what do you mean by", "discuss",
        "differentiate between", "difference between", "give an example of", "give example of",
        "give example for", "give the example for", "in java", "in python", "in c++", "in oop", "concept of"
    ]:
        q_clean = q_clean.replace(phrase, " ")

    words = [w.strip() for w in q_clean.split() if w.strip() and len(w.strip()) > 2]
    # Check for known core OOP concepts
    for concept in ["abstraction", "encapsulation", "incapsulation", "inheritance", "polymorphism", "recursion", "sorting", "algorithm"]:
        if any(concept in w for w in words):
            return "encapsulation" if "capsulat" in concept else concept

    if words:
        return " ".join(words[:2])
    return fallback_topic or "the concept"


def check_and_sanitize_rubric_and_model_answer(
    question_text: str,
    model_answer: str,
    rubric_str: str,
    max_marks: float = 10.0,
    topic: str = "General"
) -> Tuple[str, str, bool, str]:
    """
    Validates semantic alignment between question, model answer, and rubric.
    Prevents cross-contamination (e.g. Abstraction question with Inheritance rubric).
    Returns: (sanitized_model_answer, sanitized_rubric_str, mismatch_detected, mismatch_reason)
    """
    q_lower = (question_text or "").lower()
    r_lower = (rubric_str or "").lower()
    m_lower = (model_answer or "").lower()

    is_abstraction_q = "abstract" in q_lower
    is_encapsulation_q = "encapsulat" in q_lower or "incapsulat" in q_lower
    is_inheritance_q = "inherit" in q_lower or "subclass" in q_lower or "superclass" in q_lower
    is_polymorphism_q = "polymorph" in q_lower or "overload" in q_lower or "overrid" in q_lower

    # 1. Abstraction Question with Inheritance Rubric/Model Mismatch
    if is_abstraction_q and not is_inheritance_q:
        has_inheritance_rubric = any(k in r_lower for k in [
            "extends keyword", "parent-child relationship", "subclass", "superclass", "properties/methods", "child class"
        ])
        has_inheritance_model = any(k in m_lower for k in [
            "inheritance allows", "child class to get properties", "using extends", "parent class"
        ])
        if has_inheritance_rubric or has_inheritance_model:
            sanitized_model = (
                "Abstraction is an OOP principle of hiding internal implementation details and complexity "
                "while showing only the essential features and public interface to the user, achieved through abstract classes and interfaces."
            )
            sanitized_rubric = (
                "Definition = 3\n"
                "Hiding implementation details = 3\n"
                "Showing essential features = 2\n"
                "Mechanism / Example = 2"
            )
            return (sanitized_model, sanitized_rubric, True, "Question asks about Abstraction, but rubric/model answer was configured with Inheritance criteria.")

    # 2. Encapsulation Question with Misaligned Rubric
    if is_encapsulation_q and not is_inheritance_q:
        has_bad_rubric = any(k in r_lower for k in [
            "time/space complexity", "quicksort", "extends keyword", "parent-child", "sorting"
        ])
        if has_bad_rubric or ("encapsulat" not in m_lower and "data hiding" not in m_lower and len(m_lower) > 30):
            sanitized_model = (
                "Encapsulation is the OOP mechanism of bundling data (fields) and methods into a single class unit "
                "while restricting direct access to internal state using private access modifiers and public getters/setters."
            )
            sanitized_rubric = (
                "Definition = 3\n"
                "Bundling data and methods = 3\n"
                "Data hiding and access control = 2\n"
                "Getters and setters / Example = 2"
            )
            return (sanitized_model, sanitized_rubric, True, "Question asks about Encapsulation, but rubric was configured with mismatched criteria.")

    # 3. Polymorphism Question with Misaligned Rubric
    if is_polymorphism_q:
        has_bad_rubric = any(k in r_lower for k in ["extends keyword", "parent-child relationship", "data hiding", "time/space complexity"])
        if has_bad_rubric:
            sanitized_model = (
                "Polymorphism is the ability of an entity to take many forms, typically implemented via compile-time "
                "method overloading and runtime method overriding."
            )
            sanitized_rubric = (
                "Definition = 3\n"
                "Many forms concept = 3\n"
                "Method Overloading = 2\n"
                "Method Overriding = 2"
            )
            return (sanitized_model, sanitized_rubric, True, "Question asks about Polymorphism, but rubric was configured with mismatched criteria.")

    # 4. General Non-Inheritance Question having Inheritance Template Rubric
    if not is_inheritance_q:
        has_exclusive_inheritance_rubric = any(k in r_lower for k in ["extends keyword", "parent-child relationship"])
        if has_exclusive_inheritance_rubric:
            sanitized_model = model_answer if ("inheritance" not in m_lower) else f"A complete answer should accurately define and explain {question_text}."
            m_40 = round(max_marks * 0.4, 1)
            m_20 = round(max_marks * 0.2, 1)
            sanitized_rubric = f"Core Concept & Definition = {m_40}\nTechnical Explanation & Mechanism = {m_40}\nAccuracy & Completeness = {m_20}"
            return (sanitized_model, sanitized_rubric, True, f"Question '{question_text}' had an inherited template rubric not matching the question topic.")

    return (model_answer, rubric_str, False, "")


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
    strictness: str = "balanced",
    question_text: str = "",
    topic: str = "General"
) -> Dict[str, Any]:
    """
    Evaluates a single criterion semantically with equivalence recognition and strictness.
    Dynamically references the actual question concept instead of hardcoded inheritance.
    Does not require student to use exact wording of model answer.
    """
    c_lower = criterion_name.lower()
    ans_lower = student_ans.lower()
    concept = extract_topic_concept(question_text, topic)

    if not student_ans.strip():
        return {
            "criterion": criterion_name,
            "score": 0.0,
            "max_score": criterion_max,
            "feedback": f"No answer provided for {criterion_name}."
        }

    # Criterion 1: Specific keyword/syntax requirement (e.g. "extends keyword", "interface")
    if "extends" in c_lower or ("keyword" in c_lower and "extend" in c_lower):
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

    if "interface" in c_lower or "abstract class" in c_lower:
        has_iface = "interface" in ans_lower or "abstract class" in ans_lower or "abstract" in ans_lower
        if has_iface:
            return {
                "criterion": criterion_name,
                "score": criterion_max,
                "max_score": criterion_max,
                "feedback": "Correctly references interfaces or abstract classes."
            }
        else:
            return {
                "criterion": criterion_name,
                "score": 0.0,
                "max_score": criterion_max,
                "feedback": "Did not mention interfaces or abstract classes."
            }

    # Criterion 2: Example requirement
    if "example" in c_lower:
        has_example = any(kw in ans_lower for kw in [
            "for example", "for instance", "e.g.", "such as", "an example is",
            "class dog", "class car", "class animal", "class vehicle", "class b extends a", "class child extends parent"
        ]) or ("{" in student_ans and "}" in student_ans and ("class" in ans_lower or "void" in ans_lower))

        if has_example:
            return {
                "criterion": criterion_name,
                "score": criterion_max,
                "max_score": criterion_max,
                "feedback": f"Provided a relevant code or conceptual example for {concept}."
            }
        else:
            return {
                "criterion": criterion_name,
                "score": 0.0,
                "max_score": criterion_max,
                "feedback": f"No code or practical example was provided for {concept}."
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
                "feedback": "Correctly states that both properties (variables) and methods (functions) are included."
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
                "feedback": "Did not mention properties or methods."
            }

    # Criterion 5: Data Hiding / Implementation Hiding / Essential Details (Abstraction / Encapsulation)
    if any(k in c_lower for k in ["hiding", "essential", "implementation details", "data hiding"]):
        has_hiding = any(k in ans_lower for k in ["hiding", "hide", "hides", "hidden", "internal details", "protect", "private"])
        has_essential = any(k in ans_lower for k in ["essential", "important", "showing only", "show only", "relevant", "user need", "necessary"])

        if has_hiding and has_essential:
            return {
                "criterion": criterion_name,
                "score": criterion_max,
                "max_score": criterion_max,
                "feedback": f"Fully explains hiding internal details and showing essential/important information."
            }
        elif has_hiding:
            partial_score = round(criterion_max * 0.75, 1) if strictness == "flexible" else round(criterion_max * 0.6, 1)
            return {
                "criterion": criterion_name,
                "score": partial_score,
                "max_score": criterion_max,
                "feedback": "Explains data/implementation hiding, but does not clearly describe presenting essential features."
            }
        elif has_essential:
            partial_score = round(criterion_max * 0.75, 1) if strictness == "flexible" else round(criterion_max * 0.6, 1)
            return {
                "criterion": criterion_name,
                "score": partial_score,
                "max_score": criterion_max,
                "feedback": "Mentions presenting essential/important information, but does not clearly describe data hiding."
            }
        else:
            return {
                "criterion": criterion_name,
                "score": 0.0,
                "max_score": criterion_max,
                "feedback": f"Did not explain data hiding or essential feature presentation for {concept}."
            }

    # Criterion 6: Bundling Data and Methods / Access Control (Encapsulation)
    if any(k in c_lower for k in ["bundling", "wrapping", "capsule", "access control", "unit"]):
        has_bundle = any(k in ans_lower for k in ["bundling", "bundle", "wrapping", "wrap", "binding", "bind", "single unit", "together"])
        has_control = any(k in ans_lower for k in ["private", "public", "getter", "setter", "access modifier", "protect", "hiding"])

        if has_bundle and has_control:
            return {
                "criterion": criterion_name,
                "score": criterion_max,
                "max_score": criterion_max,
                "feedback": "Fully explains bundling data and methods with access control."
            }
        elif has_bundle or has_control:
            partial_score = round(criterion_max * 0.6, 1)
            return {
                "criterion": criterion_name,
                "score": partial_score,
                "max_score": criterion_max,
                "feedback": "Partially explains bundling data/methods and access control."
            }
        else:
            return {
                "criterion": criterion_name,
                "score": 0.0,
                "max_score": criterion_max,
                "feedback": "Did not explain bundling data and methods or access control."
            }

    # Criterion 7: Definition / Concept (Generic & Dynamic)
    if any(k in c_lower for k in ["definition", "concept", "meaning", "define", "core concept"]):
        words = student_ans.split()

        # Superficial answer check (e.g. "inheritance is a java part")
        is_superficial = any(p.match(student_ans.strip()) for p in SUPERFICIAL_PATTERNS) or (
            len(words) <= 5 and any(w in ans_lower for w in ["part", "thing", "code"]) and not any(
                k in ans_lower for k in ["hiding", "essential", "important", "subclass", "parent", "bundling", "many forms", "overload", "override"]
            )
        )

        if is_superficial:
            score = round(criterion_max * 0.15, 1)
            feedback = f"Identifies domain connection, but does not provide a functional definition of {concept}."
            return {
                "criterion": criterion_name,
                "score": score,
                "max_score": criterion_max,
                "feedback": feedback
            }

        # Concept-specific definition checks
        if "abstract" in concept or "abstract" in ans_lower:
            has_hiding = any(k in ans_lower for k in ["hiding", "hide", "hides", "protect", "hidden"])
            has_showing = any(k in ans_lower for k in ["showing", "show", "essential", "important", "display"])
            if has_hiding and has_showing:
                score = criterion_max
                feedback = f"Clear, accurate definition of {concept}."
            elif has_hiding or has_showing:
                score = round(criterion_max * 0.6, 1)
                feedback = f"Provides a working definition of {concept}."
            else:
                score = 0.0
                feedback = f"No definition of {concept} provided."
        elif "encapsulat" in concept or "capsulat" in ans_lower:
            has_wrap = any(k in ans_lower for k in ["bundling", "bundle", "wrapping", "wrap", "binding", "single unit"])
            has_hide = any(k in ans_lower for k in ["data hiding", "hiding", "private", "access modifier", "getter", "setter"])
            if has_wrap and has_hide:
                score = criterion_max
                feedback = f"Clear, accurate definition of {concept}."
            elif has_wrap or has_hide:
                score = round(criterion_max * 0.6, 1)
                feedback = f"Provides a working definition of {concept}."
            else:
                score = 0.0
                feedback = f"No definition of {concept} provided."
        elif "inherit" in concept or "inherit" in ans_lower:
            has_hierarchy = any(k in ans_lower for k in ["class", "subclass", "superclass", "parent", "child", "base", "derived"])
            has_acquire = any(k in ans_lower for k in ["acquire", "acquires", "get", "gets", "derive", "inherit", "reus", "extend"])
            if has_hierarchy and has_acquire:
                score = criterion_max
                feedback = f"Clear, accurate definition of {concept}."
            elif has_hierarchy or has_acquire:
                score = round(criterion_max * 0.5, 1)
                feedback = f"Provides a working definition of {concept}."
            else:
                score = 0.0
                feedback = f"No definition of {concept} provided."
        elif "polymorph" in concept or "polymorph" in ans_lower:
            has_many = any(k in ans_lower for k in ["many forms", "multiple forms", "many form", "different forms"])
            has_poly_mech = any(k in ans_lower for k in ["overload", "override", "compile time", "runtime", "interface"])
            if has_many or has_poly_mech:
                score = criterion_max if (has_many and has_poly_mech) else round(criterion_max * 0.7, 1)
                feedback = f"Clear, accurate definition of {concept}."
            else:
                score = 0.0
                feedback = f"No definition of {concept} provided."
        else:
            if len(words) >= 8 and any(k in ans_lower for k in ["means", "is a", "defined as", "refers to", "process of", "mechanism", "technique"]):
                score = criterion_max
                feedback = f"Clear, accurate definition of {concept}."
            elif len(words) >= 4:
                score = round(criterion_max * 0.5, 1)
                feedback = f"Provides a working definition of {concept}."
            else:
                score = 0.0
                feedback = f"No definition of {concept} provided."

        return {
            "criterion": criterion_name,
            "score": score,
            "max_score": criterion_max,
            "feedback": feedback
        }

    # Criterion 8: Technical explanation / Mechanism
    if any(k in c_lower for k in ["technical explanation", "mechanism", "how it works", "implementation"]):
        words = student_ans.split()
        if len(words) >= 12 and any(k in ans_lower for k in ["class", "method", "interface", "abstract", "extend", "override", "private", "public"]):
            score = criterion_max
            feedback = f"Fully explains the technical mechanism of {concept}."
        elif len(words) >= 6:
            score = round(criterion_max * 0.5, 1) if strictness != "flexible" else round(criterion_max * 0.75, 1)
            feedback = f"Partially explains the technical mechanism of {concept}."
        else:
            score = 0.0
            feedback = f"Did not provide a technical explanation or mechanism for {concept}."
        return {
            "criterion": criterion_name,
            "score": score,
            "max_score": criterion_max,
            "feedback": feedback
        }

    # Criterion 9: Accuracy & Completeness
    if any(k in c_lower for k in ["accuracy & completeness", "completeness", "thoroughness"]):
        words = student_ans.split()
        if len(words) >= 12 and not any(p.match(student_ans.strip()) for p in SUPERFICIAL_PATTERNS):
            return {
                "criterion": criterion_name,
                "score": criterion_max,
                "max_score": criterion_max,
                "feedback": f"Comprehensive and accurate explanation of {concept}."
            }
        elif len(words) >= 6:
            return {
                "criterion": criterion_name,
                "score": round(criterion_max * 0.5, 1),
                "max_score": criterion_max,
                "feedback": f"Accurate but could include additional technical depth for {concept}."
            }
        else:
            return {
                "criterion": criterion_name,
                "score": 0.0,
                "max_score": criterion_max,
                "feedback": f"Answer has significant conceptual and technical gaps regarding {concept}."
            }

    # Criterion 10: General semantic evaluation using on-device ONNX embeddings or model answer
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
        rubric_guidance: str = "",
        teacher_id: Optional[str] = None,
        db: Optional[Any] = None
    ) -> QuestionEvaluationResult:
        """
        Evaluates a single question against the teacher-controlled marking rubric.
        Supports optional Teacher-Specific Offline RAG as an enhancement.
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

        raw_model = getattr(q_item, "model_answer", None) or getattr(q_item, "expected_answer", None) or ""
        raw_rubric = getattr(q_item, "rubric", None) or rubric_guidance or ""

        # Step 0: Integrity Check - Prevent cross-contamination between question topic and rubric/model answer
        model_ans, effective_rubric, mismatch_detected, mismatch_reason = check_and_sanitize_rubric_and_model_answer(
            question_text=q_item.question_text,
            model_answer=raw_model,
            rubric_str=raw_rubric,
            max_marks=max_m,
            topic=topic
        )
        if mismatch_detected:
            logger.warning(
                f"[CRITICAL RUBRIC MISMATCH] Question ID: {q_item.question_id}, Text: '{q_item.question_text}'. "
                f"Reason: {mismatch_reason}. Realigning rubric and model answer."
            )

        # Step 0.5: Optional Teacher-Specific Offline RAG Context Retrieval
        rag_res = TeacherRAGService.retrieve_teacher_context(
            db=db,
            teacher_id=teacher_id,
            question_text=q_item.question_text,
            topic=topic,
            subject=getattr(q_item, "topic", "Computer Science") or "Computer Science"
        )
        teacher_context_used = rag_res.get("teacher_context_used", False)
        retrieved_sources = rag_res.get("retrieved_sources", [])
        rag_context_text = rag_res.get("context_text", "")

        expected_concepts = getattr(q_item, "key_concepts", None) or []
        if isinstance(expected_concepts, str) and expected_concepts.strip():
            try:
                expected_concepts = json.loads(expected_concepts)
            except Exception:
                expected_concepts = [c.strip() for c in expected_concepts.split(",") if c.strip()]
        if not isinstance(expected_concepts, list):
            expected_concepts = []

        # Parse teacher's rubric criteria
        criteria = parse_rubric_criteria(effective_rubric, max_m, expected_concepts)

        # Requirement: Empty answer handling (Test 5)
        if is_empty:
            empty_criteria = [
                CriterionScoreItem(criterion=c["criterion"], score=0.0, max_score=c["max_score"], feedback=f"No answer submitted for {c['criterion']}.")
                for c in criteria
            ]
            return QuestionEvaluationResult(
                question_id=q_item.question_id,
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
                rubric=effective_rubric,
                criterion_scores=empty_criteria,
                supported_points=[],
                missing_points=[c["criterion"] for c in criteria],
                teacher_review_required=False,
                teacher_context_used=teacher_context_used,
                retrieved_sources=retrieved_sources
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
                question_id=q_item.question_id,
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
                rubric=effective_rubric,
                criterion_scores=injection_criteria,
                supported_points=[],
                missing_points=[c["criterion"] for c in criteria],
                teacher_review_required=True,
                teacher_context_used=teacher_context_used,
                retrieved_sources=retrieved_sources
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
                strictness=strictness,
                question_text=q_item.question_text,
                topic=topic
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
        rag_prompt_section = ""
        if teacher_context_used and rag_context_text:
            rag_prompt_section = (
                f"\nTEACHER RAG BENCHMARK & PEDAGOGICAL GUIDANCE (Reference only - explicit rubric takes absolute priority):\n"
                f"{rag_context_text}\n"
            )

        prompt = (
            f"Question: {q_item.question_text}\n"
            f"Maximum Marks: {max_m}\n"
            f"Strictness Mode: {strictness}\n"
            f"{f'Model Answer: {model_ans}' if model_ans else ''}\n"
            f"Teacher Marking Rubric:\n{rubric_spec_str}\n"
            f"{rag_prompt_section}"
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
            confidence < 0.85 or (0 < total_score < max_m * 0.5 and strictness == "strict") or mismatch_detected
        )

        reasoning_str = (
            f"Rubric evaluation awarded {total_score}/{max_m} pts across {len(criterion_results)} criteria "
            f"({strictness} mode)."
        )
        if teacher_context_used:
            reasoning_str += f" [Teacher Context: {len(retrieved_sources)} reference source(s) utilized.]"
        if mismatch_detected:
            reasoning_str += f" [Rubric Realignment: Criteria realigned to match question concept '{q_item.question_text}'.]"

        return QuestionEvaluationResult(
            question_id=q_item.question_id,
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
            rubric=effective_rubric,
            criterion_scores=criterion_results,
            supported_points=supported_points,
            missing_points=missing_points,
            teacher_review_required=teacher_review_required,
            teacher_context_used=teacher_context_used,
            retrieved_sources=retrieved_sources,
        )

    @classmethod
    async def evaluate_assessment(
        cls,
        submission_id: str,
        questions: List[ExtractedQuestionItem],
        rubric_guidance: str = "",
        teacher_id: Optional[str] = None,
        db: Optional[Any] = None
    ) -> AssessmentEvaluationResponse:
        """
        Evaluates all questions sequentially, aggregates total scores,
        computes topic performance, identifies learning gaps, and generates recommendations.
        Incorporates optional Teacher-Specific Offline RAG context.
        """
        evaluated_questions: List[QuestionEvaluationResult] = []

        for q in questions:
            eval_res = await cls.evaluate_question(
                q_item=q,
                rubric_guidance=rubric_guidance,
                teacher_id=teacher_id,
                db=db
            )
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

        # Aggregate teacher context and sources
        overall_teacher_context_used = any(bool(q.teacher_context_used) for q in evaluated_questions)
        seen_source_ids = set()
        aggregated_sources = []
        for q in evaluated_questions:
            for s in (q.retrieved_sources or []):
                doc_key = s.get("doc_id") or s.get("title")
                if doc_key and doc_key not in seen_source_ids:
                    seen_source_ids.add(doc_key)
                    aggregated_sources.append(s)

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
            teacher_context_used=overall_teacher_context_used,
            retrieved_sources=aggregated_sources,
        )
