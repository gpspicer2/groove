import { titleCaseLive } from './titleCase';

// "bulgarian split squat" -> "Bulgarian Split Squat". Uses the same rule as typing (titleCaseLive),
// so a name looks identical while it is typed and after it is saved.
export function titleCaseWords(name) {
  return titleCaseLive(name.trim().replace(/\s+/g, ' '));
}
