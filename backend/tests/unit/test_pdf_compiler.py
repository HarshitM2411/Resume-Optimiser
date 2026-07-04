import subprocess
from pathlib import Path
from unittest.mock import patch

import pytest

from app.core.exceptions import PDFCompilationError
from app.services.rendering.pdf_compiler import compile_pdf


@pytest.mark.asyncio
async def test_compile_pdf_returns_pdf_bytes() -> None:
    def fake_run_tectonic(tex_path: Path, out_dir: Path) -> subprocess.CompletedProcess[bytes]:
        (out_dir / "resume.pdf").write_bytes(b"%PDF-1.4 test content")
        return subprocess.CompletedProcess(
            args=["tectonic"],
            returncode=0,
            stdout=b"",
            stderr=b"",
        )

    with patch(
        "app.services.rendering.pdf_compiler._run_tectonic",
        side_effect=fake_run_tectonic,
    ):
        pdf_bytes = await compile_pdf(
            r"\documentclass{article}\begin{document}Hello\end{document}"
        )

    assert pdf_bytes.startswith(b"%PDF-")


@pytest.mark.asyncio
async def test_compile_pdf_raises_on_non_zero_exit() -> None:
    failed = subprocess.CompletedProcess(
        args=["tectonic"],
        returncode=1,
        stdout=b"",
        stderr=b"LaTeX Error",
    )

    with (
        patch(
            "app.services.rendering.pdf_compiler._run_tectonic",
            return_value=failed,
        ),
        pytest.raises(PDFCompilationError),
    ):
        await compile_pdf(r"\documentclass{article}\begin{document}Bad\end{document}")


@pytest.mark.asyncio
async def test_compile_pdf_raises_on_timeout() -> None:
    with (
        patch(
            "app.services.rendering.pdf_compiler._run_tectonic",
            side_effect=subprocess.TimeoutExpired(cmd="tectonic", timeout=30),
        ),
        pytest.raises(PDFCompilationError),
    ):
        await compile_pdf(r"\documentclass{article}\begin{document}Slow\end{document}")


@pytest.mark.asyncio
async def test_compile_pdf_raises_when_tectonic_missing() -> None:
    with (
        patch(
            "app.services.rendering.pdf_compiler._run_tectonic",
            side_effect=FileNotFoundError("tectonic"),
        ),
        pytest.raises(PDFCompilationError, match="not installed"),
    ):
        await compile_pdf(r"\documentclass{article}\begin{document}Hello\end{document}")
