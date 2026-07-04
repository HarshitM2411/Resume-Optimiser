from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.models.domain.diff import PendingEditResponse
from app.models.domain.jd import JDAnalysisSchema
from app.models.domain.resume import ResumeSchema
from app.services.tailoring.tools.section_rewriter import SectionRewriter

MINIMAL_PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"


@pytest.mark.asyncio
async def test_full_upload_tailor_edit_pdf_flow(
    text_pdf_bytes: bytes,
    sample_resume: ResumeSchema,
    sample_jd: JDAnalysisSchema,
) -> None:
    transport = ASGITransport(app=app)
    tailored = sample_resume.model_copy(
        update={"summary": "Senior backend engineer aligned to the role."},
    )
    edited = tailored.model_copy(
        update={"summary": "Senior backend engineer with API platform expertise."},
    )

    with (
        patch("app.api.v1.routers.parse.ResumeParser") as parser_cls,
        patch("app.api.v1.routers.tailor.JDAnalyzer") as analyzer_cls,
        patch("app.services.tailoring.orchestrator.JDTailor.tailor", AsyncMock(return_value=tailored)),
        patch.object(
            SectionRewriter,
            "invoke",
            AsyncMock(return_value="Senior backend engineer with API platform expertise."),
        ),
        patch("app.api.v1.routers.pdf.compile_pdf", AsyncMock(return_value=MINIMAL_PDF)),
    ):
        parser_cls.return_value.parse = AsyncMock(return_value=sample_resume)
        analyzer_cls.return_value.analyze = AsyncMock(return_value=sample_jd)

        async with AsyncClient(
            transport=transport,
            base_url="http://test",
            headers={"Host": "localhost"},
        ) as client:
            parse_response = await client.post(
                "/api/v1/parse",
                files={"file": ("resume.pdf", text_pdf_bytes, "application/pdf")},
            )
            assert parse_response.status_code == 200
            resume_json = parse_response.json()["resume_json"]

            tailor_response = await client.post(
                "/api/v1/tailor",
                json={
                    "resume_json": resume_json,
                    "jd_text": "Senior Backend Engineer with Python and FastAPI.",
                },
            )
            assert tailor_response.status_code == 200
            tailored_json = tailor_response.json()["proposed_resume_json"]
            assert tailored_json["summary"] == tailored.summary

            edit_response = await client.post(
                "/api/v1/edit",
                json={
                    "resume_json": tailored_json,
                    "section": "summary",
                    "action": "rewrite",
                    "instruction": "Emphasize API platform experience.",
                },
            )
            assert edit_response.status_code == 200
            edited_body = edit_response.json()
            assert edited_body["proposed_resume_json"]["summary"] == edited.summary
            assert len(edited_body["diff"]) >= 1

            pdf_response = await client.post(
                "/api/v1/pdf",
                json={"resume_json": edited_body["proposed_resume_json"]},
            )

    assert pdf_response.status_code == 200
    assert pdf_response.headers["content-type"] == "application/pdf"
    assert pdf_response.content.startswith(b"%PDF-")
    assert len(pdf_response.content) > 0
