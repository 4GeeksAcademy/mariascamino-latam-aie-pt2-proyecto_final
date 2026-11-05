// Health check used by Docker / the VPS to confirm the website is up.
export function GET() {
  return Response.json({ status: "ok", service: "website" });
}
