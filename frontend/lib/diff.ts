import type {
  DiffItem,
  ResumeSchema,
  SkillsSchema,
  WorkExperienceEntry,
} from "@/types/resume";

export type DiffToken = {
  type: "equal" | "added" | "removed";
  text: string;
};

export type ReviewSectionId =
  | "contact"
  | "summary"
  | "work_experience"
  | "education"
  | "skills"
  | "projects"
  | "achievements"
  | "certifications";

export const REVIEW_SECTIONS: {
  id: ReviewSectionId;
  label: string;
}[] = [
  { id: "contact", label: "Contact" },
  { id: "summary", label: "Summary" },
  { id: "work_experience", label: "Experience" },
  { id: "education", label: "Education" },
  { id: "skills", label: "Skills" },
  { id: "projects", label: "Projects" },
  { id: "achievements", label: "Achievements" },
  { id: "certifications", label: "Certifications" },
];

export function formatDiffValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value, null, 2);
}

export function getRootSection(path: string): string {
  return path.split(/[.[\]]/).filter(Boolean)[0] ?? path;
}

export function countChangesBySection(
  diff: DiffItem[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of diff) {
    const root = getRootSection(item.section);
    counts[root] = (counts[root] ?? 0) + 1;
  }
  return counts;
}

export function sectionsWithChanges(diff: DiffItem[]): ReviewSectionId[] {
  const counts = countChangesBySection(diff);
  return REVIEW_SECTIONS.map((section) => section.id).filter(
    (id) => (counts[id] ?? 0) > 0,
  );
}

export function changeBadgeLabel(count: number): string {
  if (count === 1) return "1 CHANGE";
  return `${count} UPDATES`;
}

export function skillList(skills: SkillsSchema): string[] {
  return [
    ...skills.languages,
    ...skills.frameworks,
    ...skills.tools,
    ...skills.other,
  ];
}

export function wordDiff(before: string, after: string): DiffToken[] {
  if (before === after) {
    return [{ type: "equal", text: after }];
  }

  const beforeTokens = tokenize(before);
  const afterTokens = tokenize(after);
  const lcs = buildLcsTable(beforeTokens, afterTokens);

  const tokens: DiffToken[] = [];
  let i = beforeTokens.length;
  let j = afterTokens.length;

  const stack: DiffToken[] = [];
  while (i > 0 || j > 0) {
    if (
      i > 0 &&
      j > 0 &&
      beforeTokens[i - 1] === afterTokens[j - 1]
    ) {
      stack.push({ type: "equal", text: beforeTokens[i - 1] });
      i -= 1;
      j -= 1;
    } else if (
      j > 0 &&
      (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])
    ) {
      stack.push({ type: "added", text: afterTokens[j - 1] });
      j -= 1;
    } else if (i > 0) {
      stack.push({ type: "removed", text: beforeTokens[i - 1] });
      i -= 1;
    }
  }

  for (let index = stack.length - 1; index >= 0; index -= 1) {
    const token = stack[index];
    const previous = tokens[tokens.length - 1];
    if (previous && previous.type === token.type) {
      previous.text += token.text;
    } else {
      tokens.push({ ...token });
    }
  }

  return tokens;
}

function tokenize(text: string): string[] {
  return text.split(/(\s+)/).filter((part) => part.length > 0);
}

function buildLcsTable(a: string[], b: string[]): number[][] {
  const table = Array.from({ length: a.length + 1 }, () =>
    Array<number>(b.length + 1).fill(0),
  );

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        table[i][j] = table[i - 1][j - 1] + 1;
      } else {
        table[i][j] = Math.max(table[i - 1][j], table[i][j - 1]);
      }
    }
  }

  return table;
}

export function summarizeDiff(diff: DiffItem[]): {
  sectionCount: number;
  changeCount: number;
  summary: string;
} {
  const sectionCount = sectionsWithChanges(diff).length;
  const changeCount = diff.length;
  const roots = sectionsWithChanges(diff);
  const labels = roots
    .map((id) => REVIEW_SECTIONS.find((section) => section.id === id)?.label)
    .filter(Boolean);

  let summary = "Review proposed updates";
  if (labels.length === 1) {
    summary = `${labels[0]} updated`;
  } else if (labels.length === 2) {
    summary = `${labels[0]} and ${labels[1]} updated`;
  } else if (labels.length > 2) {
    summary = `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)} updated`;
  }

  return { sectionCount, changeCount, summary };
}

export function applySectionOverrides(
  original: ResumeSchema,
  proposed: ResumeSchema,
  undoneSections: Set<string>,
): ResumeSchema {
  if (undoneSections.size === 0) {
    return proposed;
  }

  const next: ResumeSchema = structuredClone(proposed);
  for (const section of undoneSections) {
    switch (section) {
      case "contact":
        next.contact = structuredClone(original.contact);
        break;
      case "summary":
        next.summary = original.summary;
        break;
      case "work_experience":
        next.work_experience = structuredClone(original.work_experience);
        break;
      case "education":
        next.education = structuredClone(original.education);
        break;
      case "skills":
        next.skills = structuredClone(original.skills);
        break;
      case "projects":
        next.projects = structuredClone(original.projects);
        break;
      case "achievements":
        next.achievements = [...original.achievements];
        break;
      case "certifications":
        next.certifications = [...original.certifications];
        break;
      default:
        break;
    }
  }
  return next;
}

export function experienceMeta(entry: WorkExperienceEntry): string {
  return [entry.company, entry.duration].filter(Boolean).join(" · ");
}

export type PendingBulletTarget = {
  entryIndex: number;
  bulletIndex: number;
};

export function pendingBulletTargets(diff: DiffItem[]): PendingBulletTarget[] {
  const targets: PendingBulletTarget[] = [];
  for (const item of diff) {
    const match = item.section.match(
      /^work_experience\[(\d+)\]\.bullets\[(\d+)\]$/,
    );
    if (!match) continue;
    targets.push({
      entryIndex: Number(match[1]),
      bulletIndex: Number(match[2]),
    });
  }
  return targets;
}

export function primaryDiffStrings(diff: DiffItem[]): {
  before: string | null;
  after: string | null;
} | null {
  const stringItems = diff.filter(
    (item) =>
      typeof item.before === "string" ||
      typeof item.after === "string" ||
      item.before === null ||
      item.after === null,
  );
  if (stringItems.length === 0) {
    return null;
  }
  const item = stringItems[0];
  return {
    before:
      typeof item.before === "string"
        ? item.before
        : item.before == null
          ? null
          : formatDiffValue(item.before),
    after:
      typeof item.after === "string"
        ? item.after
        : item.after == null
          ? null
          : formatDiffValue(item.after),
  };
}
