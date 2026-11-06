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
   deploy-time build uses it too). Deploy.
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
(PDF via the print window, or PNG). The certificate is made in the browser from the student's own progress, so it is a completion
certificate, not a verified credential.

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

## Phone held sideways
On a phone in landscape, a video or lesson page becomes video only: the video fills the screen, with a slim column of icon buttons on the
right (Back, Like, Watch later, Add to playlist, Make a course, Open on YouTube; on lessons also Mark complete, Previous and Next) and a
pen button that slides the notes over the video. Turning the phone upright restores the normal page. It is pure CSS (a touch screen
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
