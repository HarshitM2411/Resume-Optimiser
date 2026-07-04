import pytest

from app.core.operation_log import log_operation


@pytest.mark.asyncio
async def test_log_operation_emits_success() -> None:
    async with log_operation(service="test", operation="success_op"):
        pass


@pytest.mark.asyncio
async def test_log_operation_reraises_errors() -> None:
    with pytest.raises(ValueError, match="boom"):
        async with log_operation(service="test", operation="failing_op"):
            raise ValueError("boom")
