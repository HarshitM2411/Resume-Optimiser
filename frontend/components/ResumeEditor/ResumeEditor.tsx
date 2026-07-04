"use client";

import type { ResumeSchema } from "@/types/resume";

import { SectionPanel } from "./SectionPanel";

interface ResumeEditorProps {
  resume: ResumeSchema;
  onEditSection: (section: string) => void;
}

export function ResumeEditor({ resume, onEditSection }: ResumeEditorProps) {
  const { contact, skills } = resume;

  return (
    <div className="space-y-4">
      <SectionPanel title="Contact">
        <p className="font-medium text-slate-900">{contact.name}</p>
        <p>{contact.email}</p>
        {contact.phone ? <p>{contact.phone}</p> : null}
        {contact.location ? <p>{contact.location}</p> : null}
        {contact.linkedin ? <p>{contact.linkedin}</p> : null}
        {contact.github ? <p>{contact.github}</p> : null}
        {contact.website ? <p>{contact.website}</p> : null}
      </SectionPanel>

      <SectionPanel title="Summary" onEdit={() => onEditSection("summary")}>
        <p className="whitespace-pre-wrap">{resume.summary || "—"}</p>
      </SectionPanel>

      <SectionPanel
        title="Work Experience"
        onEdit={() => onEditSection("work_experience")}
      >
        {resume.work_experience.length === 0 ? (
          <p className="text-slate-500">No entries</p>
        ) : (
          <div className="space-y-4">
            {resume.work_experience.map((entry, index) => (
              <div key={`${entry.company}-${index}`}>
                <p className="font-medium">
                  {entry.title} — {entry.company}
                </p>
                <p className="text-slate-500">
                  {entry.duration}
                  {entry.location ? ` · ${entry.location}` : ""}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {entry.bullets.map((bullet, bulletIndex) => (
                    <li key={bulletIndex}>{bullet}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </SectionPanel>

      <SectionPanel title="Skills" onEdit={() => onEditSection("skills")}>
        <div className="space-y-1">
          {skills.languages.length > 0 ? (
            <p>
              <span className="font-medium">Languages:</span>{" "}
              {skills.languages.join(", ")}
            </p>
          ) : null}
          {skills.frameworks.length > 0 ? (
            <p>
              <span className="font-medium">Frameworks:</span>{" "}
              {skills.frameworks.join(", ")}
            </p>
          ) : null}
          {skills.tools.length > 0 ? (
            <p>
              <span className="font-medium">Tools:</span>{" "}
              {skills.tools.join(", ")}
            </p>
          ) : null}
          {skills.other.length > 0 ? (
            <p>
              <span className="font-medium">Other:</span>{" "}
              {skills.other.join(", ")}
            </p>
          ) : null}
        </div>
      </SectionPanel>

      <SectionPanel title="Education" onEdit={() => onEditSection("education")}>
        {resume.education.length === 0 ? (
          <p className="text-slate-500">No entries</p>
        ) : (
          <div className="space-y-3">
            {resume.education.map((entry, index) => (
              <div key={`${entry.institution}-${index}`}>
                <p className="font-medium">{entry.institution}</p>
                <p>
                  {entry.degree}
                  {entry.field ? `, ${entry.field}` : ""}
                </p>
                {entry.graduation_year ? (
                  <p className="text-slate-500">{entry.graduation_year}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </SectionPanel>

      <SectionPanel title="Projects" onEdit={() => onEditSection("projects")}>
        {resume.projects.length === 0 ? (
          <p className="text-slate-500">No entries</p>
        ) : (
          <div className="space-y-3">
            {resume.projects.map((entry, index) => (
              <div key={`${entry.name}-${index}`}>
                <p className="font-medium">{entry.name}</p>
                <p>{entry.description}</p>
                {entry.tech_stack.length > 0 ? (
                  <p className="text-slate-500">
                    {entry.tech_stack.join(", ")}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </SectionPanel>

      {resume.achievements.length > 0 ? (
        <SectionPanel title="Achievements">
          <ul className="list-disc space-y-1 pl-5">
            {resume.achievements.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </SectionPanel>
      ) : null}

      {resume.certifications.length > 0 ? (
        <SectionPanel title="Certifications">
          <ul className="list-disc space-y-1 pl-5">
            {resume.certifications.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </SectionPanel>
      ) : null}
    </div>
  );
}
