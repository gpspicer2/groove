import { ROLL_GUIDES, ROLL_RULES } from './exerciseLibrary';

// Short how-tos for every suggested exercise, shown from the (i) on an open card: set up, move, watch for.
// Rolls live with the rolls in exerciseLibrary. Hand-typed exercises have no guide.
const g = (setup, move, watch) => ({ setup, move, watch });

const LIFTS = {
  'Barbell Bench Press': g('Lie back with your eyes under the bar, feet flat, shoulder blades pinched together and down. Grip just wider than your shoulders.', 'Unrack, lower the bar to your mid-chest with elbows about 45° from your body, then press up and slightly back over your shoulders.', 'Keep your hips on the bench and wrists stacked over your elbows. Use a spotter or safety arms on heavy sets.'),
  'Dumbbell Chest Press': g('Lie back holding dumbbells at chest level, feet flat, shoulder blades pinched.', 'Press up until your arms are straight with the dumbbells over your chest, then lower slowly to chest level.', 'Do not let the dumbbells drift wide. Keep wrists straight.'),
  'Incline Dumbbell Press': g('Set the bench to about 30 to 45 degrees. Hold dumbbells at upper-chest level with your back against the pad.', 'Press up and slightly together, then lower slowly to the sides of your upper chest.', 'If the bench is too steep it becomes a shoulder press. Keep ribs down.'),
  'Dumbbell Fly': g('Lie back with dumbbells above your chest, palms facing each other, elbows slightly bent.', 'Open your arms in a wide arc until you feel a stretch across your chest, then squeeze back up like hugging a tree.', 'Keep the same elbow bend the whole time and go lighter than a press. Do not drop below shoulder level.'),
  'Deficit Push-Ups': g('Put your hands on raised handles, plates or books so your chest can sink below your hands. Body in a straight line.', 'Lower your chest below hand level, then press back up.', 'Do not sag your hips or flare your elbows. Knees down makes it easier.'),
  'Dips': g('Hold parallel bars with straight arms, lean slightly forward, knees bent behind you.', 'Lower until your upper arms are about parallel to the floor, then press back up.', 'Stop if the front of your shoulder pinches. An assisted machine or bench dips makes it easier.'),
  'Pull-Ups': g('Hang from the bar with an overhand grip a little wider than your shoulders and pull your shoulders down.', 'Pull your chest toward the bar, leading with your elbows, then lower all the way down under control.', 'No kicking or swinging. A band or assisted machine works if you need help.'),
  'Lat Pulldown': g('Sit with your thighs under the pad and grip the bar wider than your shoulders.', 'Pull the bar to your upper chest by driving your elbows down, then let it rise slowly until your arms are straight.', 'Lean back only a little. Never pull the bar behind your neck.'),
  'Barbell Row': g('Feet hip-width, hinge at the hips until your torso is near 45 degrees with a flat back and the bar hanging below your shoulders.', 'Pull the bar to your lower ribs, squeeze your shoulder blades, and lower under control.', 'Keep your back flat and hips from rising. Go lighter if your back rounds.'),
  'Seated Cable Row': g('Sit tall with your feet on the platform, knees soft, chest up.', 'Pull the handle to your belly, squeeze your shoulder blades together, then return slowly until your arms are straight.', 'Do not rock your torso back and forth. Keep shoulders down.'),
  'Straight-Arm Pulldown': g('Face a high cable, hinge slightly, and hold the bar with straight arms.', 'Sweep the bar down to your thighs, feeling your lats, then return slowly.', 'Keep a small elbow bend and your ribs down. It should not turn into a triceps pushdown.'),
  'Dumbbell Pullover': g('Lie along a bench holding one dumbbell with both hands above your chest.', 'Lower the dumbbell back over your head with a slight elbow bend until you feel a stretch, then pull it back over your chest.', 'Keep ribs down, do not arch. Use a moderate weight and stop short if your shoulder pinches.'),
  'Single-Arm Dumbbell Row': g('One hand and the same-side knee on a bench, back flat, dumbbell hanging.', 'Pull the dumbbell toward your hip with your elbow close, squeeze, and lower fully.', 'Keep your hips square and do not twist your torso.'),
  'Barbell Back Squat': g('Bar across your upper back (on the muscle shelf, not your neck), feet shoulder-width with toes slightly out.', 'Brace, sit your hips back and down to at least parallel, then drive up through your whole foot.', 'Knees track over toes, chest up, low back flat. Use safety bars.'),
  'Leg Press': g('Sit back in the seat with feet shoulder-width on the middle of the platform.', 'Lower until your knees are about 90 degrees, then press up without locking out.', 'Keep your hips on the pad and do not lock your knees. Go lighter with any knee pain.'),
  'Walking Lunges': g('Stand tall. Step forward into a long stride.', 'Lower your back knee toward the floor, push through your front foot, and step into the next lunge.', 'Keep your torso upright and your front knee over your ankle.'),
  'Romanian Deadlift': g('Stand holding the bar or dumbbells at your thighs, knees soft.', 'Push your hips straight back, sliding the weight down your legs until you feel your hamstrings stretch, then squeeze your glutes to stand.', 'Back flat, weight close to your legs. This is a hip hinge, not a squat.'),
  'Bulgarian Split Squat': g('Rest your back foot on a bench behind you with your front foot about two feet ahead.', 'Lower straight down until your front thigh is about parallel, then drive up through the front heel.', 'Keep your torso upright. If your front knee goes far past your toes, step the front foot out.'),
  'Bodyweight Squat': g('Feet shoulder-width, arms out in front for balance.', 'Sit your hips back and down, chest up, until your thighs are parallel, then stand.', 'Heels stay down and knees track over your toes.'),
  'Front Squat': g('Rest the bar on the front of your shoulders, elbows high.', 'Squat straight down keeping your torso tall, then stand.', 'Keep your elbows up. Use a lighter weight than your back squat.'),
  'Leg Extension': g('Adjust the pad to sit on your shins just above your ankles, knees lined up with the machine pivot.', 'Straighten your knees, pause and squeeze, then lower slowly.', 'No swinging. Avoid a hard lockout and stop if your knee hurts.'),
  'Goblet Squat': g('Hold a dumbbell at your chest, feet shoulder-width.', 'Squat down between your knees with elbows inside them, then stand.', 'Chest up, heels down.'),
  'Step-Ups': g('Face a bench or box about knee height or lower.', 'Place your whole foot on the box, drive through that heel to stand tall, and lower slowly.', 'Do not push off your trailing foot. Keep your hips level.'),
  'Leg Curl': g('Lie face down (or sit) with the pad just above your heels.', 'Curl your heels toward your glutes, pause, and lower slowly.', 'Keep your hips down and avoid bouncing the weight.'),
  'Nordic Curl (assisted)': g('Kneel with your feet anchored and a band or support to help.', 'Lower your torso forward slowly with your hips straight, catch yourself with your hands, and push back up.', 'The slow lowering is the point. Use assistance until it feels controlled.'),
  'Seated Hamstring Curl': g('Set the pad just above your ankles and the thigh pad snug.', 'Curl your heels down and back, pause, and return slowly.', 'Do not lift your hips off the seat.'),
  'Hip Thrust': g('Upper back against a bench, weight across your hips, feet flat shoulder-width.', 'Drive through your heels to lift your hips until your body is straight from shoulders to knees, squeeze your glutes, and lower.', 'Chin tucked, ribs down. Do not overarch your low back. Pad the bar.'),
  'Single-Leg Glute Bridge': g('Lie on your back with one foot flat and the other leg extended or hugged in.', 'Push through the heel to lift your hips, squeeze your glute, and lower.', 'Keep your hips level and do not arch your low back.'),
  'Cable Kickback': g('Clip an ankle strap to a low cable, hold a support, and hinge slightly.', 'Kick your leg straight back, squeeze your glute, and return slowly.', 'Move from the hip, not your low back. No swinging or leaning.'),
  'Overhead Press': g('Stand with the bar at your upper chest (or dumbbells at your shoulders), glutes tight.', 'Press straight overhead, moving your head slightly forward as the weight passes, then lower to your shoulders.', 'Ribs down. Do not lean back or arch.'),
  'Lateral Raise': g('Stand with light dumbbells at your sides, elbows slightly bent.', 'Lift out to the sides to shoulder height, leading with your elbows, and lower slowly.', 'Go light. No shrugging or swinging.'),
  'Face Pull': g('Set a rope on a cable at upper-chest or face height and step back.', 'Pull the rope toward your face with elbows high, spreading your hands toward your ears, and squeeze your rear shoulders.', 'Go light and do not lean back.'),
  'Arnold Press': g('Hold dumbbells at your chest with palms facing you.', 'Press up while rotating your palms to face forward, then reverse on the way down.', 'Light and controlled. Do not arch your back.'),
  'Front Raise': g('Hold dumbbells in front of your thighs.', 'Lift straight in front to shoulder height and lower slowly.', 'No swinging. Go light.'),
  'Rear Delt Fly': g('Hinge forward (or lean on an incline bench) with dumbbells hanging below you.', 'Raise your arms out to the sides in a wide arc, squeeze your shoulder blades, and lower.', 'Go light, keep a small elbow bend, and do not shrug.'),
  'Pike Push-Up': g('Start in a downward-dog position with your hips high.', 'Bend your elbows to lower your head toward the floor between your hands, then press back up.', 'Stop if your shoulders or wrists hurt.'),
  'Handstand Hold (wall)': g('Kick up or walk your feet up a wall, chest facing the wall, arms straight and body tight.', 'Hold, pressing the floor away and keeping your ribs in.', 'Only if you are comfortable upside down. Clear the floor around you and skip it with neck or shoulder problems.'),
  'Barbell Curl': g('Stand holding the bar underhand, hands shoulder-width.', 'Curl to your shoulders keeping your elbows at your sides, then lower slowly.', 'No swinging or leaning back.'),
  'Incline Dumbbell Curl': g('Sit back on an incline bench with your arms hanging behind your body.', 'Curl up without moving your upper arms, then lower fully for a stretch.', 'Go lighter than a standing curl and move slowly.'),
  'Hammer Curl': g('Hold dumbbells with your palms facing each other.', 'Curl up keeping your palms facing in, then lower slowly.', 'Keep your elbows at your sides.'),
  'Concentration Curl': g('Sit with your elbow braced on your inner thigh and the dumbbell hanging.', 'Curl up toward your shoulder, squeeze, and lower slowly.', 'No swinging your body.'),
  'Cable Curl': g('Face a low cable and hold the bar or handle underhand.', 'Curl to your shoulders and lower slowly.', 'Elbows stay pinned at your sides.'),
  'Preacher Curl': g('Rest your upper arms on the pad with your armpits at the top.', 'Curl up, then lower slowly until your arms are nearly straight.', 'Do not drop into the bottom or fully lock out. That strains the elbow.'),
  'Chin-Up (underhand)': g('Hang from the bar with palms facing you, shoulder-width apart.', 'Pull your chin over the bar, then lower fully.', 'No swinging. Use a band or assisted machine if you need help.'),
  'Tricep Pushdown': g('Face a high cable with elbows at your sides.', 'Press down until your arms are straight, then return until your forearms are just above parallel.', 'Keep your elbows pinned and do not lean on the bar.'),
  'Skull Crusher': g('Lie on a bench holding the bar or dumbbells over your chest with straight arms.', 'Bend only your elbows to lower the weight toward your forehead, then extend.', 'Elbows point up, not out. Start light and use a spotter.'),
  'Overhead Tricep Extension': g('Hold one dumbbell overhead with both hands.', 'Bend your elbows to lower it behind your head, then press back up.', 'Keep your elbows near your ears and ribs down.'),
  'Close-Grip Bench Press': g('Lie as for a bench press with your hands about shoulder-width apart.', 'Lower to your lower chest with elbows tucked, then press up.', 'Do not go too narrow. It stresses the wrists.'),
  'Diamond Push-Ups': g('Hands together under your chest, thumbs and index fingers forming a diamond. Body in a straight line.', 'Lower your chest to your hands with elbows tucked, then press up.', 'Knees down makes it easier. Stop if your wrists complain.'),
  'Plank': g('Forearms on the floor, elbows under your shoulders, body in a straight line.', 'Hold, squeezing your glutes and abs and breathing steadily.', 'Do not sag or pike. End the set when your form breaks.'),
  'Hanging Leg Raise': g('Hang from a bar with your shoulders pulled down.', 'Lift your legs (bent or straight) toward hip height, then lower under control.', 'No swinging. Bend your knees if it is too hard.'),
  'Cable Crunch': g('Kneel facing a high cable with the rope held beside your head.', 'Curl your ribs toward your hips, rounding your spine, then return.', 'Move from your abs, not your hips. Keep your hips still.'),
  'Russian Twist': g('Sit leaning back slightly with your feet down or lifted, holding a weight at your chest.', 'Rotate your torso side to side, tapping the weight beside your hips.', 'Keep your chest tall and move slowly. Do not round your back.'),
  'Ab Wheel Rollout': g('Kneel with the wheel under your shoulders.', 'Roll out slowly until your body is nearly straight, then pull back using your abs.', 'Do not let your low back sag. Use a shorter range if needed.'),
  'Side Plank': g('Lie on one forearm with your feet stacked and lift your hips into a straight line.', 'Hold steady, breathing normally.', 'Keep your hips high and do not rotate. Knees down makes it easier.'),
};

const STRETCHES = {
  'Doorway Chest Stretch': g('Stand in a doorway with your forearm on the frame, elbow at shoulder height.', 'Step through slowly until you feel a stretch across your chest and hold.', 'Keep your ribs down. Ease off if the front of your shoulder pinches.'),
  'Cross-Body Shoulder Stretch': g('Bring one arm across your chest.', 'Pull it in with your other hand just above the elbow and hold.', 'Keep your shoulder down and do not twist your body.'),
  "Child's Pose": g('Kneel and sit your hips back toward your heels.', 'Reach your arms forward along the floor and breathe slowly.', 'Pad your knees. Spread your knees wide if your hips are tight.'),
  'Cat-Cow': g('Start on your hands and knees.', 'Arch your back and look up (cow), then round your spine and tuck your chin (cat), moving with your breath.', 'Move slowly and stay pain-free.'),
  'Standing Quad Stretch': g('Stand holding a wall for balance.', 'Pull one heel toward your glute with your knees together and hold.', 'Do not arch your low back. Stop if you feel pain at the front of the knee.'),
  'Seated Hamstring Stretch': g('Sit with one leg straight and the other bent.', 'Hinge forward from your hips toward your toes and hold.', 'Keep your back long, not rounded. A mild pull is enough.'),
  'Figure-4 Glute Stretch': g('Lie on your back and cross one ankle over the opposite knee.', 'Pull the lower thigh toward your chest until you feel the stretch in your glute.', 'Keep your head down and be gentle on your knee.'),
  'Couch Stretch': g('Kneel with one foot up behind you against a couch or wall and the other foot forward.', 'Tuck your pelvis and lean upright until you feel the front of your thigh and hip stretch.', 'Tuck your tailbone, do not arch your back, and pad your knee. Ease in slowly.'),
  'Standing Toe Touch': g('Stand with your feet hip-width apart.', 'Hinge forward and let your arms hang, knees soft, then roll up slowly.', 'Bend your knees as much as you need.'),
  'Pigeon Pose': g('From hands and knees, bring one knee forward behind your wrist with the other leg extended behind you.', 'Lower your hips and fold forward over your front leg.', 'Put a pillow under your hip if it does not reach the floor. Stop if you feel knee pain.'),
  'Overhead Triceps/Shoulder Stretch': g('Raise one arm overhead and bend the elbow, hand reaching down your back.', 'Use your other hand to gently press the elbow back and hold.', 'Keep your ribs down and do not arch.'),
  'Wall Shoulder Slide': g('Stand with your back flat against a wall and your arms in a goalpost position.', 'Slide your arms up the wall and back down, keeping contact.', 'Keep your low back and ribs against the wall and stay pain-free.'),
  'Extended Arm Wall Stretch': g('Stand beside a wall with your arm straight out to the side and your palm on the wall.', 'Turn your body away from the wall until you feel a stretch and hold.', 'Keep it gentle at the front of your shoulder.'),
  'Overhead Triceps Stretch': g('Raise one arm overhead and bend the elbow.', 'Use your other hand to gently press the elbow back and hold.', 'Keep your ribs down and do not arch.'),
  'Cobra Stretch': g('Lie face down with your hands under your shoulders.', 'Press up, lifting your chest while your hips stay on the floor, and hold.', 'Stop if your low back pinches. Keep your neck long.'),
  'Seated Spinal Twist': g('Sit with your legs extended, bend one knee, and cross that foot over the other leg.', 'Twist toward the bent knee with your opposite elbow outside it and hold.', 'Sit tall and twist from your ribs. Do not force it.'),
  'Single-Leg Stand': g('Stand near a wall or counter you can touch.', 'Lift one foot and balance, looking at a fixed spot. Close your eyes only when it feels easy.', 'Keep a hand near support.'),
  'Tandem Stand': g('Stand with one foot directly in front of the other, heel to toe.', 'Hold your balance with your arms out if needed.', 'Stay near a wall or counter.'),
  'Heel-to-Toe Walk': g('Pick a straight line on the floor and stand tall.', 'Walk placing each heel directly in front of the opposite toes, arms out for balance.', 'Go slowly and stay near a wall at first.'),
};

const LIFT_RULES = [
  'Form first, weight second. Pick a weight you can control.',
  'Breathe out as you push or pull, in as you lower.',
  'Sharp pain means stop. Soreness the next day is normal.',
];
const STRETCH_RULES = [
  'Ease in until you feel a mild stretch, not pain.',
  'Breathe slowly and relax into it.',
  'Stop if you feel pinching, numbness or tingling.',
];

// { setup, move, watch, rules } for an exercise name, or null when there is no guide (typed-in exercises).
export function guideFor(name) {
  if (ROLL_GUIDES[name]) return { ...ROLL_GUIDES[name], rules: ROLL_RULES };
  if (LIFTS[name]) return { ...LIFTS[name], rules: LIFT_RULES };
  if (STRETCHES[name]) return { ...STRETCHES[name], rules: STRETCH_RULES };
  return null;
}
