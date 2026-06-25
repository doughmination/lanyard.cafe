import { useEffect, useState } from "react";
import type { Member } from "./members";
import "./index.css";

type DiscordStatus = "online" | "idle" | "dnd" | "offline";

interface LanyardUser {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  discriminator?: string;
}

interface Presence {
  discord_status: DiscordStatus;
  discord_user: LanyardUser;
}

interface RingData {
  current: Member | null;
  prev: Member;
  next: Member;
  random: Member;
  members: Member[];
}

const pagecount = 5;

const STATUS_COLORS: Record<DiscordStatus, string> = {
  online: "#4ade80",
  idle: "#facc15",
  dnd: "#f87171",
  offline: "#9ca3af",
};

const STATUS_LABELS: Record<DiscordStatus, string> = {
  online: "online",
  idle: "idle",
  dnd: "do not disturb",
  offline: "offline",
};

export function App() {
  const [data, setData] = useState<RingData | null>(null);
  const [copied, setCopied] = useState(false);
  const [page, setPage] = useState(0);
  const [dark, setDark] = useState(false);
  const [presences, setPresences] = useState<Record<string, Presence | null>>({});

  useEffect(() => {
    fetch("/api/ring")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("lc-theme");
    const pref = saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(pref);
    document.documentElement.classList.toggle("dark", pref);
  }, []);

  useEffect(() => {
    async function loadPresence() {
      const ids = (data?.members ?? []).map((m) => m.discordId).filter(Boolean) as string[];
      if (ids.length === 0) return;
      try {
        const r = await fetch("/api/members/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        if (!r.ok) return;
        const d = await r.json() as { presences: Record<string, Presence | null> };
        setPresences(d.presences);
      } catch {
        // ignore
      }
    }

    loadPresence();
    const poll = setInterval(loadPresence, 60_000);
    return () => clearInterval(poll);
  }, [data?.members]);

const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("lc-theme", next ? "dark" : "light");
  };

  function getPresence(m: Member): Presence | null {
    if (!m.discordId) return null;
    return presences[m.discordId] ?? null;
  }

  function displayName(m: Member): string {
    const p = getPresence(m);
    return p?.discord_user?.global_name || p?.discord_user?.username || m.name;
  }

  function getHandle(m: Member): string | null {
    const user = getPresence(m)?.discord_user;
    if (!user) return null;
    if (user.discriminator && user.discriminator !== "0") {
      return `${user.username}#${user.discriminator}`;
    }
    return `@${user.username}`;
  }

  function getAvatarUrl(m: Member): string | null {
    const user = getPresence(m)?.discord_user;
    if (!user?.avatar) return null;
    const ext = user.avatar.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=96`;
  }

  function getStatus(m: Member): DiscordStatus {
    if (!m.discordId) return "offline";
    return presences[m.discordId]?.discord_status ?? "offline";
  }

const members = data?.members ?? [];
  const totalPages = Math.max(1, Math.ceil(members.length / pagecount));
  const safePage = Math.min(page, totalPages - 1);
  const pageMembers = members.slice(safePage * pagecount, (safePage + 1) * pagecount);

  const embedCode = `<script src="${window.location.origin}/api/embed.js"></script>`;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="max-w-2xl mx-auto w-full px-6 md:px-8 py-12 md:py-16">
        <header className="mb-12">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <img src="/lanyard.png" alt="lanyard.cafe logo" className="w-10 h-10" />
                <h1 className="font-serif text-4xl md:text-5xl text-text leading-tight">
                  lanyard.cafe
                </h1>
              </div>
              <p className="font-sans text-text-light text-base mt-2 max-w-lg">
                the best webring around, built for the lanyard.rest community
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md bg-cream-dark/80 text-text-light hover:bg-cream-dark transition-all duration-200 text-1xl mt-3"
              aria-label="theme"
            >
              {dark ? "☀" : "☾"}
            </button>
          </div>
        </header>

        {data && (
          <section className="mb-12">
            <h2 className="font-serif text-2xl text-text mb-4">navigate</h2>
            <div className="bg-cream-dark/80 backdrop-blur-sm rounded-2xl p-5 border border-cream-dark inline-block min-w-[260px]">
              <div className="flex gap-3 mb-3">
                <a
                  href={data.prev.url}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pink-light text-pink-dark font-semibold text-sm hover:bg-pink hover:text-white transition-all duration-200"
                >
                  <span>◀</span> prev
                </a>
                <a
                  href={data.random.url}
                  className="px-4 py-2 rounded-xl bg-lavender-light text-[#9B7EB5] font-semibold text-sm hover:bg-lavender hover:text-white transition-all duration-200"
                >
                  random
                </a>
                <a
                  href={data.next.url}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pink-light text-pink-dark font-semibold text-sm hover:bg-pink hover:text-white transition-all duration-200"
                >
                  next <span>▶</span>
                </a>
              </div>
              <p className="text-sm text-text-light">
                you are at <span className="font-semibold text-text">lanyard.cafe</span>
              </p>
            </div>
          </section>
        )}

        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-2xl text-text">members</h2>
            {totalPages > 1 && (
              <div className="flex items-center gap-2 text-sm text-text-light">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="px-2 py-1 rounded-lg bg-pink-light text-pink-dark font-semibold hover:bg-pink hover:text-white transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ◀
                </button>
                <span className="tabular-nums">{safePage + 1}/{totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage === totalPages - 1}
                  className="px-2 py-1 rounded-lg bg-pink-light text-pink-dark font-semibold hover:bg-pink hover:text-white transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ▶
                </button>
              </div>
            )}
          </div>
          <div className="grid gap-3">
            {pageMembers.map((site) => {
              const avatar = getAvatarUrl(site);
              const state = getStatus(site);
              const handle = getHandle(site);
              return (
                <a
                  key={site.name}
                  href={site.url}
                  className="group flex items-center justify-between gap-4 bg-cream-dark/80 backdrop-blur-sm rounded-2xl px-5 py-4 border border-cream-dark hover:border-pink/40 hover:bg-cream-dark transition-all duration-200"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      {avatar ? (
                        <img
                          className="w-10 h-10 rounded-lg object-cover border border-cream-dark"
                          src={avatar}
                          alt=""
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-cream flex items-center justify-center font-serif text-base text-text-light border border-cream-dark">
                          {displayName(site).slice(0, 1).toLowerCase()}
                        </div>
                      )}
                      {site.discordId && (
                        <span
                          className="absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full border-2 border-cream-dark"
                          style={{ background: STATUS_COLORS[state] }}
                        />
                      )}
                    </div>

                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className="font-serif text-base text-text group-hover:text-pink-dark transition-colors truncate">
                        {displayName(site)}
                      </span>
                      <span className="text-xs text-text-light truncate">
                        {handle ?? site.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </span>
                    </div>

                    {site.discordId && (
                      <span className="ml-2 shrink-0 text-xs text-text-light hidden sm:block">
                        {STATUS_LABELS[state]}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {site.buttonUrl && (
                      <img
                        src={site.buttonUrl}
                        alt=""
                        className="w-[88px] h-[31px] border border-cream-dark"
                        style={{ imageRendering: "pixelated" }}
                      />
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="font-serif text-2xl text-text mb-4">join</h2>
          <div className="bg-cream-dark/80 backdrop-blur-sm rounded-2xl p-5 border border-cream-dark">
            <p className="text-sm text-text-light mb-4 max-w-md">
              want to add your site to the ring? open a pull request on our{" "}
              <a href="https://github.com/venqoi/lanyard.cafe" className="text-pink hover:underline">
                github repo
              </a>
            </p>
            <div>
              <p className="text-sm font-semibold text-text mb-2">add to your site:</p>
              <div className="flex gap-2 items-start">
                <code className="flex-1 bg-cream-dark text-text text-xs p-2.5 rounded-xl border border-cream-dark break-all font-mono">
                  {embedCode}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(embedCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="shrink-0 px-3 py-2 rounded-xl bg-brown-light text-brown-dark font-semibold text-xs hover:bg-brown hover:text-white transition-all duration-200"
                >
                  {copied ? "copied!" : "copy"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
