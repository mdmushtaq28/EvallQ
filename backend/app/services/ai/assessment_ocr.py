import io
import os
import re
import json
import logging
from typing import List, Dict, Any, Tuple, Optional
from pathlib import Path
import numpy as np
from PIL import Image, ImageEnhance
import pymupdf

logger = logging.getLogger("focusflow.assessment.ocr")

# Lazy-loaded RapidOCR engine instance
_rapid_ocr_engine = None


def get_ocr_engine():
    global _rapid_ocr_engine
    if _rapid_ocr_engine is None:
        try:
            from rapidocr_onnxruntime import RapidOCR
            _rapid_ocr_engine = RapidOCR()
            logger.info("Initialized local RapidOCR ONNX engine.")
        except Exception as e:
            logger.error(f"Failed to initialize RapidOCR engine: {e}")
            raise RuntimeError(f"Local OCR engine unavailable: {e}")
    return _rapid_ocr_engine


class AssessmentOCRError(Exception):
    """Exception raised when OCR extraction fails."""
    pass


class AssessmentOCRService:
    """
    On-device OCR and document analysis engine for real student assessments.
    Operates 100% locally with zero cloud API dependencies.
    Preserves page boundaries, confidence scores, and raw byte mappings.
    """

    SUPPORTED_MIME_TYPES = {
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
        "application/pdf",
    }

    @classmethod
    def process_file(
        cls,
        file_bytes: bytes,
        filename: str,
        content_type: str,
        preview_storage_dir: Path
    ) -> Tuple[List[Dict[str, Any]], str, float]:
        """
        Processes real file bytes (PDF or Image), performs local ONNX OCR per page,
        generates preview PNGs for human verification, and returns:
            (pages_data, combined_raw_text, overall_confidence)
        """
        if not file_bytes:
            raise AssessmentOCRError("Uploaded assessment file is empty (0 bytes).")

        preview_storage_dir.mkdir(parents=True, exist_ok=True)
        lower_name = filename.lower()

        is_pdf = content_type == "application/pdf" or lower_name.endswith(".pdf")

        if is_pdf:
            return cls._process_pdf(file_bytes, preview_storage_dir)
        elif content_type in cls.SUPPORTED_MIME_TYPES or any(lower_name.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp"]):
            return cls._process_image(file_bytes, preview_storage_dir)
        else:
            raise AssessmentOCRError(f"Unsupported file format '{content_type}'. Please upload PNG, JPG, WEBP, or PDF.")

    @classmethod
    def _process_image(
        cls,
        file_bytes: bytes,
        preview_storage_dir: Path
    ) -> Tuple[List[Dict[str, Any]], str, float]:
        """Runs local OCR on a single image and writes preview PNG."""
        try:
            pil_img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        except Exception as e:
            raise AssessmentOCRError(f"Invalid or corrupted image file: {e}")

        # Save preview image for UI display
        preview_path = preview_storage_dir / "page_1.png"
        pil_img.save(preview_path, format="PNG")

        # Preprocessing: Enhance contrast slightly for faint handwriting / pencil
        enhancer = ImageEnhance.Contrast(pil_img)
        enhanced_img = enhancer.enhance(1.25)
        img_np = np.array(enhanced_img)

        # Run local OCR
        engine = get_ocr_engine()
        ocr_result, _ = engine(img_np)

        raw_lines = []
        confidences = []

        if ocr_result:
            for item in ocr_result:
                # item format: [box, text, confidence]
                if len(item) >= 3:
                    text = str(item[1]).strip()
                    conf = float(item[2])
                    if text:
                        raw_lines.append(text)
                        confidences.append(conf)

        page_raw_text = "\n".join(raw_lines)
        page_norm_text = cls.normalize_ocr_text(page_raw_text)
        avg_conf = float(np.mean(confidences)) if confidences else 0.0

        if not page_raw_text.strip():
            # If high contrast failed, try original image directly
            raw_orig, _ = engine(np.array(pil_img))
            if raw_orig:
                for item in raw_orig:
                    if len(item) >= 3 and str(item[1]).strip():
                        raw_lines.append(str(item[1]).strip())
                        confidences.append(float(item[2]))
                page_raw_text = "\n".join(raw_lines)
                page_norm_text = cls.normalize_ocr_text(page_raw_text)
                avg_conf = float(np.mean(confidences)) if confidences else 0.0

        page_data = {
            "page_number": 1,
            "raw_text": page_raw_text,
            "normalized_text": page_norm_text,
            "confidence": round(avg_conf, 3),
        }

        return [page_data], page_norm_text, round(avg_conf, 3)

    @classmethod
    def _process_pdf(
        cls,
        file_bytes: bytes,
        preview_storage_dir: Path
    ) -> Tuple[List[Dict[str, Any]], str, float]:
        """Renders multi-page PDF pages to images and executes per-page OCR."""
        try:
            doc = pymupdf.open(stream=file_bytes, filetype="pdf")
        except Exception as e:
            raise AssessmentOCRError(f"Invalid or corrupted PDF file: {e}")

        page_count = len(doc)
        if page_count == 0:
            raise AssessmentOCRError("PDF file contains 0 pages.")

        pages_data: List[Dict[str, Any]] = []
        all_confidences: List[float] = []
        combined_texts: List[str] = []

        try:
            engine = get_ocr_engine()
        except Exception as ocr_err:
            logger.warning(f"RapidOCR engine unavailable, will use embedded PDF text fallback: {ocr_err}")
            engine = None

        for page_idx in range(page_count):
            page_num = page_idx + 1
            page = doc.load_page(page_idx)

            # Render page at 150 DPI for sharp OCR recognition and crisp preview
            pix = page.get_pixmap(dpi=150)
            preview_path = preview_storage_dir / f"page_{page_num}.png"
            pix.save(str(preview_path))

            # Convert pixmap to numpy RGB array
            # pix.samples contains raw bytes
            if pix.n == 4:
                # RGBA -> RGB
                img_pil = Image.frombytes("RGBA", [pix.width, pix.height], pix.samples).convert("RGB")
                img_np = np.array(img_pil)
            elif pix.n == 3:
                img_pil = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                img_np = np.array(img_pil)
            else:
                img_pil = Image.frombytes("L", [pix.width, pix.height], pix.samples).convert("RGB")
                img_np = np.array(img_np if 'img_np' in locals() else img_pil)

            # Check if embedded text exists
            embedded_text = page.get_text("text").strip()

            raw_lines = []
            page_confs = []

            # Execute real OCR if engine is available
            if engine is not None:
                try:
                    ocr_result, _ = engine(img_np)
                    if ocr_result:
                        for item in ocr_result:
                            if len(item) >= 3:
                                text = str(item[1]).strip()
                                conf = float(item[2])
                                if text:
                                    raw_lines.append(text)
                                    page_confs.append(conf)
                except Exception as ocr_page_err:
                    logger.warning(f"Page {page_num} OCR execution error: {ocr_page_err}")

            ocr_extracted_text = "\n".join(raw_lines)

            # If OCR extracted text, use it as primary truth (it captures handwriting/scans)
            # If OCR extracted minimal text but embedded text exists, merge them safely
            if len(ocr_extracted_text) >= 20 or not embedded_text:
                final_page_text = ocr_extracted_text
                page_conf = float(np.mean(page_confs)) if page_confs else (0.85 if embedded_text else 0.0)
            else:
                final_page_text = embedded_text
                page_conf = 0.95

            if not final_page_text.strip() and engine is None:
                raise AssessmentOCRError(
                    "Local OCR engine unavailable (rapidocr_onnxruntime is not installed) "
                    "and the uploaded document does not contain embedded digital text."
                )

            norm_page_text = cls.normalize_ocr_text(final_page_text)

            pages_data.append({
                "page_number": page_num,
                "raw_text": final_page_text,
                "normalized_text": norm_page_text,
                "confidence": round(page_conf, 3),
            })

            if page_confs:
                all_confidences.extend(page_confs)
            else:
                all_confidences.append(page_conf)

            combined_texts.append(f"--- Page {page_num} ---\n{norm_page_text}")

        doc.close()

        overall_confidence = float(np.mean(all_confidences)) if all_confidences else 0.0
        full_text = "\n\n".join(combined_texts)

        return pages_data, full_text, round(overall_confidence, 3)

    @staticmethod
    def normalize_ocr_text(text: str) -> str:
        """Cleans and standardizes raw OCR characters without changing semantics."""
        if not text:
            return ""
        # Remove null bytes or control chars except standard whitespace
        cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)
        # Normalize carriage returns
        cleaned = cleaned.replace("\r\n", "\n").replace("\r", "\n")
        # Replace multiple spaces with single space
        cleaned = re.sub(r"[ \t]+", " ", cleaned)
        # Replace 3 or more newlines with double newline
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
        return cleaned.strip()

    @classmethod
    def extract_questions_and_answers(cls, ocr_text: str) -> List[Dict[str, Any]]:
        """
        Deterministically extracts questions and student answers from raw/verified OCR text.
        Supports common formats:
        - 1. Question... Answer: Student response...
        - Q1: Question... Ans: Student response...
        - Q1) Question... student answer...
        - Question 1 ... Answer ...
        """
        if not ocr_text or not ocr_text.strip():
            return []

        # Remove page separators for parsing if present
        clean_text = re.sub(r"--- Page \d+ ---", "", ocr_text).strip()

        # Regex pattern matching question headers:
        # e.g., "Q1.", "Q1:", "Q1)", "Question 1:", "1.", "1)" at start of line
        q_pattern = re.compile(
            r"(?:^|\n)\s*(?:Q(?:uestion)?\s*(\d+)[:.\)]|\((\d+)\)|(\d+)[\.\)])\s*",
            re.IGNORECASE
        )

        matches = list(q_pattern.finditer(clean_text))

        extracted: List[Dict[str, Any]] = []

        if matches:
            for idx, match in enumerate(matches):
                q_num_str = match.group(1) or match.group(2) or match.group(3)
                q_num = int(q_num_str) if q_num_str and q_num_str.isdigit() else (idx + 1)

                start_pos = match.end()
                end_pos = matches[idx + 1].start() if idx + 1 < len(matches) else len(clean_text)

                block = clean_text[start_pos:end_pos].strip()

                # Separate Question text from Student Answer
                # Look for delimiters: "Ans:", "Answer:", "Sol:", "Solution:", "Student Answer:"
                ans_split = re.split(
                    r"(?:^|\n)\s*(?:Ans(?:wer)?|Sol(?:ution)?|Student(?:'s)?\s*Ans(?:wer)?)\s*[:.\-]\s*",
                    block,
                    maxsplit=1,
                    flags=re.IGNORECASE
                )

                if len(ans_split) == 2:
                    q_text = ans_split[0].strip()
                    ans_text = ans_split[1].strip()
                else:
                    # If no explicit "Ans:" marker, see if lines are split by a blank line or newline
                    lines = [ln.strip() for ln in block.split("\n") if ln.strip()]
                    if len(lines) >= 2:
                        # First line is likely question, subsequent lines are student answer
                        q_text = lines[0]
                        ans_text = "\n".join(lines[1:])
                    else:
                        q_text = block
                        ans_text = block

                extracted.append({
                    "question_number": q_num,
                    "page_number": 1,
                    "question_text": q_text or f"Question {q_num}",
                    "student_answer": ans_text or "No answer detected in OCR.",
                    "maximum_marks": 5.0,
                })

        # Fallback if no numbered questions were detected
        if not extracted:
            # Check for double newline separated paragraphs
            paragraphs = [p.strip() for p in clean_text.split("\n\n") if p.strip()]
            if len(paragraphs) >= 2:
                # Group in pairs if even, or single questions
                for idx, para in enumerate(paragraphs):
                    extracted.append({
                        "question_number": idx + 1,
                        "page_number": 1,
                        "question_text": f"Assessment Item {idx + 1}",
                        "student_answer": para,
                        "maximum_marks": 5.0,
                    })
            elif paragraphs:
                extracted.append({
                    "question_number": 1,
                    "page_number": 1,
                    "question_text": "Assessment Response",
                    "student_answer": paragraphs[0],
                    "maximum_marks": 10.0,
                })

        return extracted
