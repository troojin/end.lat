import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const BASE_URL = process.env.SITE_URL || "https://end.lat";
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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing 'url' query parameter." }, { status: 400 });
  }

  if (!isUrl(url)) {
    return NextResponse.json({ error: "That's not a valid http(s) URL." }, { status: 400 });
  }

  for (let i = 0; i < 5; i++) {
    const id = makeId();

    const { error } = await supabase
      .from("links")
      .insert({ id, url })
      .select()
      .single();

    if (!error) {
      return NextResponse.json({ short: `${BASE_URL}/${id}`, id });
    }

    if (error.code !== "23505") {
      console.error(error);
      return NextResponse.json({ error: "Could not create short link." }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Could not generate a unique id. Try again." }, { status: 500 });
}
