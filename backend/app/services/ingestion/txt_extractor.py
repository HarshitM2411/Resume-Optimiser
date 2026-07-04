import re

from app.core.exceptions import InvalidTextEncodingError


def extract_txt_text(data: bytes) -> str:
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise InvalidTextEncodingError() from exc

    normalized = re.sub(r"[ \t]+", " ", text)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    return normalized.strip()
