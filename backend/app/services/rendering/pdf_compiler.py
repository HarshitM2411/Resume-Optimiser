import asyncio
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from app.core.logging import get_logger
from app.core.exceptions import PDFCompilationError

logger = get_logger(__name__)

COMPILATION_TIMEOUT_SECONDS = 120
_TOOLS_DIR = Path(__file__).resolve().parents[3] / "tools"
_LOCAL_TECTONIC = _TOOLS_DIR / ("tectonic.exe" if sys.platform == "win32" else "tectonic")


def _resolve_tectonic() -> str:
    if _LOCAL_TECTONIC.is_file():
        return str(_LOCAL_TECTONIC)

    tectonic = shutil.which("tectonic")
    if tectonic is None:
        raise FileNotFoundError("tectonic")
    return tectonic


def _run_tectonic(tex_path: Path, out_dir: Path) -> subprocess.CompletedProcess[bytes]:
    tectonic = _resolve_tectonic()

    return subprocess.run(
        [
            tectonic,
            str(tex_path),
            "--outdir",
            str(out_dir),
            "--keep-logs",
        ],
        capture_output=True,
        cwd=str(out_dir),
        timeout=COMPILATION_TIMEOUT_SECONDS,
        check=False,
    )


async def compile_pdf(latex_source: str) -> bytes:
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        tex_path = tmp_path / "resume.tex"
        tex_path.write_text(latex_source, encoding="utf-8")

        try:
            result = await asyncio.to_thread(_run_tectonic, tex_path, tmp_path)
        except FileNotFoundError as exc:
            logger.error(
                "tectonic_not_found",
                service="rendering",
                operation="compile_pdf",
                error="tectonic executable not found on PATH",
            )
            raise PDFCompilationError(
                "PDF compiler is not installed. Install tectonic and restart the server."
            ) from exc
        except subprocess.TimeoutExpired as exc:
            logger.error(
                "tectonic_compilation_timed_out",
                service="rendering",
                operation="compile_pdf",
                error="timeout",
            )
            raise PDFCompilationError() from exc

        if result.returncode != 0:
            stderr_text = result.stderr.decode(errors="replace")
            logger.error(
                "tectonic_compilation_failed",
                service="rendering",
                operation="compile_pdf",
                stderr=stderr_text,
                error=stderr_text,
            )
            raise PDFCompilationError()

        pdf_path = tmp_path / "resume.pdf"
        if not pdf_path.exists():
            logger.error(
                "tectonic_pdf_missing",
                service="rendering",
                operation="compile_pdf",
                error="resume.pdf not produced",
            )
            raise PDFCompilationError()

        return pdf_path.read_bytes()
