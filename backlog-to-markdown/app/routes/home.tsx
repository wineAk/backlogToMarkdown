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
  try {
    const formData = await request.formData();
    const backlogInput = formData.get("backlog-input");
    const markdown = convertBacklogToMarkdown(String(backlogInput));
    return { success: true, markdown };
  } catch (error) {
    return { success: false, error: error };
  }
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher();
  const isIdle = fetcher.state === "idle";
  const markdownOutput = fetcher.data?.markdown;
  return (
    <main className="h-dvh p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <fetcher.Form method="post" className="flex flex-col gap-4">
        <section className="flex justify-between sm:justify-start items-center gap-2">
          <TypographyH3>Backlog</TypographyH3>
          <Button type="submit">{isIdle ? "変換する" : "変換中…"}</Button>
        </section>
        <Textarea name="backlog-input" className="h-full resize-none field-sizing-fixed" />
      </fetcher.Form>
      <div className="flex flex-col gap-4">
        <section className="flex justify-between sm:justify-start items-center gap-2">
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
        </section>
        <Textarea name="markdown-output" value={markdownOutput} disabled className="h-full resize-none field-sizing-fixed" />
      </div>
    </main>
  );
}
