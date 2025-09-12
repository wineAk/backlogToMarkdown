export async function loader() {
  return new Response(JSON.stringify({ success: false, error: "Not Found." }), {
    headers: { "Content-Type": "application/json" },
  });
}
