from abc import ABC, abstractmethod
from typing import Any

from app.models.domain.resume import ResumeSchema


class BaseTool(ABC):
    @abstractmethod
    async def invoke(
        self,
        resume: ResumeSchema,
        section: str,
        params: dict[str, Any],
    ) -> Any:
        raise NotImplementedError
