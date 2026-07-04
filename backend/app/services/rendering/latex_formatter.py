from pathlib import Path

import jinja2

from app.models.domain.resume import (
    ContactSchema,
    EducationEntry,
    ProjectEntry,
    ResumeSchema,
    SkillsSchema,
    WorkExperienceEntry,
)

LATEX_SPECIAL_CHARS = {
    "\\": r"\textbackslash{}",
    "&": r"\&",
    "%": r"\%",
    "$": r"\$",
    "#": r"\#",
    "_": r"\_",
    "{": r"\{",
    "}": r"\}",
    "^": r"\^{}",
    "~": r"\textasciitilde{}",
}

TEMPLATE_DIR = Path(__file__).resolve().parents[2] / "templates"
_BACKSLASH_PLACEHOLDER = "\uE000"


def escape_latex(text: str) -> str:
    result = text.replace("\\", _BACKSLASH_PLACEHOLDER)
    for char, replacement in LATEX_SPECIAL_CHARS.items():
        if char != "\\":
            result = result.replace(char, replacement)
    return result.replace(_BACKSLASH_PLACEHOLDER, LATEX_SPECIAL_CHARS["\\"])


def format_contact_block(contact: ContactSchema) -> str:
    name = escape_latex(contact.name)
    lines = [rf"{{\LARGE {name}}}\\[0.25em]"]

    contact_parts: list[str] = []
    if contact.email:
        contact_parts.append(escape_latex(contact.email))
    if contact.phone:
        contact_parts.append(escape_latex(contact.phone))
    if contact.location:
        contact_parts.append(escape_latex(contact.location))

    link_parts: list[str] = []
    if contact.linkedin:
        link_parts.append(escape_latex(contact.linkedin))
    if contact.github:
        link_parts.append(escape_latex(contact.github))
    if contact.website:
        link_parts.append(escape_latex(contact.website))

    if contact_parts and link_parts:
        lines.append(" \\textbar{} ".join(contact_parts) + "\\\\")
        lines.append(" \\textbar{} ".join(link_parts))
    elif contact_parts:
        lines.append(" \\textbar{} ".join(contact_parts))
    elif link_parts:
        lines.append(" \\textbar{} ".join(link_parts))

    return "\n".join(lines)


def format_summary(summary: str | None) -> str:
    if not summary:
        return ""
    return escape_latex(summary)


def format_work_experience(entries: list[WorkExperienceEntry]) -> str:
    if not entries:
        return ""

    blocks: list[str] = []
    for entry in entries:
        header = (
            rf"\textbf{{{escape_latex(entry.company)}}} \hfill {escape_latex(entry.duration)}\\"
        )
        subheader = rf"\textit{{{escape_latex(entry.title)}}}"
        if entry.location:
            subheader += rf" \hfill {escape_latex(entry.location)}"
        subheader += "\\\\[0.2em]"

        bullets = ""
        if entry.bullets:
            items = "\n".join(
                rf"\item {escape_latex(bullet)}" for bullet in entry.bullets
            )
            bullets = f"\\begin{{itemize}}[leftmargin=*]\n{items}\n\\end{{itemize}}"

        blocks.append(f"{header}\n{subheader}\n{bullets}")

    return "\n\n".join(blocks)


def format_skills(skills: SkillsSchema) -> str:
    lines: list[str] = []
    categories = [
        ("Languages", skills.languages),
        ("Frameworks", skills.frameworks),
        ("Tools", skills.tools),
        ("Other", skills.other),
    ]
    for label, values in categories:
        if values:
            escaped = ", ".join(escape_latex(value) for value in values)
            lines.append(rf"\textbf{{{label}:}} {escaped}")
    return " \\\\\n".join(lines)


def format_education(entries: list[EducationEntry]) -> str:
    if not entries:
        return ""

    blocks: list[str] = []
    for entry in entries:
        institution = escape_latex(entry.institution)
        degree = escape_latex(entry.degree)
        line = rf"\textbf{{{institution}}} \hfill {escape_latex(entry.graduation_year or '')}\\"
        details = degree
        if entry.field:
            details += f", {escape_latex(entry.field)}"
        line += f"\n{details}"
        blocks.append(line)
    return "\n\n".join(blocks)


def format_projects(entries: list[ProjectEntry]) -> str:
    if not entries:
        return ""

    blocks: list[str] = []
    for entry in entries:
        parts = [
            rf"\textbf{{{escape_latex(entry.name)}}}",
            escape_latex(entry.description),
        ]
        if entry.tech_stack:
            stack = ", ".join(escape_latex(item) for item in entry.tech_stack)
            parts.append(rf"\textit{{Tech: {stack}}}")
        if entry.url:
            parts.append(escape_latex(entry.url))
        blocks.append(" \\\\\n".join(parts))
    return "\n\n".join(blocks)


def format_achievements(entries: list[str]) -> str:
    if not entries:
        return ""
    items = "\n".join(rf"\item {escape_latex(item)}" for item in entries)
    return f"\\begin{{itemize}}[leftmargin=*]\n{items}\n\\end{{itemize}}"


def format_certifications(entries: list[str]) -> str:
    if not entries:
        return ""
    items = "\n".join(rf"\item {escape_latex(item)}" for item in entries)
    return f"\\begin{{itemize}}[leftmargin=*]\n{items}\n\\end{{itemize}}"


def build_template_context(resume: ResumeSchema) -> dict[str, str]:
    return {
        "contact_block": format_contact_block(resume.contact),
        "summary": format_summary(resume.summary),
        "work_experience_block": format_work_experience(resume.work_experience),
        "skills_block": format_skills(resume.skills),
        "education_block": format_education(resume.education),
        "projects_block": format_projects(resume.projects),
        "achievements_block": format_achievements(resume.achievements),
        "certifications_block": format_certifications(resume.certifications),
    }


def render_resume_latex(resume: ResumeSchema) -> str:
    env = jinja2.Environment(
        loader=jinja2.FileSystemLoader(str(TEMPLATE_DIR)),
        autoescape=False,
        undefined=jinja2.StrictUndefined,
    )
    template = env.get_template("resume.tex")
    return template.render(**build_template_context(resume))
