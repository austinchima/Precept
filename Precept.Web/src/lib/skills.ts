import { Skill, SkillProficiency } from '../types';

// Proficiency → percentage. Single source of truth shared by the dashboard
// preview radar and the full Readiness radar so both show identical values.
export const PROFICIENCY_PCT: Record<SkillProficiency, number> = {
  Beginner: 30,
  Intermediate: 60,
  Advanced: 80,
  Expert: 95,
};

// Explicitly-labeled "interview-ready" threshold (not invented role data).
export const READINESS_TARGET = 75;

export interface SkillAxis {
  name: string;
  value: number;
  count: number;
}

/**
 * Average proficiency per skill category, sorted by skill count and capped to
 * `max` axes. Uncategorised skills are excluded (they have no axis to sit on).
 * Used by both the dashboard radar and the Readiness page so they always match.
 */
export function computeSkillAxes(skills: Skill[], max = 8): SkillAxis[] {
  const map = new Map<string, number[]>();
  for (const s of skills) {
    const key = s.category?.trim();
    if (!key) continue;
    const arr = map.get(key) ?? [];
    arr.push(PROFICIENCY_PCT[s.proficiencyLevel]);
    map.set(key, arr);
  }
  return [...map.entries()]
    .map(([name, vals]) => ({
      name,
      value: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      count: vals.length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, max);
}
