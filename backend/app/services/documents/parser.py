import io
import re
from typing import List, Dict, Any, Tuple
import pymupdf


class DocumentParseError(Exception):
    pass


class PDFParser:
    """
    On-device PDF parser powered by PyMuPDF (fitz).
    Executes 100% locally with zero external network transmission.
    """

    MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB
    MAX_PAGES = 300

    @staticmethod
    def parse_pdf_bytes(file_bytes: bytes, filename: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Parses raw PDF bytes into structured pages with cleaned text and document metadata.
        Returns:
            (pages_list, metadata_dict)
            pages_list: [{"page_number": 1, "text": "...", "char_count": 1234}, ...]
            metadata_dict: {"filename": str, "page_count": int, "total_chars": int, ...}
        """
        if len(file_bytes) > PDFParser.MAX_FILE_SIZE_BYTES:
            raise DocumentParseError(
                f"File size exceeds maximum permitted limit ({PDFParser.MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB)."
            )

        if len(file_bytes) == 0:
            raise DocumentParseError("Uploaded file is empty.")

        try:
            doc = pymupdf.open(stream=file_bytes, filetype="pdf")
        except Exception as e:
            raise DocumentParseError(f"Could not open document as valid PDF: {str(e)}")

        page_count = len(doc)
        if page_count == 0:
            raise DocumentParseError("Document contains 0 pages.")

        if page_count > PDFParser.MAX_PAGES:
            raise DocumentParseError(
                f"Document exceeds maximum supported pages ({page_count} > {PDFParser.MAX_PAGES})."
            )

        pages: List[Dict[str, Any]] = []
        total_chars = 0

        for page_idx in range(page_count):
            page = doc.load_page(page_idx)
            raw_text = page.get_text("text")

            # Clean and normalize text
            cleaned_text = re.sub(r"[ \t]+", " ", raw_text)
            cleaned_text = re.sub(r"\n{3,}", "\n\n", cleaned_text).strip()

            char_count = len(cleaned_text)
            total_chars += char_count

            pages.append({
                "page_number": page_idx + 1,
                "text": cleaned_text,
                "char_count": char_count,
            })

        doc_meta = doc.metadata or {}
        doc.close()

        if total_chars == 0:
            raise DocumentParseError(
                "Document contains no extractable text. Scanned image-only PDFs without OCR are not supported."
            )

        metadata = {
            "filename": filename,
            "page_count": page_count,
            "total_chars": total_chars,
            "title": doc_meta.get("title") or filename,
            "author": doc_meta.get("author") or "Unknown",
        }

        return pages, metadata
