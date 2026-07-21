import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

export default async function Page({ params }) {

    const { data } = await supabase
        .from("links")
        .select("url")
        .eq("id", params.id)
        .single();

    if (data?.url) {
        redirect(data.url);
    }

    return (
        <html>
            <body style={{
                background: "#000",
                color: "white",
                height: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontFamily: "Arial"
            }}>
                <div style={{
                    textAlign: "center",
                    background: "#111",
                    padding: "40px",
                    borderRadius: "15px",
                    border: "1px solid #222"
                }}>
                    <h1>404</h1>
                    <h2>Link Not Found</h2>
                    <p>
                        This short link doesn't exist or has expired.
                    </p>

                    <a href="/" style={{
                        color: "white"
                    }}>
                        Go Home
                    </a>
                </div>
            </body>
        </html>
    );
}
