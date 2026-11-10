# Toppertube

Education videos from ~270 channels in 20 categories, with courses, certificates, playlists, notes and podcasts.
No logins: likes, history, playlists, notes, courses and recommendations are saved in the student's own browser.
Use Settings > Download backup to move them to another device.

## Files
- public/            the website (index.html, app.js, courses.js, certificate.js, favicon files)
- api/               feed (all videos), channel (a channel's whole library), search, video, videos, playlist, courses
- lib/catalog.js     talks to the YouTube Data API v3
- channels.json      the channel list: name + category, optionally a handle, id or a fixed playlist
- courses.json       optional featured courses (YouTube playlists)
- scripts/resolve-channels.js   optional helper (see Channels)

## Setup
1. Get a YouTube Data API v3 key (Google Cloud Console, free) and restrict it to that API.
2. Push this folder to GitHub, import it in Vercel (framework "Other", no build command).
3. In Vercel > Settings > Environment Variables add  YT_API_KEY  = your key, with Production, Preview and Development ticked (the
   deploy-time build uses it too). Also add  CERT_SECRET  = any long random text: it signs the certificates (see Certificates).
   Keep it secret and do not change it later, or old certificates stop verifying. Deploy.
   Never write the key into a file: anything in GitHub can be read. Nothing else is required.
Local test: `npm i -g vercel`, create .env.local with YT_API_KEY=..., run `vercel dev`.

## Channels
channels.json lists names; the server finds each channel on YouTube by itself (1 quota unit per channel per refresh) and only accepts
a match when the YouTube channel title equals the name, so a wrong guess is skipped, never mixed in. Open /api/feed on your site:
"skipped" lists names that could not be matched. To fix one, add its handle ("handle": "exacthandle") or channel id ("id": "UC...")
in channels.json (YouTube > channel > About > Share > Copy channel ID). Optional: `scripts/resolve-channels.js` (instructions at
the top of the file) writes ids into channels.json using search, which saves quota and fixes stubborn names.
A fixed playlist can be used instead of a channel: { "name": "...", "category": "...", "playlist": "PL..." }.
Quota: about 2 units per channel plus 1 per 50 videos per refresh, 4 refreshes a day (about 2,500 of the 10,000 daily units).
The first load after a deploy takes up to 30 seconds; after that Vercel serves a cached copy.

## Podcasts
Raj Shamani (handle @rajshamani and the Figuring Out playlist), Joe Rogan (@PowerfulJRE) and Nikhil Kamath are in channels.json.
The Podcasts page also searches YouTube for any of the three that did not load, so it is never empty (100 units per search, cached 24 h).
Podcasts stay out of Home until a student watches one. Settings can hide them (they can contain mature language).

## Courses and certificates
Courses > Create a course builds a curriculum with modules, lessons and a progress bar from a playlist, a long video (chapters from the
description, or 20-minute parts) or several links. Lessons complete automatically and move on; "Edit structure" reorders and regroups.
Every lesson has a red play button, notes, Like, Watch later and Add to playlist. The course page starts with a short
"How to use this course" note, and when the course is complete it shows the steps to get the certificate. Open any YouTube link from the search bar or Courses; "Make a course"
converts any video.
When every lesson is complete, "Get your certificate" asks for the student's name and course name and creates a certificate
(PDF via the print window, or PNG). See Certificates.

## Speed
- At deploy time scripts/build-feed.js (the "buildCommand" in vercel.json) writes public/feed.json: the whole lesson list as a plain static
  file, so lessons appear almost instantly with no wait for YouTube. It also writes channels.resolved.json so the server skips channel look-ups.
- The browser starts downloading feed.json while the scripts load, scripts are deferred and cached for a year (they are version-stamped
  on every deploy, so updates still arrive), and thumbnails connect early and load lazily.
- The live feed (/api/feed) is only asked for when the snapshot is missing or more than 6 hours old, and it is applied quietly on the next
  page change. To refresh the snapshot, redeploy (Vercel > Deployments > Redeploy). The build log lists any channels that could not be matched.
- Without YT_API_KEY at build time there is no snapshot: the site still works, it just loads from /api/feed (slower on the very first visit).

## Notes beside the video
On every video and lesson page the notes sit beside the player (toggle "Notes below video" for the old layout). "Full screen + notes"
fills the screen with the video and the notes side by side (YouTube's own full-screen button is hidden, because it would hide the notes).
Notes autosave, support timestamps that jump the video, and download as .txt, .md or PDF.

## Certificates
Each certificate is signed by the server (api/certify.js) with CERT_SECRET, so anyone can check it at the Verify page
(Courses > Verify a certificate, or the link printed in small type at the bottom of the certificate, also "Copy verification link").
An edited or invented certificate fails the check (api/verify.js). Before signing, the server checks on YouTube that at least 80% of the
course's videos exist and works out the real minutes of video, which are printed on the certificate (a course needs at least 5 minutes).
What it proves: Toppertube issued this certificate, for this course, and the details have not been changed. What it cannot prove: that the
student watched the videos, because lesson progress is recorded in the student's own browser (there are no logins). If the server cannot
be reached, a local certificate is made and marked "Not verifiable online yet", with a button to retry. Cost: 1 YouTube quota unit per 50 videos.
If CERT_SECRET is not set, YT_API_KEY is used as the secret, but then replacing that key makes old certificates fail: set CERT_SECRET.

## Continue watching, streaks and goals
- Where a student stops is saved while a video plays; Home shows "Continue watching" (videos and course lessons, with a progress bar and
  Remove), reopening resumes at that spot with a "Start over" button, and thumbnails everywhere show a thin progress bar.
- Study time is counted while a video is playing. The Progress page (menu) shows today against a daily goal (10 to 90 minutes), the current
  and best streak (a day counts when the goal is reached; today unfinished does not break yesterday's streak), the last 7 days and badges.
  Home shows a one-line summary. All of this is saved in the student's browser and is included in Settings > Download backup.

## Phone held sideways
On a phone in landscape, a video or lesson page becomes video only: the video fills the screen, with a slim two-column rail of icon buttons
on the right (Back, Like, Watch later, Add to playlist, Make a course, Open on YouTube; on lessons also Lessons, Mark complete, Previous and
Next). The Lessons button (Up next on a plain video) slides the lesson list over the video, with a play button on every lesson; the pen
button slides the notes over it. One panel is open at a time, and tapping the button again closes it. Turning the phone upright restores
the normal page. It is pure CSS (a touch screen
less than 520 px high), so no extra settings are needed. The browser's own address bar can stay visible on some phones; "Add to Home
screen" opens the site without it (manifest.webmanifest and the favicon sizes are included).

## Search
Type any topic or question. Results are ranked by relevance:
- generic words such as "course", "channel" or "tutorial" never block a match; at least half of the real words must match;
- partial forms (engineer / engineering), small typing mistakes in longer words, and shorthand (AI, ML, DS, DSA, JS, NLP, UI, UX ...) are understood;
- each video carries a short searchable text (the start of its description and its tags), so topics are found even when the title does not say them;
- channels whose name matches are shown as chips above the results ("khan" shows Khan Academy);
- while typing, the search box suggests channels, subjects and lesson titles.
- every result shows a short piece of the video's description around the words you searched for, highlighted, so you can see why it matched;
When our own channels have fewer than 8 matches, YouTube is searched automatically ("More from YouTube", in YouTube's own relevance
order, channels outside our list included). Each new YouTube search costs 100 of the 10,000 daily quota units; answers are cached for
24 hours and repeated within a visit, the query is cleaned ("ai engineer channel" -> "ai engineer") so more searches share one cached answer,
and each server allows 40 per hour. If many students search different things, the quota can run out for the day: the lesson snapshot
keeps working, and you can request more quota from Google. Page titles change with the page. Because the site uses # links, Google can
index only the home page (description and social tags are set), not individual searches or videos.
Inside a channel page, search covers titles and descriptions of the loaded lessons, and "Search the whole library" loads the rest.

## Favicon
public/favicon.png and favicon-32.png come from your T logo image. The header keeps the text logo.

## SEO
`scripts/build-seo.js` runs at deploy time (first part of `buildCommand`). The app uses #/hash routes that search engines cannot index one by
one, so the script writes real pages from channels.json: /categories, /category/<name> (one per category), /about (with FAQ markup), plus
`sitemap.xml`, `llms.txt` and the crawlable intro block inside index.html (between the `seo:start` / `seo:end` markers; the app replaces it
when it loads). `robots.txt` welcomes search and AI crawlers and points to the sitemap; `og-image.png` is the share image.
After a deploy: add the site in Google Search Console and Bing Webmaster Tools, submit https://www.toppertube.online/sitemap.xml, and use
"Request indexing" on the home page. Editing channels.json is enough to refresh every category page on the next deploy.

### Lesson pages (/watch/<id>)
Every lesson in the feed has its own crawlable address, https://www.toppertube.online/watch/<YouTube id>. `api/watch.js` serves the normal app page
with that lesson's title, description, canonical address, share tags, VideoObject markup and readable text filled in (the facts come from
`lib/videos.index.json`, written at deploy time by scripts/build-feed.js, so no YouTube quota is used). The app then opens the lesson at /#/watch/<id>.
Videos outside the feed still open but are marked noindex. `sitemap.xml` is an index of `sitemap-pages.xml` and `sitemap-videos-N.xml`
(one URL per lesson). Needs YT_API_KEY at build time; without it only the category, about and home pages are listed.

### Videos that cannot play outside YouTube
If a video's owner turns off embedding, the video can still be added to a course, opened by link, or kept in a playlist. In place of the player the
page shows a card with a "Watch on YouTube" button (opens a new tab, at the chapter's start time for chapter lessons). In a course the lesson keeps
its notes box, Mark complete, the 3-second next-lesson countdown and the certificate link; because the video plays on YouTube, the app cannot see
progress, so the learner presses "I've watched it" (or Mark complete) and study time is not counted for that lesson.
