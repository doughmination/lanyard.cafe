import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { staticPlugin } from "@elysiajs/static";
import { MEMBERS, getMemberByUrl, getAdjacentMembers } from "./members";
import { marked } from "marked";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const DOCS_DIR = path.join(import.meta.dir, "..", "content", "docs");

const DOCS_CSS = `
  :root {
    --cream: #e3d9c5; --cream-dark: #F5EDE0;
    --pink: #F4A7B9; --pink-dark: #E8879E;
    --text: #4A3728; --text-light: #8B7A6A;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --cream: #2C2420; --cream-dark: #3D322C;
      --pink: #D4849A; --pink-dark: #F4A7B9;
      --text: #E8D5C4; --text-light: #A09080;
    }
  }
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; font-family: 'Quicksand', system-ui, sans-serif; background: var(--cream); color: var(--text); min-height: 100vh; line-height: 1.75; }
  .container { max-width: 680px; margin: 0 auto; padding: 48px 24px 80px; }
  nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 40px; }
  .nav-home { font-family: 'DM Serif Display', serif; font-size: 1.1rem; color: var(--text); text-decoration: none; }
  .nav-home:hover { color: var(--pink-dark); }
  .back { font-size: 0.8rem; color: var(--text-light); text-decoration: none; }
  .back:hover { color: var(--pink-dark); }
  h1, h2, h3, h4 { font-family: 'DM Serif Display', serif; color: var(--text); line-height: 1.2; margin-top: 2em; margin-bottom: 0.5em; }
  h1 { font-size: 2.2rem; margin-top: 0; }
  h2 { font-size: 1.5rem; border-bottom: 1px solid var(--cream-dark); padding-bottom: 6px; }
  h3 { font-size: 1.15rem; }
  p { margin: 0.9em 0; }
  a { color: var(--pink-dark); text-decoration: none; }
  a:hover { text-decoration: underline; }
  code { font-family: ui-monospace, monospace; font-size: 0.84em; background: var(--cream-dark); padding: 2px 6px; border-radius: 4px; }
  pre { background: var(--cream-dark); border: 1px solid rgba(0,0,0,0.07); border-radius: 10px; padding: 16px 20px; overflow-x: auto; margin: 1.4em 0; }
  pre code { background: none; padding: 0; font-size: 0.88em; }
  hr { border: none; border-top: 1px solid var(--cream-dark); margin: 2.5em 0; }
  blockquote { border-left: 3px solid var(--pink); margin: 1.2em 0; padding: 2px 0 2px 16px; color: var(--text-light); }
  table { border-collapse: collapse; width: 100%; margin: 1.4em 0; font-size: 0.9em; }
  th, td { border: 1px solid var(--cream-dark); padding: 8px 14px; text-align: left; }
  th { font-weight: 600; background: var(--cream-dark); font-family: 'DM Serif Display', serif; }
  ul, ol { padding-left: 1.5em; margin: 0.8em 0; }
  li { margin: 0.35em 0; }
  img { max-width: 100%; border-radius: 8px; }
  .doc-list { list-style: none; padding: 0; margin: 1.5em 0; display: flex; flex-direction: column; gap: 10px; }
  .doc-list a { display: block; background: var(--cream-dark); border-radius: 12px; padding: 14px 18px; color: var(--text); font-family: 'DM Serif Display', serif; font-size: 1.05rem; transition: color 0.15s; }
  .doc-list a:hover { color: var(--pink-dark); text-decoration: none; }
  .doc-list .slug { display: block; font-family: 'Quicksand', system-ui, sans-serif; font-size: 0.75rem; color: var(--text-light); margin-top: 2px; }
`;

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin /><link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet" />`;

function docsPage(title: string, body: string, showBack = true) {
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${title} - lanyard.cafe</title>${FONTS}<style>${DOCS_CSS}</style></head><body><div class="container"><nav><a class="nav-home" href="/">lanyard.cafe</a>${showBack ? '<a class="back" href="/docs">← docs</a>' : ""}</nav>${body}</div></body></html>`;
}

async function getDocTitle(md: string): Promise<string> {
  const m = md.match(/^#\s+(.+)/m);
  return m?.[1]?.trim() ?? "docs";
}

async function listDocs(): Promise<{ slug: string; title: string }[]> {
  try {
    const files = (await readdir(DOCS_DIR, { recursive: true })) as string[];
    const docs = await Promise.all(
      files
        .map((f) => f.replace(/\\/g, "/"))
        .filter((f) => f.endsWith(".md") && f !== "index.md")
        .map(async (f) => {
          const slug = f.replace(/\.md$/, "").replace(/\/index$/, "");
          const content = await readFile(path.join(DOCS_DIR, f), "utf8");
          return { slug, title: await getDocTitle(content) };
        }),
    );
    return docs;
  } catch {
    return [];
  }
}

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
    const validIds = (Array.isArray(ids) ? ids : []).filter((id) =>
      /^\d+$/.test(id),
    );
    const results: Record<string, unknown> = {};
    await Promise.all(
      validIds.map(async (id) => {
        try {
          const r = await fetch(`https://api.lanyard.rest/v1/users/${id}`);
          if (!r.ok) {
            results[id] = null;
            return;
          }
          const d = (await r.json()) as {
            success: boolean;
            data: { discord_status: string; discord_user: object };
          };
          if (!d.success) {
            results[id] = null;
            return;
          }
          results[id] = {
            discord_status: d.data.discord_status,
            discord_user: d.data.discord_user,
          };
        } catch {
          results[id] = null;
        }
      }),
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
  .get("/docs", async () => {
    const indexPath = path.join(DOCS_DIR, "index.md");
    const [indexMd, docs] = await Promise.all([
      readFile(indexPath, "utf8").catch(() => "# docs\n"),
      listDocs(),
    ]);
    const indexHtml = await marked(indexMd);
    const listHtml = docs.length
      ? `<ul class="doc-list">${docs.map((d) => `<li><a href="/docs/${d.slug}">${d.title}<span class="slug">/docs/${d.slug}</span></a></li>`).join("")}</ul>`
      : "";
    return new Response(docsPage("docs", indexHtml + listHtml, false), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  })
  .get("/docs/*", async ({ params, set }) => {
    const rawSlug = (params as Record<string, string>)["*"] ?? "";
    if (!rawSlug || /\.\./.test(rawSlug) || !/^[a-z0-9\-_/]+$/i.test(rawSlug)) {
      set.status = 404;
      return "not found";
    }
    let md: string | null = null;
    for (const candidate of [
      path.join(DOCS_DIR, `${rawSlug}.md`),
      path.join(DOCS_DIR, rawSlug, "index.md"),
    ]) {
      try { md = await readFile(candidate, "utf8"); break; } catch {}
    }
    if (!md) {
      set.status = 404;
      return new Response(docsPage("not found", "<h1>not found</h1><p>That doc doesn't exist.</p>"), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    const html = await marked(md);
    const title = await getDocTitle(md);
    return new Response(docsPage(title, html), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  })
  .get("/", () => Bun.file("dist/index.html"))
  .use(staticPlugin({ assets: "dist", prefix: "/" }))
  .listen(8943);

console.log(`lanyard.cafe running at ${app.server?.url}`);
