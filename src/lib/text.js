// "bulgarian split squat" -> "Bulgarian Split Squat"; only touches the
// first letter of each space-separated word, so hyphenated and
// parenthetical names stay intact.
export function titleCaseWords(name) {
  return name.trim().split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
