from app.models.domain.resume import ContactSchema, ProjectEntry, ResumeSchema, SkillsSchema
from app.services.tailoring.diff_utils import compute_diff, merge_fragment


def test_compute_diff_detects_changed_summary() -> None:
    before = ResumeSchema(
        contact=ContactSchema(name="Jane Doe", email="jane@example.com"),
        summary="Old summary",
    )
    after = before.model_copy(update={"summary": "New summary"})

    diff = compute_diff(before, after)

    assert len(diff) == 1
    assert diff[0].section == "summary"
    assert diff[0].before == "Old summary"
    assert diff[0].after == "New summary"


def test_merge_fragment_adds_work_experience_entry(sample_resume: ResumeSchema) -> None:
    new_entry = {
        "company": "Beta Inc",
        "title": "Intern",
        "duration": "2020",
        "location": None,
        "bullets": ["Wrote scripts"],
    }

    updated = merge_fragment(sample_resume, "work_experience", "add", new_entry)

    assert len(updated.work_experience) == 2
    assert updated.work_experience[-1].company == "Beta Inc"


def test_merge_fragment_removes_project_entry(sample_resume: ResumeSchema) -> None:
    resume = sample_resume.model_copy(
        update={
            "projects": [
                ProjectEntry(
                    name="Resume App",
                    description="AI resume tool",
                    tech_stack=["Python"],
                )
            ]
        }
    )
    updated = merge_fragment(resume, "projects", "remove", [])

    assert updated.projects == []
