export interface Env {
  LEADERBOARD_KV: KVNamespace;
}

const EMOJI_AVATARS = [
  "🦁", "🐯", "🐻", "🐨", "🐼", "🐸", "🐙", "🐵",
  "🐔", "🦄", "🐝", "🦋", "🐞", "🦕", "🦖", "🐬",
  "🐳", "🦭", "🐊", "🐅", "🐆", "🦓", "🦍", "🦧",
  "🐘", "🦛", "🦏", "🐪", "🦒", "🦘", "🐃", "🐂",
  "🐄", "🐎", "🐖", "🐏", "🐑", "🦙", "🐐", "🦌",
  "🐕", "🐈"
];

interface KVPair {
  key: string;
  value: string;
}

interface UserRecord {
  openid: string;
  nickname: string;
  avatarUrl?: string;
  avatarEmoji?: string;
  KVDataList: KVPair[];
  updatedAt: number;
}

function jsonResponse(data: unknown, status = 200, cors = true) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cors) {
    headers["Access-Control-Allow-Origin"] = "*";
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
  }
  return new Response(JSON.stringify(data), { status, headers });
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function getDeterministicEmoji(openid: string): string {
  return EMOJI_AVATARS[hashCode(openid) % EMOJI_AVATARS.length];
}

function sanitizeNickname(nickname: string): string {
  const stripped = nickname.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return stripped.slice(0, 20);
}

function isNumericString(value: string): boolean {
  return /^\d+$/.test(value);
}

function userKey(game: string, openid: string): string {
  return `games:${game}:users:${openid}`;
}

function rateLimitKey(game: string, openid: string): string {
  return `games:${game}:ratelimit:${openid}`;
}

async function getUser(kv: KVNamespace, game: string, openid: string): Promise<UserRecord | null> {
  const data = await kv.get(userKey(game, openid));
  if (!data) return null;
  try {
    return JSON.parse(data) as UserRecord;
  } catch {
    return null;
  }
}

async function putUser(kv: KVNamespace, game: string, user: UserRecord) {
  await kv.put(userKey(game, user.openid), JSON.stringify(user));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    const url = new URL(request.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    if (pathParts.length < 2) {
      return jsonResponse({ errMsg: "invalid path", errCode: -1 }, 404);
    }

    const [game, action] = pathParts;

    try {
      switch (action) {
        case "score": {
          if (request.method !== "POST") {
            return jsonResponse({ errMsg: "method not allowed", errCode: -1 }, 405);
          }

          const body = (await request.json()) as {
            openid: string;
            nickname: string;
            avatarUrl?: string;
            KVDataList: KVPair[];
          };

          if (!body.openid || !body.nickname || !Array.isArray(body.KVDataList)) {
            return jsonResponse(
              { errMsg: "setUserCloudStorage:fail invalid parameters", errCode: -1 },
              400
            );
          }

          // rate limit: 5 updates per minute
          const rlKey = rateLimitKey(game, body.openid);
          const rlValue = await env.LEADERBOARD_KV.get(rlKey);
          let rlCount = rlValue ? parseInt(rlValue, 10) : 0;
          if (isNaN(rlCount)) rlCount = 0;
          if (rlCount >= 5) {
            return jsonResponse(
              { errMsg: "setUserCloudStorage:fail rate limited", errCode: -1 },
              429
            );
          }
          await env.LEADERBOARD_KV.put(rlKey, String(rlCount + 1), { expirationTtl: 60 });

          // sanitize nickname
          const nickname = sanitizeNickname(body.nickname);

          // validate KVDataList values
          for (const item of body.KVDataList) {
            if (typeof item.value !== "string" || !isNumericString(item.value)) {
              return jsonResponse(
                { errMsg: "setUserCloudStorage:fail invalid score value", errCode: -1 },
                400
              );
            }
          }

          let user = await getUser(env.LEADERBOARD_KV, game, body.openid);

          if (user) {
            // high-score logic: only overwrite if numerically greater
            const mergedKV: KVPair[] = [];
            const existingMap = new Map(user.KVDataList.map((k) => [k.key, k.value]));
            for (const item of body.KVDataList) {
              const existing = existingMap.get(item.key);
              if (existing !== undefined) {
                const existingNum = parseInt(existing, 10);
                const incomingNum = parseInt(item.value, 10);
                if (!isNaN(existingNum) && !isNaN(incomingNum) && incomingNum > existingNum) {
                  mergedKV.push(item);
                } else {
                  mergedKV.push({ key: item.key, value: existing });
                }
              } else {
                mergedKV.push(item);
              }
            }
            // keep keys not in incoming
            for (const [key, value] of existingMap) {
              if (!body.KVDataList.find((i) => i.key === key)) {
                mergedKV.push({ key, value });
              }
            }
            user.nickname = nickname;
            if (body.avatarUrl !== undefined) user.avatarUrl = body.avatarUrl;
            user.KVDataList = mergedKV;
            user.updatedAt = Date.now();
          } else {
            const avatarUrl = body.avatarUrl?.trim() || undefined;
            const avatarEmoji = getDeterministicEmoji(body.openid);
            user = {
              openid: body.openid,
              nickname,
              avatarUrl,
              avatarEmoji,
              KVDataList: body.KVDataList.map((i) => ({ key: i.key, value: i.value })),
              updatedAt: Date.now(),
            };
          }

          await putUser(env.LEADERBOARD_KV, game, user);

          return jsonResponse({
            errMsg: "setUserCloudStorage:ok",
            data: {
              avatarUrl: user.avatarUrl,
              avatarEmoji: user.avatarEmoji,
              nickname: user.nickname,
            },
          });
        }

        case "ranking": {
          if (request.method !== "GET") {
            return jsonResponse({ errMsg: "method not allowed", errCode: -1 }, 405);
          }

          const openid = url.searchParams.get("openid");
          const keyListParam = url.searchParams.get("keyList") || "score";
          const keyList = keyListParam.split(",").map((k) => k.trim()).filter(Boolean);

          const prefix = `games:${game}:users:`;
          const list = await env.LEADERBOARD_KV.list({ prefix });
          const users: UserRecord[] = [];

          for (const key of list.keys) {
            const data = await env.LEADERBOARD_KV.get(key.name);
            if (!data) continue;
            try {
              users.push(JSON.parse(data) as UserRecord);
            } catch {
              // ignore malformed
            }
          }

          // sort by first requested key descending, fallback to 0
          const sortKey = keyList[0] || "score";
          users.sort((a, b) => {
            const aVal = parseInt(a.KVDataList.find((k) => k.key === sortKey)?.value || "0", 10);
            const bVal = parseInt(b.KVDataList.find((k) => k.key === sortKey)?.value || "0", 10);
            return bVal - aVal;
          });

          const data = users.map((u) => ({
            avatarUrl: u.avatarUrl,
            avatarEmoji: u.avatarEmoji,
            nickname: u.nickname,
            openid: u.openid,
            KVDataList: u.KVDataList.filter((k) => keyList.includes(k.key)),
          }));

          return jsonResponse({ data });
        }

        case "user": {
          if (request.method !== "GET") {
            return jsonResponse({ errMsg: "method not allowed", errCode: -1 }, 405);
          }

          const openid = url.searchParams.get("openid");
          if (!openid) {
            return jsonResponse({ errMsg: "missing openid", errCode: -1 }, 400);
          }

          const user = await getUser(env.LEADERBOARD_KV, game, openid);
          if (!user) {
            return jsonResponse({ KVDataList: [] });
          }

          return jsonResponse({ KVDataList: user.KVDataList });
        }

        case "avatar": {
          if (request.method !== "POST") {
            return jsonResponse({ errMsg: "method not allowed", errCode: -1 }, 405);
          }

          const body = (await request.json()) as {
            openid: string;
            emojiIndex?: number;
            avatarUrl?: string;
          };

          if (!body.openid) {
            return jsonResponse({ errMsg: "missing openid", errCode: -1 }, 400);
          }

          const user = await getUser(env.LEADERBOARD_KV, game, body.openid);
          if (!user) {
            return jsonResponse({ errMsg: "user not found", errCode: -1 }, 404);
          }

          if (body.avatarUrl !== undefined) {
            user.avatarUrl = body.avatarUrl.trim() || undefined;
          }

          if (body.emojiIndex !== undefined) {
            const idx = Math.max(0, Math.min(EMOJI_AVATARS.length - 1, Math.floor(body.emojiIndex)));
            user.avatarEmoji = EMOJI_AVATARS[idx];
          }

          user.updatedAt = Date.now();
          await putUser(env.LEADERBOARD_KV, game, user);

          return jsonResponse({
            errMsg: "ok",
            data: {
              avatarUrl: user.avatarUrl,
              avatarEmoji: user.avatarEmoji,
              nickname: user.nickname,
            },
          });
        }

        default:
          return jsonResponse({ errMsg: "not found", errCode: -1 }, 404);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      return jsonResponse({ errMsg: message, errCode: -1 }, 500);
    }
  },
};
