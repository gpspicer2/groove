import { ADVANCED_LIFTS } from '../move/exerciseLibrary';

// The lifting experience survey: which movements a member knows, wants to learn, or wants left out.
// `names` are the library exercises each answer covers. Answers: 'know' | 'learn' | 'skip' (blank = no answer; 'love' counts as knowing it and is also favored).
// Each page is a muscle group: `items` are the short list everyone sees; `more` are extra lifts behind "More Lifts".
// Each page is a muscle group: `items` are the short list everyone sees; `more` are extra lifts behind "More Lifts".
export const EXPERIENCE_GROUPS = [
  { title: 'Chest',
    items: [
      { id: 'bench', label: 'Bench Press', info: 'Lie on a bench, lower a barbell to your chest, and press it back up.', names: ['Barbell Bench Press', 'Pause Bench Press'] },
      { id: 'incline', label: 'Incline Dumbbell Press', info: 'Press dumbbells up from your upper chest on a bench set at a slant.', names: ['Incline Dumbbell Press'] },
      { id: 'db_press', label: 'Dumbbell Chest Press', info: 'Lie on a bench and press two dumbbells straight up over your chest.', names: ['Dumbbell Chest Press'] },
      { id: 'pushups', label: 'Push-Ups', info: 'Lower your chest to the floor and press back up from a plank. Deficit push-ups raise your hands on blocks for a deeper stretch.', names: ['Push-Ups', 'Deficit Push-Ups'] },
      { id: 'dips', label: 'Dips', info: 'Lower and raise your body between parallel bars by bending your elbows.', names: ['Dips'] },
    ],
    more: [
      { id: 'machine_chest', label: 'Machine Chest Press', info: 'Sit in a machine and push the handles away from your chest. A steady, beginner-friendly press.', names: ['Machine Chest Press'] },
      { id: 'plate_chest', label: 'Plate-Loaded Chest Press', info: 'Press the handles of a plate-loaded (Hammer Strength style) machine away from your chest. Each side moves on its own.', names: ['Plate-Loaded Chest Press'] },
      { id: 'pec_deck', label: 'Pec Deck Fly', info: 'Sit at a machine and bring two arms together in front of your chest. Isolates your chest.', names: ['Pec Deck Fly'] },
      { id: 'cable_fly', label: 'Cable Fly', info: 'Stand between two cables and bring the handles together in front of your chest in a wide arc.', names: ['Cable Fly'] },
      { id: 'smith_bench', label: 'Smith Machine Bench Press', info: 'A bench press with the bar fixed on vertical rails, so it only moves up and down.', names: ['Smith Machine Bench Press'] },
      { id: 'fly', label: 'Dumbbell Fly', info: 'Lie on a bench and open your arms wide with soft elbows, then bring the dumbbells back together over your chest.', names: ['Dumbbell Fly'] },
      { id: 'close_grip', label: 'Close-Grip Bench', info: 'A bench press with your hands closer together, which works your triceps more.', names: ['Close-Grip Bench Press'] },
    ] },
  { title: 'Back',
    items: [
      { id: 'pullups', label: 'Pull-Ups and Chin-Ups', info: 'Hang from a bar and pull your chin over it. Chin-ups use an underhand grip.', names: ['Pull-Ups', 'Chin-Up (underhand)'] },
      { id: 'pulldown', label: 'Lat Pulldown', info: 'Sit at a machine and pull a bar down to your upper chest.', names: ['Lat Pulldown'] },
      { id: 'cable_row', label: 'Seated Cable Row', info: 'Sit at a cable machine and pull the handle toward your belly, squeezing your shoulder blades.', names: ['Seated Cable Row'] },
      { id: 'bb_row', label: 'Barbell Row', info: 'Hinge forward and pull a barbell to your lower ribs.', names: ['Barbell Row'] },
      { id: 'db_row', label: 'One-Arm Dumbbell Row', info: 'Brace one hand on a bench and row a dumbbell up to your hip with the other.', names: ['Single-Arm Dumbbell Row'] },
    ],
    more: [
      { id: 'pendlay', label: 'Pendlay Row', info: 'A strict row where the barbell starts on the floor every rep and you pull it to your chest.', names: ['Pendlay Row'] },
      { id: 'cs_row', label: 'Chest-Supported Row', info: 'Lie face down on an incline bench and row two dumbbells. Takes the strain off your lower back.', names: ['Chest-Supported Dumbbell Row'] },
      { id: 't_bar', label: 'T-Bar Row', info: 'Straddle a bar anchored at one end and row the handle up to your torso. Often plate-loaded.', names: ['T-Bar Row'] },
      { id: 'plate_row', label: 'Plate-Loaded Row', info: 'Row the handles of a plate-loaded machine toward your torso with your chest on a pad.', names: ['Plate-Loaded Row'] },
      { id: 'assisted_pullup', label: 'Assisted Pull-Up Machine', info: 'A pull-up with a weight stack that helps push you up. More weight means more help.', names: ['Assisted Pull-Up Machine'] },
      { id: 'inverted_row', label: 'Inverted Row', info: 'Hang under a sturdy bar or table and pull your chest up to it. A bodyweight row.', names: ['Inverted Row'] },
      { id: 'straight_arm', label: 'Straight-Arm Pulldown', info: 'Stand at a cable and sweep a bar from overhead down to your thighs with straight arms. Isolates your lats.', names: ['Straight-Arm Pulldown'] },
      { id: 'pullover', label: 'Dumbbell Pullover', info: 'Lie along a bench and lower one dumbbell back over your head, then pull it over your chest.', names: ['Dumbbell Pullover'] },
      { id: 'back_ext', label: 'Back Extension', info: 'Hinge forward on a back-extension bench, then raise your torso until it is in line with your legs.', names: ['Back Extension'] },
      { id: 'shrug', label: 'Dumbbell Shrug', info: 'Hold dumbbells at your sides and lift your shoulders toward your ears. Builds the upper traps.', names: ['Dumbbell Shrug'] },
    ] },
  { title: 'Shoulders',
    items: [
      { id: 'ohp', label: 'Overhead Press', info: 'Press a barbell or dumbbells from your shoulders to overhead while standing.', names: ['Overhead Press'] },
      { id: 'lateral', label: 'Lateral Raise', info: 'Lift dumbbells out to your sides to shoulder height. Builds the sides of your shoulders.', names: ['Lateral Raise'] },
      { id: 'arnold', label: 'Arnold Press', info: 'A dumbbell shoulder press that starts with your palms facing you and rotates as you press.', names: ['Arnold Press'] },
      { id: 'face_pull', label: 'Face Pull', info: 'Pull a rope at a cable machine toward your face with elbows high. Great for shoulder health.', names: ['Face Pull'] },
      { id: 'rear_delt', label: 'Rear Delt Fly', info: 'Bend forward and open your arms with dumbbells to hit the backs of your shoulders.', names: ['Rear Delt Fly'] },
    ],
    more: [
      { id: 'machine_press', label: 'Machine Shoulder Press', info: 'Sit at a machine and press the handles overhead. Steady and easy to learn.', names: ['Machine Shoulder Press'] },
      { id: 'push_press', label: 'Push Press', info: 'An overhead press that starts with a small knee dip and leg drive to help the weight up.', names: ['Push Press'] },
      { id: 'front_raise', label: 'Front Raise', info: 'Lift dumbbells straight out in front of you to shoulder height.', names: ['Front Raise'] },
      { id: 'pike', label: 'Pike Push-Up', info: 'With hips high like an upside-down V, lower your head toward the floor and press back up.', names: ['Pike Push-Up'] },
      { id: 'handstand', label: 'Wall Handstand Hold', info: 'Kick up into a handstand against a wall and hold. Advanced balance and strength.', names: ['Handstand Hold (wall)'] },
    ] },
  { title: 'Arms',
    items: [
      { id: 'bb_curl', label: 'Barbell Curl', info: 'Curl a barbell from your thighs up to your shoulders.', names: ['Barbell Curl'] },
      { id: 'hammer', label: 'Hammer Curl', info: 'Curl dumbbells with your palms facing each other, like holding a hammer.', names: ['Hammer Curl'] },
      { id: 'pushdown', label: 'Tricep Pushdown', info: 'Push a bar or rope down at a cable machine until your arms are straight.', names: ['Tricep Pushdown'] },
      { id: 'skull', label: 'Skull Crusher', info: 'Lie on a bench and bend only your elbows to lower a bar toward your forehead, then straighten.', names: ['Skull Crusher'] },
      { id: 'oh_ext', label: 'Overhead Tricep Extension', info: 'Hold a dumbbell overhead and bend your elbows to lower it behind your head, then press up.', names: ['Overhead Tricep Extension'] },
    ],
    more: [
      { id: 'incline_curl', label: 'Incline Dumbbell Curl', info: 'Sit back on an incline bench and curl dumbbells from a deep stretch at the bottom.', names: ['Incline Dumbbell Curl'] },
      { id: 'preacher', label: 'Preacher Curl', info: 'Rest your upper arms on a slanted pad and curl the weight up. Keeps you from swinging.', names: ['Preacher Curl'] },
      { id: 'cable_curl', label: 'Cable Curl', info: 'Curl a handle or bar attached to a cable machine, keeping steady tension.', names: ['Cable Curl'] },
      { id: 'concentration', label: 'Concentration Curl', info: 'Seated with your elbow braced against your inner thigh, curl one dumbbell slowly.', names: ['Concentration Curl'] },
      { id: 'kickback', label: 'Tricep Kickback', info: 'Bend forward and straighten your arm behind you with a dumbbell, keeping your elbow still.', names: ['Dumbbell Kickback'] },
      { id: 'diamond', label: 'Diamond Push-Ups', info: 'Push-ups with your hands close together under your chest. Works your triceps hard.', names: ['Diamond Push-Ups'] },
      { id: 'bench_dips', label: 'Bench Dips', info: 'With your hands on a bench behind you, lower and raise your body by bending your elbows.', names: ['Bench Dips'] },
    ] },
  { title: 'Legs and Hips',
    items: [
      { id: 'back_squat', label: 'Back Squat', info: 'A barbell rests across your upper back as you squat down and stand up. The classic leg lift.', names: ['Barbell Back Squat', 'Pause Back Squat'] },
      { id: 'leg_press', label: 'Leg Press', info: 'Sit in a machine and push a weight away with your legs. Easy on your balance and back.', names: ['Leg Press'] },
      { id: 'lunges', label: 'Lunges', info: 'Step forward or back into a lunge. Works one leg at a time.', names: ['Walking Lunges', 'Reverse Lunges'] },
      { id: 'deadlift', label: 'Conventional Deadlift', info: 'Lift a barbell from the floor to standing, with your feet hip-width and hands just outside your knees.', names: ['Conventional Deadlift'] },
      { id: 'rdl', label: 'Romanian Deadlift', info: 'Hinge at your hips with a barbell or dumbbells, sliding the weight down your legs with knees slightly bent. Works hamstrings and glutes.', names: ['Romanian Deadlift', 'Single-Leg Romanian Deadlift'] },
      { id: 'hip_thrust', label: 'Hip Thrust', info: 'Back against a bench with a barbell or dumbbell on your hips, drive your hips up. A glute builder.', names: ['Hip Thrust', 'Dumbbell Hip Thrust'] },
      { id: 'leg_curl', label: 'Leg Curl', info: 'Curl your heels toward your glutes on a machine, lying or seated. Works your hamstrings.', names: ['Leg Curl', 'Seated Hamstring Curl'] },
    ],
    more: [
      { id: 'front_squat', label: 'Front Squat', info: 'The barbell rests on the front of your shoulders while you squat. It keeps your chest upright and works the front of your thighs.', names: ['Front Squat'] },
      { id: 'goblet', label: 'Goblet Squat', info: 'Hold one dumbbell or kettlebell at your chest and squat. A friendly way to learn squatting.', names: ['Goblet Squat'] },
      { id: 'hack_squat', label: 'Hack Squat', info: 'Squat on an angled machine with your back against a pad and shoulders under pads. Loads your quads with less strain on your back.', names: ['Hack Squat'] },
      { id: 'smith_squat', label: 'Smith Machine Squat', info: 'A squat with the bar fixed on vertical rails, so it only moves up and down.', names: ['Smith Machine Squat'] },
      { id: 'split_squat', label: 'Bulgarian Split Squat', info: 'Rest your back foot on a bench and squat on your front leg. Tough on your thighs and balance.', names: ['Bulgarian Split Squat'] },
      { id: 'step_ups', label: 'Step-Ups', info: 'Step up onto a box or bench and back down, one leg at a time.', names: ['Step-Ups'] },
      { id: 'leg_ext', label: 'Leg Extension', info: 'Sit in a machine and straighten your knees against a pad. Isolates your quads.', names: ['Leg Extension'] },
      { id: 'wall_sit', label: 'Wall Sit', info: 'Slide down a wall until your thighs are level and hold. A timed leg burner.', names: ['Wall Sit'] },
      { id: 'calf_raise', label: 'Calf Raises', info: 'Rise onto your toes and lower back down. Works your calves.', names: ['Calf Raises'] },
      { id: 'seated_calf', label: 'Seated Calf Raise', info: 'Sit with a pad on your knees and raise your heels. Works the deeper calf muscle.', names: ['Seated Calf Raise'] },
      { id: 'good_morning', label: 'Good Morning', info: 'A barbell on your upper back as you bow forward at the hips with a flat back, then stand tall.', names: ['Barbell Good Morning', 'Bodyweight Good Morning'] },
      { id: 'sumo', label: 'Sumo Deadlift', info: 'A deadlift with a wide stance and toes turned out, hands inside your knees.', names: ['Sumo Deadlift'] },
      { id: 'trap_bar', label: 'Trap Bar Deadlift', info: 'A deadlift standing inside a hexagon-shaped bar. Often feels easier on the back than a straight bar.', names: ['Trap Bar Deadlift'] },
      { id: 'glute_bridge', label: 'Glute Bridge', info: 'Lie on your back and lift your hips off the floor, on one or both legs.', names: ['Single-Leg Glute Bridge'] },
      { id: 'kickbacks', label: 'Glute Kickbacks', info: 'Kick one leg back at a cable machine, or on hands and knees (donkey kicks), squeezing your glutes.', names: ['Cable Kickback', 'Donkey Kicks'] },
      { id: 'nordic', label: 'Nordic Curl', info: 'Kneel with your feet anchored and slowly lower your body forward, catching yourself. Very tough on hamstrings.', names: ['Nordic Curl (assisted)'] },
      { id: 'kb_swing', label: 'Kettlebell Swing', info: 'Swing a kettlebell from between your legs to chest height by snapping your hips forward.', names: ['Kettlebell Swing'] },
      { id: 'hip_abduction', label: 'Hip Abduction Machine', info: 'Sit and push your knees apart against pads. Works your outer hips and glutes.', names: ['Hip Abduction Machine'] },
    ] },
  { title: 'Core',
    items: [
      { id: 'plank', label: 'Planks', info: 'Hold your body straight on your forearms and toes (or on your side for a side plank).', names: ['Plank', 'Side Plank', 'Plank Shoulder Taps'] },
      { id: 'leg_raise', label: 'Hanging Leg Raise', info: 'Hang from a bar and raise your legs in front of you.', names: ['Hanging Leg Raise'] },
      { id: 'cable_crunch', label: 'Cable Crunch', info: 'Kneel at a cable machine and curl your torso down against the weight.', names: ['Cable Crunch'] },
      { id: 'russian', label: 'Russian Twist', info: 'Sit leaning back and rotate your torso side to side, with or without a weight.', names: ['Russian Twist'] },
      { id: 'ab_wheel', label: 'Ab Wheel Rollout', info: 'Roll a small wheel out in front of you from your knees and pull back in.', names: ['Ab Wheel Rollout'] },
    ],
    more: [
      { id: 'machine_crunch', label: 'Machine Crunch', info: 'Sit at a machine and curl your torso forward against a weight.', names: ['Machine Crunch'] },
    ] },
  { title: 'Olympic Lifts',
    items: [
      { id: 'clean', label: 'Power Clean', info: 'Pull a barbell from the floor (or knees) up to your shoulders in one fast motion, catching it in a quarter squat. Technical: get coaching first.', names: ['Power Clean', 'Hang Power Clean'] },
      { id: 'snatch', label: 'Snatch', info: 'Pull a barbell from the floor to overhead in one fast motion. The most technical lift: get coaching first.', names: ['Power Snatch'] },
    ],
    more: [
    ] },
];

// Love It to Skip It, left to right, colored green / yellow / blue / red (`tone` is a theme color name used by the form).
export const EXPERIENCE_STATES = [
  { id: 'love', label: 'Love It', tone: 'LIME' },
  { id: 'know', label: 'Know It', tone: 'AMBER' },
  { id: 'learn', label: 'Learn It', tone: 'SKY' },
  { id: 'skip', label: 'Skip It', tone: 'BRICK' },
];

const ALL_ITEMS = EXPERIENCE_GROUPS.flatMap((g) => [...g.items, ...g.more]);

// Library exercises to leave out of suggested workouts and programs: anything the member marked "Skip it", and the Olympic
// and other technical lifts unless they said they know them.
export function blockedByExperience(answers = {}) {
  const blocked = new Set();
  ALL_ITEMS.forEach((it) => { if (answers[it.id] === 'skip') it.names.forEach((n) => blocked.add(n)); });
  const known = new Set();
  ALL_ITEMS.forEach((it) => { if (answers[it.id] === 'know' || answers[it.id] === 'love') it.names.forEach((n) => known.add(n)); });
  ADVANCED_LIFTS.forEach((n) => { if (!known.has(n)) blocked.add(n); });
  return [...blocked];
}
// True when the member said they know this exercise (used to prefer familiar lifts).
export function knowsLift(answers = {}, name) {
  return ALL_ITEMS.some((it) => (answers[it.id] === 'know' || answers[it.id] === 'love') && it.names.includes(name));
}
// Lifts the member loves: suggested workouts pick these first, and they win when a day's lift has options.
export function lovedLifts(answers = {}) {
  return ALL_ITEMS.filter((it) => answers[it.id] === 'love').flatMap((it) => it.names);
}
