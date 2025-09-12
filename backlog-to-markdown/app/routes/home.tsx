import type { Route } from "./+types/home";
import { useFetcher } from "react-router";
import { TypographyH3 } from "~/components/typography/h3";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
import { convertBacklogToMarkdown } from "~/utils/convert-backlog-to-markdown";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Backlog To Markdown" }, { name: "description", content: "Backlog記述をMarkdownに変換する" }];
}

export function loader({ context }: Route.LoaderArgs) {
  return { message: context.cloudflare.env.VALUE_FROM_CLOUDFLARE };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const backlogInput = formData.get("backlog-input");
  const markdown = convertBacklogToMarkdown(String(backlogInput));
  return { message: "success", markdown };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher();
  const isIdle = fetcher.state === "idle";
  const markdownOutput = fetcher.data?.markdown;
  return (
    <main className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <fetcher.Form method="post" className="space-y-4">
        <TypographyH3>Backlog</TypographyH3>
        <Button type="submit">{isIdle ? "変換する" : "変換中…"}</Button>
        <Textarea name="backlog-input" />
      </fetcher.Form>
      <div className="space-y-4">
        <TypographyH3>Markdown</TypographyH3>
        <Button
          type="button"
          disabled={!markdownOutput}
          onClick={() => {
            try {
              navigator.clipboard.writeText(markdownOutput);
              toast.success("コピーしました");
            } catch (error) {
              toast.error("コピーに失敗しました");
            }
          }}
        >
          コピー
        </Button>
        <Textarea name="markdown-output" value={markdownOutput} disabled />
      </div>
    </main>
  );
}
