"""PDF text extraction using PyMuPDF."""

import fitz  # PyMuPDF


def extract_text_from_bytes(pdf_bytes: bytes) -> str:
    """Extract all text from PDF bytes."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    text_parts = []
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text")
        if text.strip():
            text_parts.append(f"--- Page {page_num + 1} ---\n{text}")
    doc.close()
    return "\n\n".join(text_parts)


def extract_text_from_file(file_path: str) -> str:
    """Extract all text from a PDF file path."""
    with open(file_path, "rb") as f:
        return extract_text_from_bytes(f.read())
