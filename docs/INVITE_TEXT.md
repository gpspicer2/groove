# Inviting your first few people

The link: https://groove-rho.vercel.app

## Quick share (the link makes a preview card)

The link turns into a card with the GROOVE picture, the title "GROOVE" and the little message underneath ("I made an app to help with movement mentorship and education. It's free while I test it, and I'd love to know what you think!"). Those live in the preview tags in `index.html` (the picture is `public/og-image-v3.png`). So the whole share is just this, on its own:

> https://groove-rho.vercel.app/?invite

Type or paste it as plain text so it appears only once (copying from a chat can add a second copy in parentheses, and Messages then skips the card). The `?invite` on the end is on purpose: phones remember the preview for each exact link, so a link they saw before the picture existed keeps showing no picture. The new ending is a link they have never seen, and it opens the same app. The picture file has a version in its name (`og-image-v3.png`) for the same reason; if the picture is ever redrawn, bump the name to `-v4` in `index.html`, the script and here.

### The text to send (reads like a text, with the setup heads-up)

Paste all of this as one message (link last, on its own line):

> Hey! I'm starting work as an exercise physiologist, helping people build movement into their lives and reach their fitness goals, and I built an app to do it. Would you be one of my first testers? It's free while I test it.
>
> Tip: it's a website, so tap Share, then Add to Home Screen to keep it with your apps. (Android: tap the three dots, then Add to Home screen.)
>
> Setup takes about 5 minutes, plus an optional 10-minute "get to know you" after your first workout. Tell me what's confusing or broken. Thank you!
> https://groove-rho.vercel.app/?invite

### Even shorter (for people who already know what you're up to)

> Hey! I made an app to help with movement mentorship and education. It's free while I test it. Tip: tap Share, then Add to Home Screen. Setup takes about 5 minutes, and I'd love to know what's confusing or broken. Thank you!
> https://groove-rho.vercel.app/?invite

(The 5 and 10 minute figures are estimates, not timed. The first-run steps are sign up, the consent screen, the health check and the seven-card tour. The 10-minute set is the "Finish Setting Up Your Account" card, which only appears after the first logged workout.)

## The text (copy and paste)

Hey! Most people don't like exercise, but almost everyone likes to move. That's the idea behind Groove, a movement app I built as a professor and exercise physiologist.

It's more than a workout log. It follows the same ACSM science I teach, adjusts to how your body feels that day (sore knee? tired?), shows you how to do every exercise, and keeps your journal completely private. And you get me: movement mentorship and education, to help you find movement you'll actually keep doing.

I'd love your help testing it. It's free for you while I do.

1. Open https://groove-rho.vercel.app on your phone
2. Tap Sign up and answer the short health questions
3. Tap Move, then "New to lifting? Start here" or Log Workout

Tip: tap Share, then Add to Home Screen so it opens like an app.

If anything is confusing, broken, or annoying, text me. That's exactly what I need to hear. Thank you!

## A shorter version (if the one above feels long for a text)

Hey! I built an app called Groove for people who don't love "exercise" but do love to move. It's built on the science I teach as an exercise physiologist, it adapts to how your body feels each day, and it comes with me for movement mentorship. Want to try it? It's free while I test: https://groove-rho.vercel.app (Sign up, then tap Move.)

## What makes it different (for conversations, not the text)

- Movement, not exercise: the goal is finding movement you'll keep doing, not punishing workouts.
- Built by an exercise scientist on ACSM guidelines, not a generic fitness template.
- It listens: a quick body check before lifting, injuries it works around, and a gentle starter workout for beginners.
- It teaches: a how-to on every exercise, so you learn as you go.
- It is personal: a private journal only the member can read, and Greg offering mentorship and education, not just an app.

## Before you send it

- Anyone whose email has "spice", "tamplen" or the word "roy" gets free access automatically. For anyone else, open the coach view, tap Billing, and comp them after they sign up (or they will see the Join popup, if membership is switched on).
- Send to 3 to 5 people at first, a mix of gym people and non-gym people.
- Two weeks later, ask each one: "What confused you? What did you stop using? What did you wish it did?"

## What to watch for

- Did they get through sign up, the consent screen, the health check and the tour without asking you for help?
- Did they log a first workout on day one?
- Which screen did they never open?

## Members sharing Groove (2026-10-24)

Account > Invite a Friend sends: "Hey! I'm using Groove for movement tracking and guidance. It's built by Dr. Greg Spicer, a professor and exercise physiologist. Take a look:" and the `?invite` link. The link opens a welcome page (who Greg is, what Groove does, prices, a collapsed trainer comparison, an optional video) before sign-up. To add the video, put a YouTube link in the Vercel variable `VITE_INVITE_VIDEO` and redeploy.
