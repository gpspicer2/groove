// Shared week-start math so "this week" means the same thing in Move's
// weekly tracker and Birdseye's calendar/streak, based on the user's own
// Sunday/Monday preference (Account → Week starts on).
export function startOfWeek(date, weekStartDay = 'sunday') {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const offset = weekStartDay === 'monday' ? (d.getDay() + 6) % 7 : d.getDay();
  d.setDate(d.getDate() - offset);
  return d;
}

export function weekDayLabels(weekStartDay = 'sunday') {
  const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return weekStartDay === 'monday' ? [...labels.slice(1), labels[0]] : labels;
}
