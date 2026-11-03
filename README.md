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
1. API key. In Vercel: Project > Settings > Environment Variables > add  YT_API_KEY  = your key
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

## Notes
Notes are saved automatically per lesson (or as free notes). Add timestamps while watching, click them to jump.
Download as .txt, .md or PDF (PDF opens the print window: choose "Save as PDF").

## Limits
- Home and search use each channel's 25 newest videos. Older lessons appear on the channel page after "Load full library" (not in Home or search).
- Search covers the loaded catalog, not all of YouTube.
- Videos shorter than 4 minutes, live streams and non-embeddable videos are left out.
"# Toppertube" 
