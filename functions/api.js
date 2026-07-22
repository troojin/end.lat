import { createClient } from "@supabase/supabase-js";

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

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
  const baseUrl = env.SITE_URL || "https://end.lat";

  for (let i = 0; i < 5; i++) {
    const id = makeId();

    const { error } = await supabase
      .from("links")
      .insert({ id, url })
      .select()
      .single();

    if (!error) {
      return Response.json({ short: `${baseUrl}/${id}`, id });
    }

    if (error.code !== "23505") {
      console.error(error);
      return Response.json({ error: "Could not create short link." }, { status: 500 });
    }
  }

  return Response.json({ error: "Could not generate a unique id. Try again." }, { status: 500 });
}
