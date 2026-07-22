const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

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

export async function onRequestGet(context) {
  const { request, env } = context;
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return Response.json({ error: "Missing 'url' query parameter." }, { status: 400 });
  }

  if (!isUrl(url)) {
    return Response.json({ error: "That's not a valid http(s) URL." }, { status: 400 });
  }

  const baseUrl = env.SITE_URL || "https://end.lat";

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
      return Response.json({ short: `${baseUrl}/${id}`, id });
    }

    if (res.status !== 409) {
      console.error(await res.text());
      return Response.json({ error: "Could not create short link." }, { status: 500 });
    }
  }

  return Response.json({ error: "Could not generate a unique id. Try again." }, { status: 500 });
}
