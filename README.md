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

## Search
Ranked by relevance: generic words like "course" never block a match, partial forms match, AI/ML/DSA/JS are expanded. "Search more
on YouTube" adds results from any channel (100 units per new search, cached 24 hours, 40 per hour per server).
Inside a channel page, search covers titles and descriptions of the loaded lessons, and "Search the whole library" loads the rest.

## Favicon
public/favicon.png and favicon-32.png come from your T logo image. The header keeps the text logo.
