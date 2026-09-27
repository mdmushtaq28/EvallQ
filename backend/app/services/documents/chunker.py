import re
from typing import List, Dict, Any


class TextChunker:
    """
    Semantic text chunker for local RAG retrieval.
    Preserves document page numbers so answers can be accurately cited to the student.
    """

    def __init__(self, chunk_size: int = 600, chunk_overlap: int = 100):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_pages(self, pages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Chunks a list of parsed pages into semantic chunks.
        Input pages: [{"page_number": int, "text": str}, ...]
        Returns:
            [
                {
                    "chunk_index": int,
                    "page_number": int,
                    "content": str,
                    "char_count": int
                },
                ...
            ]
        """
        chunks: List[Dict[str, Any]] = []
        global_chunk_idx = 0

        for page in pages:
            page_num = page["page_number"]
            page_text = page["text"].strip()
            if not page_text:
                continue

            page_chunks = self._chunk_text(page_text)
            for c in page_chunks:
                if len(c.strip()) >= 20:  # Skip trivial fragments
                    chunks.append({
                        "chunk_index": global_chunk_idx,
                        "page_number": page_num,
                        "content": c.strip(),
                        "char_count": len(c.strip()),
                    })
                    global_chunk_idx += 1

        return chunks

    def _chunk_text(self, text: str) -> List[str]:
        if len(text) <= self.chunk_size:
            return [text]

        # Break text into paragraphs
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
        result_chunks: List[str] = []
        current_chunk = ""

        for para in paragraphs:
            if len(para) > self.chunk_size:
                # If paragraph itself is too large, split by sentences
                sentences = re.split(r"(?<=[.?!])\s+", para)
                for sentence in sentences:
                    sentence = sentence.strip()
                    if not sentence:
                        continue
                    if len(current_chunk) + len(sentence) + 1 <= self.chunk_size:
                        current_chunk = f"{current_chunk} {sentence}".strip()
                    else:
                        if current_chunk:
                            result_chunks.append(current_chunk)
                        # Start new chunk with overlap if possible
                        overlap_seed = self._get_overlap_tail(current_chunk)
                        current_chunk = f"{overlap_seed} {sentence}".strip()
            else:
                if len(current_chunk) + len(para) + 2 <= self.chunk_size:
                    current_chunk = f"{current_chunk}\n\n{para}".strip()
                else:
                    if current_chunk:
                        result_chunks.append(current_chunk)
                    overlap_seed = self._get_overlap_tail(current_chunk)
                    current_chunk = f"{overlap_seed}\n\n{para}".strip()

        if current_chunk:
            result_chunks.append(current_chunk)

        return result_chunks

    def _get_overlap_tail(self, text: str) -> str:
        if not text or self.chunk_overlap <= 0:
            return ""
        if len(text) <= self.chunk_overlap:
            return text
        tail = text[-self.chunk_overlap:]
        # Trim to nearest word boundary
        first_space = tail.find(" ")
        if first_space != -1 and first_space < len(tail) - 5:
            return tail[first_space + 1:].strip()
        return tail.strip()
