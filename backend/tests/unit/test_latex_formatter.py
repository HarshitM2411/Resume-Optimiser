import re

import pytest

from app.models.domain.resume import (
    ContactSchema,
    EducationEntry,
    ProjectEntry,
    ResumeSchema,
    SkillsSchema,
    WorkExperienceEntry,
)
from app.services.rendering.latex_formatter import (
    LATEX_SPECIAL_CHARS,
    escape_latex,
    render_resume_latex,
)

SPECIAL_INPUT = r"\ & % $ # _ { } ^ ~"


@pytest.mark.parametrize(
    ("char", "escaped"),
    [
        ("\\", r"\textbackslash{}"),
        ("&", r"\&"),
        ("%", r"\%"),
        ("$", r"\$"),
        ("#", r"\#"),
        ("_", r"\_"),
        ("{", r"\{"),
        ("}", r"\}"),
        ("^", r"\^{}"),
        ("~", r"\textasciitilde{}"),
    ],
)
def test_escape_latex_escapes_each_special_character(char: str, escaped: str) -> None:
    assert escape_latex(char) == escaped


def test_escape_latex_handles_multiple_specials_in_one_string() -> None:
    result = escape_latex(SPECIAL_INPUT)

    for char in SPECIAL_INPUT.split():
        assert LATEX_SPECIAL_CHARS[char] in result


def test_escape_latex_empty_string() -> None:
    assert escape_latex("") == ""


def test_escape_latex_does_not_double_escape_backslash_replacements() -> None:
    once = escape_latex("100% & revenue")
    assert once == r"100\% \& revenue"
    assert r"\textbackslash{}textbackslash" not in once


def test_render_resume_latex_escapes_adversarial_user_content() -> None:
    resume = ResumeSchema(
        contact=ContactSchema(
            name="Jane_Doe & Co.",
            email="jane@example.com",
            phone="100% #1",
            location="Austin^TX",
            linkedin="https://linkedin.com/in/jane",
            github="github.com/jane",
            website="https://jane.dev/~me",
        ),
        summary="Built APIs with $5M impact & 50% latency gains.",
        work_experience=[
            WorkExperienceEntry(
                company="Acme_Corp",
                title="Engineer #1",
                duration="2021{present}",
                location="NYC~NY",
                bullets=[r"Improved deploy speed by 40% & reliability"],
            )
        ],
        education=[
            EducationEntry(
                institution="MIT",
                degree="B.S.",
                field="CS & Math",
                graduation_year="2020",
            )
        ],
        skills=SkillsSchema(
            languages=["C++"],
            frameworks=["FastAPI"],
            tools=["Docker & K8s"],
            other=["CI/CD"],
        ),
        projects=[
            ProjectEntry(
                name="Resume_100%",
                description="AI tool with $0 budget",
                tech_stack=["Python"],
                url="https://example.com/app?id=1&view=all",
            )
        ],
        achievements=["Award #1 for 100% uptime"],
        certifications=["AWS Certified {Solutions}"],
    )

    rendered = render_resume_latex(resume)

    assert r"Jane\_Doe \& Co." in rendered
    assert r"100\%" in rendered
    assert r"\$5M" in rendered
    assert r"Acme\_Corp" in rendered
    assert r"2021\{present\}" in rendered
    assert r"Docker \& K8s" in rendered
    assert r"Resume\_100\%" in rendered
    assert r"AWS Certified \{Solutions\}" in rendered
    assert re.search(r"(?<!\\)%", rendered) is None
    assert re.search(r"(?<!\\)&", rendered) is None
