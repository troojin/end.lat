import { createClient } from "@supabase/supabase-js";

export async function onRequestGet(context) {
  const { params, env } = context;
  const id = params.id;

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

  const { data, error } = await supabase
    .from("links")
    .select("url")
    .eq("id", id)
    .single();

  if (!error && data?.url) {
    return Response.redirect(data.url, 302);
  }

  return new Response(notFoundPage(), {
    status: 404,
    headers: { "content-type": "text/html" },
  });
}

function notFoundPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Link Not Found</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #000;
    color: #F5F5F5;
    font-family: 'Inter', -apple-system, sans-serif;
    padding: 24px;
  }
  .card {
    text-align: center;
    background: #111111;
    padding: 40px 32px;
    border-radius: 14px;
    border: 1px solid #262626;
    max-width: 380px;
  }
  h1 { margin: 0 0 4px; font-size: 22px; font-weight: 700; }
  h2 { margin: 0 0 10px; font-size: 16px; font-weight: 600; }
  p { margin: 0 0 20px; font-size: 13.5px; color: #8A8A8A; }
  a {
    display: inline-block;
    color: #000;
    background: #FFFFFF;
    padding: 10px 18px;
    border-radius: 9px;
    font-size: 13.5px;
    font-weight: 600;
    text-decoration: none;
  }
</style>
</head>
<body>
  <div class="card">
    <h1>404</h1>
    <h2>Link not found</h2>
    <p>This short link doesn't exist or has expired.</p>
    <a href="/">Go home</a>
  </div>
</body>
</html>`;
}
