from typing import Any

from app.models.domain.template import TemplateFieldDef, TemplateFormData, TemplateSchema
from app.services.rendering.latex_formatter import escape_latex


def validate_required_fields(
    data: TemplateFormData,
    schema: TemplateSchema,
) -> list[str]:
    missing: list[str] = []

    for field in schema.fields:
        if not field.required:
            continue
        value = data.values.get(field.key)
        if _is_blank(value):
            missing.append(field.key)

    return missing


def render_template_latex(data: TemplateFormData, schema: TemplateSchema) -> str:
    if data.template_id != schema.template_id:
        raise ValueError("Form data template_id does not match schema.")

    body_sections: list[str] = []
    layout_sections = schema.layout_sections or _default_layout(schema)

    for layout in layout_sections:
        section_fields = [field for field in schema.fields if field.section in _section_names(layout, schema)]
        if not section_fields:
            section_fields = _fields_for_layout(layout, schema)

        rendered = _render_layout_section(layout, section_fields, data.values)
        if rendered:
            title = escape_latex(layout.section_title)
            if layout.layout not in {"contact_header", "summary"}:
                body_sections.append(rf"\resumesection{{{title}}}")
            body_sections.append(rendered)

    body = "\n\n".join(body_sections)

    return rf"""\documentclass[10pt,letterpaper]{{article}}
\usepackage[margin=0.55in]{{geometry}}
\usepackage[T1]{{fontenc}}
\usepackage{{tgtermes}}
\usepackage{{enumitem}}
\usepackage{{tabularx}}
\usepackage[hidelinks]{{hyperref}}

\setlength{{\parindent}}{{0pt}}
\setlength{{\parskip}}{{0pt}}
\pagestyle{{empty}}

\newcommand{{\resumesection}}[1]{{%
  \vspace{{8pt}}%
  {{\fontsize{{10.5}}{{12}}\selectfont\bfseries #1\par}}%
  \vspace{{2pt}}%
}}

\begin{{document}}

{body}

\end{{document}}
"""


def _default_layout(schema: TemplateSchema):
    from app.models.domain.template import TemplateLayoutSection

    layouts: list[TemplateLayoutSection] = []
    for order, section in enumerate(schema.sections):
        section_fields = [field for field in schema.fields if field.section == section]
        layout = "labeled_lines"
        lower = section.lower()
        if lower in {"contact", "header"}:
            layout = "contact_header"
        elif any(field.field_type == "entry_list" for field in section_fields):
            layout = "entry_list"
        elif lower in {"summary", "objective"}:
            layout = "summary"
        elif lower in {"skills"}:
            layout = "skill_categories"

        layouts.append(
            TemplateLayoutSection(
                section_key=section.lower().replace(" ", "_"),
                section_title=section.upper(),
                layout=layout,
                order=order,
            )
        )
    return layouts


def _section_names(layout, schema: TemplateSchema) -> set[str]:
    names = {layout.section_key, layout.section_title}
    for section in schema.sections:
        if section.lower().replace(" ", "_") == layout.section_key:
            names.add(section)
    return names


def _fields_for_layout(layout, schema: TemplateSchema) -> list[TemplateFieldDef]:
    names = _section_names(layout, schema)
    return [field for field in schema.fields if field.section in names]


def _render_layout_section(
    layout,
    fields: list[TemplateFieldDef],
    values: dict[str, Any],
) -> str:
    if layout.layout == "contact_header":
        return _render_contact_header(fields, values)
    if layout.layout == "summary":
        return _render_summary(fields, values)
    if layout.layout == "entry_list":
        return _render_entry_list(fields, values)
    if layout.layout == "skill_categories":
        return _render_skill_categories(fields, values)
    return _render_labeled_lines(fields, values)


def _render_contact_header(fields: list[TemplateFieldDef], values: dict[str, Any]) -> str:
    name = _resolve_full_name(fields, values)

    contact_parts: list[str] = []
    for field in fields:
        if field.key in {"first_name", "last_name", "contact_name", "name", "full_name"}:
            continue
        value = _scalar(values, field.key)
        if value:
            contact_parts.append(escape_latex(value))

    contact_line = " \\textbar{} ".join(contact_parts)
    return (
        rf"\begin{{center}}"
        rf"{{\fontsize{{14.9}}{{16}}\selectfont\bfseries {escape_latex(name)}\par}}"
        rf"\vspace{{4pt}}"
        rf"{{\fontsize{{8}}{{9}}\selectfont\rmfamily {contact_line}\par}}"
        rf"\end{{center}}"
    )


def _resolve_full_name(fields: list[TemplateFieldDef], values: dict[str, Any]) -> str:
    for key in ("contact_name", "full_name", "name"):
        value = _scalar(values, key)
        if value:
            return value

    first_name = _scalar(values, "first_name")
    last_name = _scalar(values, "last_name")
    combined = " ".join(part for part in (first_name, last_name) if part)
    if combined:
        return combined

    name_field = _first_field(fields, {"contact_name", "full_name", "name"})
    if name_field:
        return _scalar(values, name_field.key)

    return ""


def _render_summary(fields: list[TemplateFieldDef], values: dict[str, Any]) -> str:
    chunks: list[str] = []
    for field in fields:
        value = _scalar(values, field.key)
        if value:
            chunks.append(
                rf"\noindent{{\fontsize{{12}}{{14}}\selectfont\rmfamily "
                rf"{escape_latex(value)}\par\vspace{{6pt}}}}"
            )
    return "\n".join(chunks)


def _render_labeled_lines(fields: list[TemplateFieldDef], values: dict[str, Any]) -> str:
    lines: list[str] = []
    for field in fields:
        value = _scalar(values, field.key)
        if not value:
            continue
        label = escape_latex(field.label.rstrip(":"))
        lines.append(
            rf"\noindent{{\fontsize{{10}}{{12}}\selectfont\rmfamily "
            rf"\textbf{{{label}:}} {escape_latex(value)}\par\vspace{{2pt}}}}"
        )
    return "\n".join(lines)


def _render_skill_categories(fields: list[TemplateFieldDef], values: dict[str, Any]) -> str:
    lines: list[str] = []
    for field in fields:
        value = _scalar(values, field.key)
        if not value:
            continue
        label = escape_latex(field.label)
        lines.append(
            rf"\noindent{{\fontsize{{10}}{{12}}\selectfont\textbf{{{label}}}\par}}"
            rf"\vspace{{1pt}}"
            rf"\noindent{{\fontsize{{10}}{{12}}\selectfont\rmfamily "
            rf"{escape_latex(value)}\par\vspace{{4pt}}}}"
        )
    return "\n".join(lines)


def _render_entry_list(fields: list[TemplateFieldDef], values: dict[str, Any]) -> str:
    blocks: list[str] = []
    for field in fields:
        if field.field_type != "entry_list":
            continue
        entries = values.get(field.key, [])
        if not isinstance(entries, list):
            continue
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            blocks.append(_render_single_entry(entry, field.entry_fields))
    return "\n".join(block for block in blocks if block)


def _render_single_entry(entry: dict[str, Any], entry_fields: list) -> str:
    header_parts: list[str] = []
    date_value = ""
    gpa_value = ""
    bullets: list[str] = []

    date_keys = {"dates", "date", "duration", "employment_dates", "graduation_date"}
    gpa_keys = {"gpa"}

    for entry_field in entry_fields:
        value = entry.get(entry_field.key)
        if entry_field.field_type == "bullets":
            if isinstance(value, list):
                bullets = [str(item).strip() for item in value if str(item).strip()]
            continue
        if entry_field.key in date_keys and isinstance(value, str):
            date_value = value.strip()
            continue
        if entry_field.key in gpa_keys and isinstance(value, str):
            gpa_value = value.strip()
            continue
        if isinstance(value, str) and value.strip():
            header_parts.append(escape_latex(value.strip()))

    if not header_parts and not date_value and not gpa_value and not bullets:
        return ""

    if len(header_parts) >= 2 and gpa_value:
        header = f"{header_parts[0]}, {header_parts[1]}"
        if len(header_parts) > 2:
            header += f" \\textbar{{}} {header_parts[2]}"
    elif len(header_parts) >= 2:
        header = f"{header_parts[0]}, {header_parts[1]}"
    elif header_parts:
        header = header_parts[0]
    else:
        header = ""

    bullet_block = ""
    if bullets:
        items = "\n".join(rf"\item {escape_latex(bullet)}" for bullet in bullets)
        bullet_block = (
            rf"\begin{{itemize}}[leftmargin=*, nosep, topsep=2pt]"
            rf"\fontsize{{10.5}}{{12}}\selectfont\rmfamily"
            rf"{items}\end{{itemize}}"
        )

    date_line = escape_latex(date_value)
    gpa_line = escape_latex(gpa_value)

    if gpa_value and header:
        return (
            rf"\noindent\begin{{tabularx}}{{\textwidth}}{{@{{}}X r r@{{}} }}"
            rf"{header} & {gpa_line} & {date_line}\\"
            rf"\end{{tabularx}}\vspace{{4pt}}"
        )

    return (
        rf"\noindent{{\fontsize{{10.5}}{{12}}\selectfont\textbf{{{header}}}\par}}"
        rf"\vspace{{1pt}}"
        rf"\noindent{{\fontsize{{9.5}}{{11}}\selectfont\rmfamily {date_line}\par}}"
        rf"{bullet_block}\vspace{{4pt}}"
    )


def _first_field(fields: list[TemplateFieldDef], keys: set[str]) -> TemplateFieldDef | None:
    for field in fields:
        if field.key in keys:
            return field
    return None


def _scalar(values: dict[str, Any], key: str) -> str:
    value = values.get(key, "")
    if isinstance(value, str):
        return value.strip()
    if value is None:
        return ""
    return str(value).strip()


def _is_blank(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    if isinstance(value, list):
        return len(value) == 0
    return False
