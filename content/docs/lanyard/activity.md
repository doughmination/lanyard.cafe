# Fetching Activity Images

:::info
For most of these APIs, you can specify a `?size=` URL parameter, to get a specific size of that image, not all images have all sizes, generally, you can use `?size=4096` to get the biggest image available.
:::

> https://api.lanyard.rest/v1/users/{userid}
> wss://api.lanyard.rest/socket

### Endpoints:
- External: `https://media.discordapp.net/external/{hash}`
- Spotify: `https://i.scdn.co/image/{hash}`
- Rich Presence: `https://cdn.discordapp.com/app-assets/{app-id}/{id}.png`
- Games: `https://cdn.discordapp.com/app-icons/{app-id}/{id}.png`
    - Or `https://dcdn.dstn.to/app-icons/{app-id}`
    - When only the application_id is known, you can use:
      `https://discord.com/api/v10/applications/{app-id}/rpc`
      then use the returned icon hash with the app-icons url above.

### What Lanyard returns
```json
"activities": [
  { // example 1 (custom rich presence)
    "application_id": "383226320970055681", // we need this (id)
    "assets": {
      "large_image": "1359299128655347824", // we need this (image) [large]
      "small_image": "1359299466493956258", // we need this (image) [small]
      // ...
    },
    "id": "68ffcccd1e19ceaf", // we do NOT need this
    // ...
    // irrelevant info
    // ...
    "type": 0
  }, // resolveImage("1359299128655347824", "383226320970055681")

  { // example 2 (game)
    "application_id": "599659394082406493", // we need this (id)
    "assets": {}, // no assets
    "id": "9bbdb3a1d35cff1e", // we do NOT need this
    // ...
    // irrelevant info
    // ...
    "type": 0
  }, // resolveImage(null, "599659394082406493")

  { // example 3 (spotify)
    "assets": {
      "large_image": "spotify:ab67616d0000b27311ba5a0e0ae3f9979f4e6c2f", // we need this (image)
      // ...
    },
    // ...
    // irrelevant info
    // ...
    "type": 2
  }, // resolveImage("spotify:ab67616d0000b27311ba5a0e0ae3f9979f4e6c2f")

  { // example 4
    "application_id": "1347519265338687488", // we do NOT need this
    "assets": {
      "small_image": "mp:external/q1EBrnviDgCSwEBa-XW5MN_Pzss8fC9p8zABpkEH1-Y/https/cdn2.steamgriddb.com/icon/e1bd06c3f8089e7552aa0552cb387c92/32/512x512.png"
      // we have an external asset here, we need this (image)
    },
    "id": "b5b4b01698378a38", // we also don't need this
    // ...
    // irrelevant info
    // ...
    "type": 0
  } // resolveImage("mp:external/q1EBrnviDgCSwEBa-XW5MN_Pzss8fC9p8zABpkEH1-Y/https/cdn2.steamgriddb.com/icon/e1bd06c3f8089e7552aa0552cb387c92/32/512x512.png")
]
```

### Function
```javascript
const resolveImage = async (image, id = null) => {
    if (!image) {
        // no asset hash — fetch the app's icon hash from RPC endpoint
        if (!id) return null;

        try {
            const res = await fetch(`https://discord.com/api/v10/applications/${id}/rpc`);
            if (!res.ok) return null;
            const data = await res.json();
            return data.icon
                ? `https://cdn.discordapp.com/app-icons/${id}/${data.icon}.png?size=512`
                : null;
        } catch {
            return null;
        }

        // alternatively, use Dustin's API:
        // return `https://dcdn.dstn.to/app-icons/${id}`;
    }

    if (image.startsWith("mp:external/")) {
        return image.replace("mp:external/", "https://media.discordapp.net/external/");
    }

    if (image.startsWith("spotify:")) {
        return `https://i.scdn.co/image/${image.replace("spotify:", "")}`;
    }

    if (!id) return null;

    // the idea here is that if purely numeric, its a rich presence asset (snowflake)
    // otherwise, its a game icon (hash)
    return /^\d+$/.test(image)
        ? `https://cdn.discordapp.com/app-assets/${id}/${image}.png?size=512`
        : `https://cdn.discordapp.com/app-icons/${id}/${image}.png?size=512&keep_aspect_ratio=false`;
};
```
<small>written by [Schuh](https://schuh.wtf/)</small>
