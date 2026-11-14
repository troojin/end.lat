const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const RESERVED = new Set(["api", "functions", "assets", "favicon.ico", "robots.txt", "sitemap.xml", "index.html", "404"]);

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

function cleanId(raw) {
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

  if (request.method === "POST" || request.method === "PATCH") {
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
  const action = (input.action || "").toLowerCase();

  if (action === "get" || action === "info") {
    const id = cleanId(input.id || input.keyword);
    if (!id) {
      return Response.json({ error: "Missing 'id' parameter." }, { status: 400 });
    }

    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/links?id=eq.${encodeURIComponent(id)}&select=id,url`,
      {
        headers: {
          apikey: env.SUPABASE_KEY,
          Authorization: `Bearer ${env.SUPABASE_KEY}`,
        },
      }
    );

    if (res.ok) {
      const rows = await res.json();
      if (rows.length > 0) {
        return Response.json({ id: rows[0].id, short: `${baseUrl}/${rows[0].id}`, url: rows[0].url });
      }
    }
    return Response.json({ error: "Link not found." }, { status: 404 });
  }

  if (action === "edit" || request.method === "PATCH") {
    const id = cleanId(input.id || input.keyword);
    const newUrl = input.url ? input.url.trim() : "";
    const rawNewKeyword = input.newKeyword || input.new_keyword || input.new_id;
    const newKeyword = rawNewKeyword ? cleanId(rawNewKeyword) : null;

    if (!id) {
      return Response.json({ error: "Missing current link keyword or id." }, { status: 400 });
    }

    if (!newUrl) {
      return Response.json({ error: "Missing destination 'url'." }, { status: 400 });
    }

    if (!isUrl(newUrl)) {
      return Response.json({ error: "That's not a valid http(s) URL." }, { status: 400 });
    }

    const updateBody = { url: newUrl };

    if (newKeyword && newKeyword !== id) {
      if (!isValidKeyword(newKeyword)) {
        return Response.json({ error: "New keyword must be 1-64 alphanumeric characters, dashes, or underscores." }, { status: 400 });
      }
      if (RESERVED.has(newKeyword.toLowerCase())) {
        return Response.json({ error: "That keyword is reserved." }, { status: 400 });
      }
      updateBody.id = newKeyword;
    }

    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/links?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: {
          apikey: env.SUPABASE_KEY,
          Authorization: `Bearer ${env.SUPABASE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(updateBody),
      }
    );

    if (res.status === 409) {
      return Response.json({ error: "The new keyword is already in use." }, { status: 409 });
    }

    if (!res.ok) {
      console.error(await res.text());
      return Response.json({ error: "Could not update short link." }, { status: 500 });
    }

    const updatedRows = await res.json();
    if (!updatedRows || updatedRows.length === 0) {
      return Response.json({ error: "Link not found." }, { status: 404 });
    }

    const finalId = updatedRows[0].id;
    return Response.json({
      success: true,
      id: finalId,
      short: `${baseUrl}/${finalId}`,
      url: updatedRows[0].url,
    });
  }

  const url = input.url ? input.url.trim() : "";
  const rawKeyword = input.keyword || input.custom || input.slug;
  const keyword = rawKeyword ? cleanId(rawKeyword) : null;

  if (!url) {
    return Response.json({ error: "Missing 'url' parameter." }, { status: 400 });
  }

  if (!isUrl(url)) {
    return Response.json({ error: "That's not a valid http(s) URL." }, { status: 400 });
  }

  if (keyword) {
    if (!isValidKeyword(keyword)) {
      return Response.json({ error: "Keywords can only contain letters, numbers, hyphens, and underscores (1-64 chars)." }, { status: 400 });
    }

    if (RESERVED.has(keyword.toLowerCase())) {
      return Response.json({ error: "That keyword is reserved." }, { status: 400 });
    }

    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/links`, {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_KEY,
        Authorization: `Bearer ${env.SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ id: keyword, url }),
    });

    if (res.ok) {
      return Response.json({ short: `${baseUrl}/${keyword}`, id: keyword, url }, { status: 201 });
    }

    if (res.status === 409) {
      return Response.json({ error: "That keyword is already in use. Please choose another." }, { status: 409 });
    }

    console.error(await res.text());
    return Response.json({ error: "Could not create short link." }, { status: 500 });
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
      body: JSON.stringify({ id, url }),
    });

    if (res.ok) {
      return Response.json({ short: `${baseUrl}/${id}`, id, url });
    }

    if (res.status !== 409) {
      console.error(await res.text());
      return Response.json({ error: "Could not create short link." }, { status: 500 });
    }
  }

  return Response.json({ error: "Could not generate a unique id. Try again." }, { status: 500 });
}

export async function onRequestGet(context) {
  return handleApi(context);
}

export async function onRequestPost(context) {
  return handleApi(context);
}

export async function onRequestPatch(context) {
  return handleApi(context);
}
