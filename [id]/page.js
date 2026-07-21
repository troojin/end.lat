import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function Page({ params }) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("links")
    .select("url")
    .eq("id", id)
    .single();

  if (!error && data?.url) {
    redirect(data.url);
  }

  return (
    <div
      style={{
        background: "#000",
        color: "#F5F5F5",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "'Inter', -apple-system, sans-serif",
        padding: "24px",
      }}
    >
      <div
        style={{
          textAlign: "center",
          background: "#111111",
          padding: "40px 32px",
          borderRadius: "14px",
          border: "1px solid #262626",
          maxWidth: "380px",
        }}
      >
        <h1 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 700 }}>
          404
        </h1>
        <h2 style={{ margin: "0 0 10px", fontSize: "16px", fontWeight: 600 }}>
          Link not found
        </h2>
        <p style={{ margin: "0 0 20px", fontSize: "13.5px", color: "#8A8A8A" }}>
          This short link doesn&apos;t exist or has expired.
        </p>
        <a
          href="/"
          style={{
            display: "inline-block",
            color: "#000",
            background: "#FFFFFF",
            padding: "10px 18px",
            borderRadius: "9px",
            fontSize: "13.5px",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Go home
        </a>
      </div>
    </div>
  );
}
