import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { staticPlugin } from "@elysiajs/static";
import { MEMBERS, getMemberByUrl, getAdjacentMembers } from "./members";

function getSite(req: Request) {
  const fromQuery = new URL(req.url).searchParams.get("url");
  if (fromQuery) return fromQuery;
  return req.headers.get("Referer") ?? "";
}

function randomMember() {
  return MEMBERS[Math.floor(Math.random() * MEMBERS.length)]!;
}

function embedScript() {
  return `(function() {
  var host = location.hostname.replace(/^www\\./, '');
  var container = document.createElement('div');
  container.id = 'lc-embed';
  container.style.cssText = 'position:fixed;bottom:16px;left:16px;z-index:99999;font-family:Quicksand,system-ui,sans-serif;';
  document.body.appendChild(container);

  var script = document.currentScript || document.querySelector('script[src*="embed.js"]');
  var dark = script && script.getAttribute('data-theme') === 'dark';

  var bg = dark ? '#2C2420' : 'rgb(255, 248, 240)';
  var border = dark ? '#5A4A40' : '#F5EDE0';
  var text = dark ? '#E8D5C4' : '#8B7A6A';
  var textStrong = dark ? '#FFF8F0' : '#4A3728';
  var pinkBg = dark ? '#4A2A33' : '#FCE4EC';
  var pinkText = dark ? '#F4A7B9' : '#E8879E';
  var lavenderBg = dark ? '#352B45' : '#EEE6F5';
  var lavenderText = dark ? '#D4C5E2' : '#9B7EB5';

  fetch('https://lanyard.cafe/api/ring?url=' + encodeURIComponent(host))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var prev = data.prev, next = data.next, random = data.random;
      var isMember = data.current !== null;
      var currentLine = isMember
        ? '<p style="margin:0;font-size:14px;color:' + text + ';">you are at <span style="font-weight:600;color:' + textStrong + ';">' + data.current.url + '</span></p>'
        : '';
      container.innerHTML =
        '<section style="margin-bottom:48px;">' +
        '<div style="background:' + bg + ';backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border:1.5px solid ' + border + ';border-radius:16px;padding:16px;display:inline-block;min-width:260px;font-size:14px;">' +
        '<div style="display:flex;gap:12px;' + (isMember ? 'margin-bottom:12px;' : '') + '">' +
        '<a href="' + prev.url + '" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:12px;background:' + pinkBg + ';color:' + pinkText + ';font-weight:600;font-size:14px;text-decoration:none;white-space:nowrap;">\\u25C0 prev</a>' +
        '<a href="' + random.url + '" style="display:inline-flex;align-items:center;padding:8px 16px;border-radius:12px;background:' + lavenderBg + ';color:' + lavenderText + ';font-weight:600;font-size:14px;text-decoration:none;white-space:nowrap;">random</a>' +
        '<a href="' + next.url + '" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:12px;background:' + pinkBg + ';color:' + pinkText + ';font-weight:600;font-size:14px;text-decoration:none;white-space:nowrap;">next \\u25B6</a>' +
        '</div>' +
        currentLine +
        '</div>' +
        '</section>';
    })
    .catch(function() {});
})();`;
}

const app = new Elysia()
  .use(cors())
  .get("/api/members", () => MEMBERS)
  .get("/api/ring", ({ request }) => {
    const site = getSite(request);
    const current = getMemberByUrl(site) ?? null;
    if (current) {
      const { prev, next } = getAdjacentMembers(current.url);
      const others = MEMBERS.filter((m) => m.url !== current.url);
      const random =
        others[Math.floor(Math.random() * others.length)] ?? MEMBERS[0]!;
      return { current, prev, next, random, members: MEMBERS };
    }
    const pick = randomMember();
    const i = MEMBERS.indexOf(pick);
    return {
      current: null,
      prev: pick,
      next: MEMBERS[(i + 1) % MEMBERS.length]!,
      random: pick,
      members: MEMBERS,
    };
  })
  .get("/api/ring/prev", ({ request, redirect }) => {
    const site = getSite(request);
    const current = getMemberByUrl(site);
    if (current) return redirect(getAdjacentMembers(current.url).prev.url);
    return redirect(randomMember().url);
  })
  .get("/api/ring/next", ({ request, redirect }) => {
    const site = getSite(request);
    const current = getMemberByUrl(site);
    if (current) return redirect(getAdjacentMembers(current.url).next.url);
    return redirect(randomMember().url);
  })
  .get("/api/ring/random", ({ redirect }) => redirect(randomMember().url))
  .post("/api/members/presence", async ({ body }) => {
    const { ids } = body as { ids: string[] };
    const validIds = (Array.isArray(ids) ? ids : []).filter((id) => /^\d+$/.test(id));
    const results: Record<string, unknown> = {};
    await Promise.all(
      validIds.map(async (id) => {
        try {
          const r = await fetch(`https://api.lanyard.rest/v1/users/${id}`);
          if (!r.ok) { results[id] = null; return; }
          const d = await r.json() as { success: boolean; data: { discord_status: string; discord_user: object } };
          if (!d.success) { results[id] = null; return; }
          results[id] = { discord_status: d.data.discord_status, discord_user: d.data.discord_user };
        } catch {
          results[id] = null;
        }
      })
    );
    return { presences: results };
  })
  .get(
    "/api/embed.js",
    () =>
      new Response(embedScript(), {
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      }),
  )
  .get("/", () => Bun.file("dist/index.html"))
  .use(staticPlugin({ assets: "dist", prefix: "/" }))
  .listen(8943);

console.log(`lanyard.cafe running at ${app.server?.url}`);
