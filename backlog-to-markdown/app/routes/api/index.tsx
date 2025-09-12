import type { Route } from "./+types/index";
import { convertBacklogToMarkdown } from "~/utils/convert-backlog-to-markdown";

export async function loader() {
  return new Response(JSON.stringify({ success: false, error: "Method Not Allowed." }), {
    headers: { "Content-Type": "application/json" },
  });
}

type Payload = {
  body?: string;
};

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method Not Allowed." }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }
  const payload = (await request.json()) as Payload;
  const backlogInput = payload.body;
  if (!backlogInput) {
    return new Response(JSON.stringify({ success: false, error: "Body is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const markdown = convertBacklogToMarkdown(String(backlogInput));
  return new Response(JSON.stringify({ success: true, markdown }), {
    headers: { "Content-Type": "application/json" },
  });
}
