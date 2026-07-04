import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from app.core.logging import get_logger

logger = get_logger(__name__)


@asynccontextmanager
async def log_operation(
    *,
    service: str,
    operation: str,
    user_id: str | None = None,
    resume_id: str | None = None,
) -> AsyncIterator[None]:
    start = time.perf_counter()
    try:
        yield
    except Exception as exc:
        duration_ms = int((time.perf_counter() - start) * 1000)
        logger.error(
            "operation_failed",
            service=service,
            operation=operation,
            duration_ms=duration_ms,
            error=str(exc),
            user_id=user_id,
            resume_id=resume_id,
        )
        raise
    else:
        duration_ms = int((time.perf_counter() - start) * 1000)
        logger.info(
            "operation_completed",
            service=service,
            operation=operation,
            duration_ms=duration_ms,
            error=None,
            user_id=user_id,
            resume_id=resume_id,
        )
