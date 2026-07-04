import type { JDAnalysisSchema, ResumeSchema } from "@/types/resume";

function normalizeSkill(value: string): string {
  return value.trim().toLowerCase();
}

function collectResumeSkills(resume: ResumeSchema): string[] {
  return [
    ...resume.skills.languages,
    ...resume.skills.frameworks,
    ...resume.skills.tools,
    ...resume.skills.other,
    ...resume.projects.flatMap((project) => project.tech_stack),
  ]
    .map(normalizeSkill)
    .filter(Boolean);
}

function skillMatches(resumeSkills: string[], target: string): boolean {
  const needle = normalizeSkill(target);
  if (!needle) return false;

  return resumeSkills.some(
    (skill) => skill.includes(needle) || needle.includes(skill),
  );
}

/** Estimate resume–JD alignment from must-have and nice-to-have skill overlap. */
export function computeMatchScore(
  resume: ResumeSchema,
  analysis: JDAnalysisSchema,
): number {
  const resumeSkills = collectResumeSkills(resume);
  const mustHave = analysis.must_have_skills;
  const niceToHave = analysis.nice_to_have_skills;

  if (mustHave.length === 0 && niceToHave.length === 0) {
    return 72;
  }

  const mustMatched = mustHave.filter((skill) =>
    skillMatches(resumeSkills, skill),
  ).length;
  const niceMatched = niceToHave.filter((skill) =>
    skillMatches(resumeSkills, skill),
  ).length;

  const mustWeight = mustHave.length > 0 ? 0.8 : 0;
  const niceWeight = mustHave.length > 0 ? 0.2 : 1;

  const mustRatio = mustHave.length > 0 ? mustMatched / mustHave.length : 0;
  const niceRatio = niceToHave.length > 0 ? niceMatched / niceToHave.length : 0;

  const score = Math.round((mustRatio * mustWeight + niceRatio * niceWeight) * 100);
  return Math.min(96, Math.max(28, score));
}
