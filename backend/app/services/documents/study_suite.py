import json
import re
import time
from typing import List, Dict, Any, Tuple, Optional
from ..ai.local_llm import DevelopmentLLMProvider
from ..ai.base import ModelNotInitializedError
from .embeddings import embedding_service
from ...core.config import settings

DOCUMENT_QA_SYSTEM_PROMPT = (
    "You are EvallQ AI Study Assistant, a private on-device academic companion.\n"
    "You answer questions grounded strictly in the provided document context excerpts.\n\n"
    "Guidelines:\n"
    "1. Be concise, precise, and pedagogically helpful.\n"
    "2. Base your answer directly on the provided context excerpts.\n"
    "3. Explicitly cite the page numbers provided in the context (e.g., '(Page 4)').\n"
    "4. If the context does not contain enough information to answer the question, state that clearly."
)

DOCUMENT_SUMMARY_SYSTEM_PROMPT = (
    "You are EvallQ AI Summarizer, a private on-device study assistant.\n"
    "Generate an executive summary and key takeaways for the provided course document.\n"
    "Respond in the following format:\n"
    "SUMMARY:\n<1-2 concise paragraphs explaining core topics and concepts>\n\n"
    "KEY TAKEAWAYS:\n- <Point 1>\n- <Point 2>\n- <Point 3>\n- <Point 4>"
)

QUIZ_GENERATION_SYSTEM_PROMPT = (
    "You are EvallQ AI Quiz Generator. Based on the document excerpts provided, "
    "generate 3 distinct multiple-choice questions to test student comprehension.\n\n"
    "CRITICAL RULES FOR EACH QUESTION:\n"
    "1. \"options\": MUST be a JSON array of EXACTLY 4 distinct strings.\n"
    "2. UNIQUENESS MANDATE: Every option must be unique and different in meaning from the other options. "
    "NEVER repeat the same word or phrase across choices. Absolutely NO duplicate options.\n"
    "3. Structure: Exactly 1 correct answer that accurately reflects the document and 3 plausible, distinct distractors.\n"
    "4. Do NOT include option letter prefixes like 'A.', 'B)', 'C:' inside the option strings.\n"
    "5. \"correctIndex\": Integer (0, 1, 2, or 3) indicating the exact index of the correct answer in the \"options\" array.\n"
    "6. \"correct_answer\": The exact string of the correct choice (must match options[correctIndex]).\n"
    "7. \"explanation\": 1-2 sentences explaining why the correct choice is right based on the text.\n\n"
    "Output MUST be a JSON object with a \"questions\" key containing an array of question objects.\n"
    "Example format:\n"
    "{\n"
    "  \"questions\": [\n"
    "    {\n"
    "      \"id\": \"q1\",\n"
    "      \"question\": \"What is the primary role of a distributed consensus protocol?\",\n"
    "      \"options\": [\n"
    "        \"Ensures all nodes agree on a single data value or state transition\",\n"
    "        \"Compresses memory footprint on client workstations\",\n"
    "        \"Encrypts network packets over TLS connections\",\n"
    "        \"Schedules CPU hardware interrupts on single-core processors\"\n"
    "      ],\n"
    "      \"correctIndex\": 0,\n"
    "      \"correct_answer\": \"Ensures all nodes agree on a single data value or state transition\",\n"
    "      \"explanation\": \"Consensus protocols ensure distributed nodes reach agreement on shared state despite failures.\"\n"
    "    }\n"
    "  ]\n"
    "}"
)

REGENERATE_QUESTION_SYSTEM_PROMPT = (
    "You are EvallQ AI Quiz Generator. A previously generated question was rejected due to duplicate or invalid options.\n"
    "Generate ONE high-quality multiple-choice question from the provided document excerpt.\n\n"
    "CRITICAL RULES:\n"
    "1. \"options\": MUST be a JSON array of EXACTLY 4 distinct strings.\n"
    "2. UNIQUENESS: All 4 choices MUST be completely unique and have different meanings. "
    "Do NOT repeat the same option text. Do NOT use placeholder tokens like '<choice A>'.\n"
    "3. Include 1 correct answer and 3 distinct plausible distractors.\n"
    "4. Do NOT include letter prefixes like 'A.', 'B.' in the option strings.\n"
    "5. \"correctIndex\": Integer (0, 1, 2, or 3) indicating the correct answer's position in \"options\".\n"
    "6. \"correct_answer\": The exact text of the correct choice (matching options[correctIndex]).\n"
    "7. \"explanation\": 1-2 sentences explaining why the correct answer is right.\n\n"
    "Output ONLY a single valid JSON object formatted like this example:\n"
    "{\n"
    "  \"question\": \"Which mechanism is commonly used to enforce mutual exclusion?\",\n"
    "  \"options\": [\n"
    "    \"Semaphores and mutexes\",\n"
    "    \"Direct memory access without locks\",\n"
    "    \"Virtual memory page tables\",\n"
    "    \"Instruction pipeline reordering\"\n"
    "  ],\n"
    "  \"correctIndex\": 0,\n"
    "  \"correct_answer\": \"Semaphores and mutexes\",\n"
    "  \"explanation\": \"Semaphores and mutexes are fundamental synchronization primitives for mutual exclusion.\"\n"
    "}"
)

FLASHCARD_GENERATION_SYSTEM_PROMPT = (
    "You are EvallQ AI Flashcard Generator. Based on the document excerpts provided, "
    "create 4 to 6 high-yield concept flashcards for active recall study.\n"
    "Output ONLY a valid JSON array of objects with no extraneous text.\n"
    "Each object must have the following keys:\n"
    "  \"id\": string (e.g. \"f1\"),\n"
    "  \"front\": string (concise concept, term, or question),\n"
    "  \"back\": string (clear definition, explanation, or answer),\n"
    "  \"category\": string (topic category, e.g. \"Concepts\", \"Algorithms\", \"Architecture\")"
)


class StudySuiteService:
    """
    On-device interactive study service providing RAG Q&A,
    document summarization, quiz generation, and flashcard creation.
    """

    def __init__(self, llm_provider: Optional[DevelopmentLLMProvider] = None):
        self.llm = llm_provider or DevelopmentLLMProvider()

    async def answer_question(
        self,
        question: str,
        chunks: List[Dict[str, Any]],
        top_k: int = 3
    ) -> Dict[str, Any]:
        """
        Executes grounded RAG Q&A on document chunks.
        """
        start_time = time.perf_counter()

        # Step 1: Semantic search for top-K chunks
        top_scored = embedding_service.search_chunks(question, chunks, top_k=top_k)

        # Build context string
        context_parts = []
        sources = []
        for chunk, score in top_scored:
            page_num = chunk.get("page_number", 1)
            content = chunk.get("content", "")
            chunk_id = chunk.get("id", "")
            context_parts.append(f"--- [Excerpt from Page {page_num}] ---\n{content}")
            sources.append({
                "chunk_id": chunk_id,
                "page_number": page_num,
                "content": content[:240] + ("..." if len(content) > 240 else ""),
                "score": round(score, 4),
            })

        context_str = "\n\n".join(context_parts)
        user_prompt = (
            f"Document Context:\n{context_str}\n\n"
            f"Student Question: {question}\n\n"
            f"Provide a clear, grounded explanation citing relevant page numbers."
        )

        # Step 2: Query local LLM
        llm_res = await self.llm.generate_chat(
            messages=[{"role": "user", "content": user_prompt}],
            system_prompt=DOCUMENT_QA_SYSTEM_PROMPT,
            max_tokens=512
        )

        total_latency_ms = round((time.perf_counter() - start_time) * 1000, 1)

        return {
            "reply": llm_res.get("reply", ""),
            "sources": sources,
            "latency_ms": total_latency_ms,
            "tokens_per_second": llm_res.get("tokens_per_second", 0.0),
            "device": self.llm.device,
            "offline": True
        }

    async def generate_summary(
        self,
        chunks: List[Dict[str, Any]],
        max_chunks: int = 6
    ) -> Tuple[str, List[str], float]:
        """
        Generates an executive summary and 3-5 key takeaways from document chunks.
        """
        start_time = time.perf_counter()

        # Select evenly spaced chunks across the document to cover the full range
        selected_chunks = self._sample_chunks_across_doc(chunks, max_chunks)
        combined_text = "\n\n".join(
            f"[Page {c.get('page_number', 1)}]: {c.get('content', '')}"
            for c in selected_chunks
        )

        prompt = (
            f"Document Excerpts:\n{combined_text}\n\n"
            f"Generate a comprehensive summary and 3 to 5 key takeaways following the specified format."
        )

        res = await self.llm.generate_chat(
            messages=[{"role": "user", "content": prompt}],
            system_prompt=DOCUMENT_SUMMARY_SYSTEM_PROMPT,
            max_tokens=512
        )

        reply_text = res.get("reply", "")
        summary, takeaways = self._parse_summary_and_takeaways(reply_text)
        latency_ms = round((time.perf_counter() - start_time) * 1000, 1)

        return summary, takeaways, latency_ms

    def _sample_chunks_across_doc(self, chunks: List[Dict[str, Any]], count: int) -> List[Dict[str, Any]]:
        if not chunks:
            return []
        if len(chunks) <= count:
            return chunks
        step = len(chunks) / count
        return [chunks[int(i * step)] for i in range(count)]

    def _parse_summary_and_takeaways(self, text: str) -> Tuple[str, List[str]]:
        summary = ""
        takeaways: List[str] = []

        if "KEY TAKEAWAYS:" in text:
            parts = text.split("KEY TAKEAWAYS:", 1)
            raw_summary = parts[0].replace("SUMMARY:", "").strip()
            summary = raw_summary
            raw_takeaways = parts[1].strip().split("\n")
            for line in raw_takeaways:
                cleaned = re.sub(r"^[-*•\d.]+\s*", "", line).strip()
                if cleaned:
                    takeaways.append(cleaned)
        else:
            summary = text.replace("SUMMARY:", "").strip()
            takeaways = [
                "Document ingested and indexed for private on-device search.",
                "Semantic embeddings generated for localized vector retrieval."
            ]

        if not takeaways:
            takeaways = [
                "Core topics extracted from lecture slides.",
                "Ready for interactive document Q&A and quiz generation."
            ]

        return summary, takeaways[:5]

    async def generate_flashcards(
        self,
        chunks: List[Dict[str, Any]],
        max_chunks: int = 5
    ) -> Tuple[List[Dict[str, Any]], float]:
        """
        Synthesizes high-yield study flashcards from document chunks.
        """
        start_time = time.perf_counter()
        selected_chunks = self._sample_chunks_across_doc(chunks, max_chunks)
        combined_text = "\n\n".join(c.get("content", "") for c in selected_chunks)

        prompt = (
            f"Document Excerpts:\n{combined_text}\n\n"
            f"Generate 4 to 6 flashcards based on these key concepts as a JSON array."
        )

        res = await self.llm.generate_chat(
            messages=[{"role": "user", "content": prompt}],
            system_prompt=FLASHCARD_GENERATION_SYSTEM_PROMPT,
            max_tokens=768
        )

        raw_reply = res.get("reply", "")
        flashcards = self._parse_flashcards_json(raw_reply)
        latency_ms = round((time.perf_counter() - start_time) * 1000, 1)

        return flashcards, latency_ms

    def _clean_option_text(self, text: str) -> str:
        cleaned = re.sub(r"^[A-Da-d][\.\)\:\-]\s*", "", str(text)).strip()
        cleaned = re.sub(r"^\d+[\.\)\:\-]\s*", "", cleaned).strip()
        return cleaned

    def _validate_quiz_question(
        self,
        q: Dict[str, Any],
        seen_questions: set
    ) -> Tuple[bool, str, Dict[str, Any]]:
        if not isinstance(q, dict):
            return False, "Item is not a dictionary", {}

        question_text = str(q.get("question", "")).strip()
        if not question_text or len(question_text) < 8:
            return False, "Question text empty or too short (< 8 chars)", {}

        if any(ph in question_text.lower() for ph in ["<question", "<choice", "<option", "todo"]):
            return False, f"Question text contains placeholder: {question_text}", {}

        q_norm = question_text.lower()
        if q_norm in seen_questions:
            return False, f"Duplicate question text in quiz: {question_text}", {}

        raw_options = q.get("options", [])
        if not isinstance(raw_options, list):
            return False, "Options is not a list", {}

        cleaned_options: List[str] = []
        for opt in raw_options:
            if isinstance(opt, dict):
                val = opt.get("text") or opt.get("content") or opt.get("option") or str(opt)
                cleaned_options.append(self._clean_option_text(val))
            else:
                cleaned_options.append(self._clean_option_text(str(opt)))

        correct_answer = self._clean_option_text(str(q.get("correct_answer", ""))) if q.get("correct_answer") else None
        correct_idx = q.get("correctIndex")

        # If 3 options provided and correct_answer is distinct, repair to 4
        if len(cleaned_options) == 3 and correct_answer:
            if not any(correct_answer.lower() == o.lower() for o in cleaned_options):
                idx = int(correct_idx) if isinstance(correct_idx, (int, str)) and str(correct_idx).isdigit() and int(correct_idx) in [0, 1, 2, 3] else 0
                cleaned_options.insert(idx, correct_answer)

        if len(cleaned_options) != 4:
            return False, f"Expected exactly 4 options, got {len(cleaned_options)}", {}

        for opt in cleaned_options:
            if not opt or len(opt) < 1:
                return False, "Empty option string encountered", {}
            if any(ph in opt.lower() for ph in ["<choice", "<option", "<placeholder"]):
                return False, f"Option contains placeholder token: {opt}", {}

        norm_opts = [o.lower().rstrip(".,;:") for o in cleaned_options]
        if len(set(norm_opts)) != 4:
            return False, f"Duplicate options detected: {cleaned_options}", {}

        # Validate or align correctIndex and correct_answer
        final_correct_idx = 0
        if correct_answer:
            match_idx = None
            for i, opt in enumerate(cleaned_options):
                if opt.lower().rstrip(".,;:") == correct_answer.lower().rstrip(".,;:"):
                    match_idx = i
                    break
            if match_idx is not None:
                final_correct_idx = match_idx
                final_correct_answer = cleaned_options[match_idx]
            else:
                if isinstance(correct_idx, (int, str)) and str(correct_idx).isdigit() and 0 <= int(correct_idx) < 4:
                    final_correct_idx = int(correct_idx)
                    final_correct_answer = cleaned_options[final_correct_idx]
                else:
                    final_correct_idx = 0
                    final_correct_answer = cleaned_options[0]
        else:
            if isinstance(correct_idx, (int, str)) and str(correct_idx).isdigit() and 0 <= int(correct_idx) < 4:
                final_correct_idx = int(correct_idx)
            else:
                final_correct_idx = 0
            final_correct_answer = cleaned_options[final_correct_idx]

        explanation = str(q.get("explanation", "")).strip()
        if not explanation or len(explanation) < 5 or "<" in explanation:
            explanation = f"'{final_correct_answer}' is the correct choice directly supported by the document text."
        else:
            # Reconcile if explanation explicitly identifies a different unique option as correct
            exp_matches = [
                i for i, opt in enumerate(cleaned_options)
                if len(opt) > 4 and opt.lower() in explanation.lower()
            ]
            if len(exp_matches) == 1 and final_correct_idx not in exp_matches:
                final_correct_idx = exp_matches[0]
                final_correct_answer = cleaned_options[final_correct_idx]

        valid_obj = {
            "id": str(q.get("id") or f"q{len(seen_questions) + 1}"),
            "question": question_text,
            "options": cleaned_options,
            "correctIndex": final_correct_idx,
            "correct_answer": final_correct_answer,
            "explanation": explanation,
        }
        return True, "", valid_obj

    def _build_deterministic_fallback_question(self, chunk: Dict[str, Any], idx: int) -> Dict[str, Any]:
        content = chunk.get("content", "")
        sentences = [s.strip() for s in re.split(r"[.\n]", content) if len(s.strip()) > 20]
        lead_sentence = sentences[0] if sentences else "Essential system operations and design concepts"
        if len(lead_sentence) > 90:
            lead_sentence = lead_sentence[:90] + "..."

        return {
            "id": f"q{idx}",
            "question": f"Which principle is emphasized in the discussion of '{lead_sentence}'?",
            "options": [
                f"Adherence to {lead_sentence.lower()}",
                "Unsynchronized execution across concurrent tasks",
                "Bypassing deterministic scheduling constraints",
                "Unconstrained memory fragmentation without verification"
            ],
            "correctIndex": 0,
            "correct_answer": f"Adherence to {lead_sentence.lower()}",
            "explanation": f"Grounded directly in the document discussion regarding {lead_sentence}."
        }

    def _parse_raw_quiz_json(self, text: str) -> List[Dict[str, Any]]:
        # Check markdown code fences
        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
        json_str = match.group(1).strip() if match else text.strip()

        try:
            data = json.loads(json_str)
            if isinstance(data, list):
                return data
            if isinstance(data, dict):
                return data.get("questions") or data.get("items") or data.get("quiz") or []
        except Exception:
            # Fallback regex search for json object or array
            arr_match = re.search(r"\[[\s\S]*\]", text)
            if arr_match:
                try:
                    return json.loads(arr_match.group(0))
                except Exception:
                    pass
            obj_match = re.search(r"\{[\s\S]*\}", text)
            if obj_match:
                try:
                    obj = json.loads(obj_match.group(0))
                    if isinstance(obj, dict):
                        return obj.get("questions") or obj.get("items") or []
                except Exception:
                    pass
        return []

    async def generate_quiz(
        self,
        chunks: List[Dict[str, Any]],
        max_chunks: int = 5
    ) -> Tuple[List[Dict[str, Any]], float]:
        """
        Synthesizes multiple-choice questions from document chunks with strict 4-option uniqueness validation.
        """
        start_time = time.perf_counter()
        selected_chunks = self._sample_chunks_across_doc(chunks, max_chunks)
        combined_text = "\n\n".join(c.get("content", "") for c in selected_chunks)

        prompt = (
            f"Document Excerpts:\n{combined_text}\n\n"
            f"Generate 3 multiple-choice questions based on these concepts as a JSON object."
        )

        res = await self.llm.generate_chat(
            messages=[{"role": "user", "content": prompt}],
            system_prompt=QUIZ_GENERATION_SYSTEM_PROMPT,
            max_tokens=768,
            temperature=0.3,
            repeat_penalty=1.25,
            json_format=True
        )

        raw_reply = res.get("reply", "")
        parsed_items = self._parse_raw_quiz_json(raw_reply)

        final_questions: List[Dict[str, Any]] = []
        seen_questions: set = set()
        target_count = 3

        for idx in range(target_count):
            candidate = parsed_items[idx] if idx < len(parsed_items) else None
            is_valid = False
            valid_obj = None

            if candidate:
                is_valid, reason, valid_obj = self._validate_quiz_question(candidate, seen_questions)

            # If invalid, attempt single-question regeneration up to 2 times
            if not is_valid:
                target_chunk = selected_chunks[idx % len(selected_chunks)] if selected_chunks else {"content": "General concepts"}
                chunk_text = target_chunk.get("content", "")
                regen_user_prompt = f"Document Excerpt:\n{chunk_text}\n\nGenerate 1 distinct multiple-choice question."

                for attempt in range(2):
                    try:
                        r_res = await self.llm.generate_chat(
                            messages=[{"role": "user", "content": regen_user_prompt}],
                            system_prompt=REGENERATE_QUESTION_SYSTEM_PROMPT,
                            max_tokens=384,
                            temperature=0.3,
                            repeat_penalty=1.25,
                            json_format=True
                        )
                        r_content = r_res.get("reply", "")
                        r_items = self._parse_raw_quiz_json(r_content)
                        r_cand = r_items[0] if (isinstance(r_items, list) and r_items) else json.loads(r_content)
                        if isinstance(r_cand, dict) and "questions" in r_cand and isinstance(r_cand["questions"], list) and r_cand["questions"]:
                            r_cand = r_cand["questions"][0]

                        r_valid, r_reason, r_obj = self._validate_quiz_question(r_cand, seen_questions)
                        if r_valid:
                            valid_obj = r_obj
                            is_valid = True
                            break
                    except Exception:
                        pass

            # If still invalid, generate grounded deterministic fallback
            if not is_valid or not valid_obj:
                fallback_chunk = selected_chunks[idx % len(selected_chunks)] if selected_chunks else {"content": "Grounded document concepts"}
                valid_obj = self._build_deterministic_fallback_question(fallback_chunk, idx + 1)

            valid_obj["id"] = f"q{idx + 1}"
            seen_questions.add(valid_obj["question"].lower())
            final_questions.append(valid_obj)

        latency_ms = round((time.perf_counter() - start_time) * 1000, 1)
        return final_questions, latency_ms

    def _parse_flashcards_json(self, text: str) -> List[Dict[str, Any]]:
        match = re.search(r"```(?:json)?\s*(\[[\s\S]*?\])\s*```", text)
        if match:
            json_str = match.group(1)
        else:
            json_match = re.search(r"\[[\s\S]*\]", text)
            json_str = json_match.group(0) if json_match else text

        try:
            items = json.loads(json_str)
            valid_cards = []
            for idx, item in enumerate(items):
                if isinstance(item, dict) and "front" in item and "back" in item:
                    valid_cards.append({
                        "id": item.get("id") or f"f{idx + 1}",
                        "front": str(item.get("front")),
                        "back": str(item.get("back")),
                        "category": str(item.get("category", "General")),
                    })
            if valid_cards:
                return valid_cards
        except Exception:
            pass

        return [
            {
                "id": "f1",
                "front": "What is the central concept discussed in this section?",
                "back": "Key theoretical definitions and behavioral rules described in the course text.",
                "category": "Foundations"
            }
        ]


# Singleton instance
study_suite_service = StudySuiteService()
