const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const RESERVED = new Set(["api", "functions", "assets", "favicon.ico", "robots.txt", "sitemap.xml", "index.html", "404"]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

function makeId() {
  let id = "";
  for (let i = 0; i < 7; i++) {
    id += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return id;
}

function isUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function cleanKeyword(raw) {
  if (!raw) return "";
  let str = raw.trim();
  try {
    if (str.startsWith("http://") || str.startsWith("https://")) {
      const parsed = new URL(str);
      str = parsed.pathname;
    }
  } catch {}
  str = str.replace(/^https?:\/\/[^/]+/i, "");
  str = str.replace(/^end\.lat\/?/i, "");
  str = str.replace(/^\/+|\/+$/g, "");
  return str;
}

function isValidKeyword(kw) {
  return /^[a-zA-Z0-9_-]{1,64}$/.test(kw);
}

async function parseInput(request) {
  const urlObj = new URL(request.url);
  const params = Object.fromEntries(urlObj.searchParams.entries());

  if (request.method === "POST") {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        const body = await request.json();
        return { ...params, ...body };
      } catch {}
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      try {
        const form = await request.formData();
        const formObj = {};
        for (const [k, v] of form.entries()) {
          formObj[k] = v;
        }
        return { ...params, ...formObj };
      } catch {}
    }
  }

  return params;
}

async function handleApi(context) {
  const { request, env } = context;
  const baseUrl = env.SITE_URL || "https://end.lat";
  const input = await parseInput(request);

  const rawUrl = input.url ? input.url.trim() : "";
  const rawKeyword = input.keyword || input.custom || input.slug;
  const keyword = rawKeyword ? cleanKeyword(rawKeyword) : null;
  const shouldRedirect = input.redirect === "true" || input.redirect === "1" || input.format === "redirect";

  if (!rawUrl) {
    return jsonResponse({
      name: "end.lat API",
      description: "Fast, minimal URL shortener with custom keywords. No signup required.",
      endpoint: `${baseUrl}/api`,
      method: "GET or POST",
      parameters: {
        url: "Destination URL to shorten (required, e.g. https://mygame.com/room/party-123)",
        keyword: "Custom short slug (optional, e.g. cool-party)",
        redirect: "If 'true', immediately 302 redirects to the generated short link (optional)"
      },
      party_room_example: {
        description: "Generate a party or room link and share it with friends",
        request: `${baseUrl}/api?url=https://mygame.com/room/party-123&keyword=cool-party`,
        response: {
          short: `${baseUrl}/cool-party`,
          id: "cool-party",
          url: "https://mygame.com/room/party-123"
        }
      }
    }, 200);
  }

  if (!isUrl(rawUrl)) {
    return jsonResponse({ error: "That's not a valid http(s) URL." }, 400);
  }

  if (keyword) {
    if (!isValidKeyword(keyword)) {
      return jsonResponse({ error: "Keywords can only contain letters, numbers, hyphens, and underscores (1-64 chars)." }, 400);
    }

    if (RESERVED.has(keyword.toLowerCase())) {
      return jsonResponse({ error: "That keyword is reserved." }, 400);
    }

    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/links`, {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_KEY,
        Authorization: `Bearer ${env.SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ id: keyword, url: rawUrl }),
    });

    if (res.ok) {
      const short = `${baseUrl}/${keyword}`;
      if (shouldRedirect) {
        return Response.redirect(short, 302);
      }
      return jsonResponse({ short, id: keyword, url: rawUrl }, 201);
    }

    if (res.status === 409) {
      return jsonResponse({ error: "That keyword is already in use. Please choose another." }, 409);
    }

    console.error(await res.text());
    return jsonResponse({ error: "Could not create short link." }, 500);
  }

  for (let i = 0; i < 5; i++) {
    const id = makeId();

    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/links`, {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_KEY,
        Authorization: `Bearer ${env.SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ id, url: rawUrl }),
    });

    if (res.ok) {
      const short = `${baseUrl}/${id}`;
      if (shouldRedirect) {
        return Response.redirect(short, 302);
      }
      return jsonResponse({ short, id, url: rawUrl });
    }

    if (res.status !== 409) {
      console.error(await res.text());
      return jsonResponse({ error: "Could not create short link." }, 500);
    }
  }

  return jsonResponse({ error: "Could not generate a unique id. Try again." }, 500);
}

export async function onRequestGet(context) {
  return handleApi(context);
}

export async function onRequestPost(context) {
  return handleApi(context);
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
