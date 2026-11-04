# ToppperTube

Education videos from ~150 trusted channels, in a HackerTube-style site.
No logins: likes, history, playlists, notes and recommendations are stored in the student's own browser.

## Files
- public/index.html, public/app.js   the website (feed, recommendations, playlists, notes, settings)
- api/feed.js, lib/catalog.js        loads videos from the YouTube Data API v3 (cached 3 hours by Vercel)
- channels.names.json                your channel list (names + category)
- channels.json                      the same channels with YouTube channel IDs (made by the script below)
- scripts/resolve-channels.js        one-time script: names -> channel IDs

## Setup (3 steps)
1. API key. In Vercel: Project > Settings > Environment Variables > add  YT_API_KEY  = your key  (and CERT_SECRET, see Final assessment)
   (never write the key into a file in the repo; anything in GitHub can be read and used by others).
   In Google Cloud, restrict the key to "YouTube Data API v3" only.
2. Resolve channel IDs once, on your computer (Node 18+):
     Mac/Linux:  YT_API_KEY=your_key node scripts/resolve-channels.js
     Windows:    set YT_API_KEY=your_key && node scripts/resolve-channels.js
   It writes channels.json and channels.report.txt. Open the report and fix any line marked CHECK or MISSING
   (edit channels.json by hand; a channel ID is in YouTube > channel > About > Share > Copy channel ID).
   Searching costs 100 quota units per channel, so ~150 channels may need two days: if the quota runs out,
   run the script again the next day, it continues where it stopped.
3. Push the folder to GitHub, import it in Vercel (framework "Other", no build command) and deploy.
   Open /api/feed on your site: "skipped" lists channels that failed to load.

## Quota
Each refresh = about 1 unit per channel + 1 per 50 videos (~200 units for 150 channels), at most 8 times a day.

## How recommendations work (all on the student's device)
Watching, finishing, liking, saving and searching raise a private score for that channel, subject and the
words in the titles; old interests fade. Home ranks lessons by those scores plus freshness and popularity,
spreads results across channels, and pushes already-watched videos down. "Up next" uses similarity to the video
being watched. Settings has Reset recommendations and a backup/restore file.

## Channels
Tap a channel name on any lesson (or open Channels in the menu) to see its lessons. Follow a channel to see it first in the
Channels list and get more of it on Home. Follows are saved on the device, like everything else.

## Whole channel library
On a channel page, "Load this channel's full library" pages through every upload, 50 at a time (api/channel.js, 2 quota units per page,
cached 6 hours). Only channels listed in channels.json can be requested, so nobody can spend your quota on other channels.

## Search inside a channel
The box on a channel page filters the lessons loaded so far as you type. It searches titles and descriptions (first 500 characters
plus tags); title matches come first, and description-only matches show the matching text. Descriptions arrive with the library pages. "Search the whole library" keeps loading the channel's
pages (up to 3000 lessons, tap Stop any time) and then searches all of them. Pages are cached, so it costs quota only once.

## Search
Search ranks by relevance: generic words like "course" never block a match, at least half of the real words must match,
partial forms match (engineer / engineering), and shorthand such as AI, ML, DSA, JS is expanded.
"Search more on YouTube" (api/search.js) adds results from outside the channel list, labelled as such. It costs 100 quota units
per new search, results are cached 24 hours, and each server instance allows 40 per hour.

## Courses
Courses > Create a course turns YouTube content into a curriculum with modules, lessons and a progress bar:
- From a playlist: every video becomes a lesson (up to 300), grouped into modules of 10 when there are more than 12.
- From one long video: chapters in the description (00:00 Intro ...) become lessons that play only that section.
  With no chapters, a long video is split into 20-minute parts.
- From several links: one lesson per link, in your order.
Lessons complete automatically (end of a chapter, end of a video, or 92% watched) and move on to the next lesson; students can also tick
them by hand. "Edit structure" renames, reorders, moves lessons between modules, adds modules or regroups every N lessons.
Every lesson has notes (with timestamps), Like, Watch later and Add to playlist. A course can export its outline (.md) and all its notes (.md / PDF).
Courses and progress are saved in the student's browser (included in the Settings backup).
Featured courses: list playlists in courses.json, e.g.
  [{ "title": "Calculus", "category": "Science & Maths", "playlist": "PLxxxxxxxxxxxx", "description": "Full course" }]
and they appear on the Courses page with a Start course button (playlist id = the list= part of the playlist link).

## Open any YouTube video
Paste any video link in the search bar or on the Courses page. It opens in the ToppperTube player with notes, likes and playlists.
On any video, "Make a course" converts it into a course. Videos that block embedding cannot be played and are refused.
Cost: 1 quota unit per video, 2-13 per playlist; responses are cached 6 hours.

## Categories and podcasts
New categories: Biology, Pharmacy, Commerce & Accounts, Engineering and Podcasts (Raj Shamani, PowerfulJRE = Joe Rogan, Nikhil Kamath).
Add the new names by running the resolver again (it keeps the channels it already resolved). Check channels.report.txt: the Pharmacy,
Commerce and Biology names were chosen by best guess, so confirm each match or edit channels.json.
Podcasts have their own menu page and stay out of Home until a student watches one. Settings has a switch to hide podcasts completely
(they can contain mature language).

## Final assessment and certificate
When a student completes every lesson, "Take final assessment" unlocks. They enter their name and confirm the course name, answer 10
multiple-choice questions, and with 80% or more they get a certificate (PDF, PNG, and a verification link). Below 80% they can retry
with a new set of questions. Certificates are listed under Courses > My certificates.

Setup (Vercel > Settings > Environment Variables):
- CERT_SECRET        any long random text. Required. It signs certificates and seals the answer key. Keep it secret and do not
                     change it later, or old certificates stop verifying.
- ANTHROPIC_API_KEY  optional. Lets Claude write the questions for any course from its lesson titles and video descriptions
                     (model claude-sonnet-5-5, override with QUIZ_MODEL). Roughly one cent per assessment.

Question sources, in order:
1. A quiz you write for a featured course in courses.json (best quality, fully under your control):
   [{ "title": "Calculus", "playlist": "PLxxxxxxxxxxxx", "quiz": [
       { "q": "What is the derivative of x squared?", "options": ["x", "2x", "x squared", "2"], "answer": 1 } ] }]
   Write 30 or more questions per course; each attempt draws 10 at random and shuffles the options.
2. Questions generated by Claude (needs ANTHROPIC_API_KEY). Courses whose videos have almost no description are refused instead of
   getting poor questions.
If neither exists, the student sees "Assessments are not set up for this course yet".

How it is protected: answers never reach the browser (they travel inside an encrypted token and are graded by api/grade.js);
certificates carry a signed code that api/verify.js checks, so edited or invented certificates fail. Each assessment can be graded once.
Limits to know:
- Generated questions come from titles and descriptions, not from what is said in the videos (YouTube does not allow reading
  transcripts through its public API), so write a quiz yourself for courses that matter.
- The "graded once" rule is kept in server memory; for strict exams add a database (e.g. Vercel KV) to record used assessments.
- The certificate says the student passed ToppperTube's assessment. It is not an accredited qualification.

## Notes
Notes are saved automatically per lesson (or as free notes). Add timestamps while watching, click them to jump.
Download as .txt, .md or PDF (PDF opens the print window: choose "Save as PDF").

## Limits
- Home and search use each channel's 25 newest videos. Older lessons appear on the channel page after "Load full library" (not in Home or search).
- Search covers the loaded catalog, not all of YouTube.
- Videos shorter than 4 minutes, live streams and non-embeddable videos are left out.
