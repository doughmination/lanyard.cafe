# FAQ

## How do I get monitored by Lanyard?

Join the Lanyard Discord server. Your account gets picked up automatically once you're a member.



## I joined but still get `user_not_monitored`. Why?

Double-check that you're using your actual Discord user ID, not a message ID or server ID. Enable Developer Mode in Discord settings, right-click your profile, and select "Copy User ID". Make sure you're querying: https://api.lanyard.rest/v1/users/{YOUR_ID}



What is the Lanyard API key for?

The API key is only needed for K/V write operations and the `@me` route. Reading another user's presence publicly at https://api.lanyard.rest/v1/users/{USER_ID} requires no key.



## Why isn't my Spotify showing up?

Check the pinned messages in the support channel first. Common causes: Spotify not linked to Discord, Spotify activity privacy turned off, or an intermittent gateway issue. If your status shows in Discord but not Lanyard, wait a bit.



## Why are `banner` and `accent_color` always null?

Discord doesn't send banner or accent color data over the gateway socket. Lanyard never receives it. A common workaround is storing those values manually in K/V.



## Does Lanyard support Discord badges (Nitro, HypeSquad, etc.)?

No. Lanyard has never returned badge data. For badges, use Dustin's API: https://dcdn.dstn.to/profile/{USER_ID}. It's an unofficial tool, not maintained by the Lanyard team, and has no guaranteed uptime.



## Where do I get Discord profile banners via API?

Dustin's API: https://dcdn.dstn.to/banners/{USER_ID}?size={SIZE}. Lanyard does not expose banners.



## What is K/V and how do I use it?

K/V is key-value storage that lets you attach custom data to your Lanyard response. Use the Lanyard bot in the bot commands channel:

`.set KEY VALUE` stores a value

`.get KEY` retrieves it

`.del KEY` removes it

You can also set K/V via authenticated API requests. Results show up under the `kv` object in your Lanyard response.



## What does `discord_status` return?

One of four strings: `online`, `idle`, `dnd`, or `offline`.



## Should I use REST or WebSocket?

WebSocket is strongly preferred for live data on a website. REST requires repeated polling. WebSocket pushes updates to you in real time. Use `wss://api.lanyard.rest/socket`, for more info, run `/socket` in the `kv-commands` channel for full setup instructions.



## My WebSocket keeps disconnecting. Is that normal?

Occasional disconnections are expected. You need to implement reconnection logic in your client. Send a heartbeat every 30 seconds as specified in the `heartbeat_interval` from the server's hello payload, and reconnect with backoff when the connection drops.



## What is Dustin's API?

A separate unofficial API maintained by Dustin (a Lanyard contributor). It exposes Discord profile data not available through Lanyard, including badges, banners, accent colors, connected accounts, and collectibles.

Profile: https://dcdn.dstn.to/profile/{USER_ID}

Banner: https://dcdn.dstn.to/banners/{USER_ID}

Docs: https://dcdn.dstn.to/gist



## Is Dustin's API reliable enough to depend on?

The maintainer describes it as not a guaranteed-uptime service. It works fine for personal projects. Don't build anything production-critical on it without a fallback.



## Do I need to be in the Lanyard server to use it?

Yes, you need to be in the server for the bot to receive your gateway events, without that, it doesn't have any info on you.



## How do I find my Discord user ID?

Enable Developer Mode (Settings > Advanced > Developer Mode), then right-click your username and select "Copy User ID".



## Can I self-host Lanyard?

Yes. The official repo includes Docker instructions: https://github.com/Phineas/lanyard#self-host-with-docker. This lets you monitor users without requiring them to join a specific Discord server.



## Where do I ask for help?

Read the pinned messages in #support first. They cover the most common issues, Spotify problems especially. For questions about Dustin's API, use https://dcdn.dstn.to/gist as the reference.
