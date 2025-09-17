/**
 * Backlogの記法をMarkdownに変換する
 * @param src - 変換対象のBacklogテキスト
 * @returns Markdown形式のテキスト
 */
export function convertBacklogToMarkdown(src: string): string {
  if (!src) return "";
  // 改行コードを統一
  let convertedText = String(src).replace(/\r\n?/g, "\n");
  // コードブロック {code}...{/code} を保護
  const codeBlocks: string[] = [];
  convertedText = convertedText.replace(/\{code\}\n([\s\S]*?)\{\/code\}/gi, (_, inner) => {
    const blockId = codeBlocks.push(inner) - 1;
    return `\uE000CODE_BLOCK_${blockId}\uE001`;
  });
  // インラインコード {code}...{/code} を保護
  const inlineCodeBlocks: string[] = [];
  convertedText = convertedText.replace(/\{code\}([\s\S]*?)\{\/code\}/gi, (_, inner) => {
    const blockId = inlineCodeBlocks.push(inner) - 1;
    return `\uE000INLINE_CODE_BLOCK_${blockId}\uE001`;
  });
  // 引用ブロック {quote}...{/quote} を保護
  const quoteBlocks: string[] = [];
  const quoteRegex = /\{quote\}\s*([\s\S]*?)\s*\{\/quote\}/i; // 非貪欲 + 入れ子対応のため g を付けず while で
  while (quoteRegex.test(convertedText)) {
    convertedText = convertedText.replace(quoteRegex, (_m, inner: string) => {
      // 引用ブロック内をMarkdown記述に変換
      const beforeWrap = convertBlock(inner);
      const wrapped = beforeWrap
        .split("\n")
        .map((l) => (l.trim().length ? `> ${l}` : ">"))
        .join("\n");
      const id = quoteBlocks.push(wrapped) - 1;
      return `\uE000QUOTE_BLOCK_${id}\uE001`;
    });
  }
  // 残りの本文をMarkdown記述に変換
  convertedText = convertBlock(convertedText);
  // コードブロックを復元
  convertedText = convertedText.replace(/\uE000CODE_BLOCK_(\d+)\uE001/g, (_m, index) => {
    const codeBody = (codeBlocks[Number(index)] || "").replace(/^\n+|\n+$/g, "");
    return `\n\`\`\`\n${codeBody}\n\`\`\`\n`;
  });
  // インラインコードを復元
  convertedText = convertedText.replace(/\uE000INLINE_CODE_BLOCK_(\d+)\uE001/g, (_m, index) => {
    const codeBody = (inlineCodeBlocks[Number(index)] || "").trim();
    return `\`${codeBody}\``;
  });
  // 引用を復元
  convertedText = convertedText.replace(/\uE000QUOTE_BLOCK_(\d+)\uE001/g, (_m, index) => quoteBlocks[Number(index)]);
  // 返却
  return convertedText;
}

/**
 * ブロック単位の変換
 * @param src - 変換対象のテキストすべて
 * @returns Markdown形式のテーブルに変換されたテキスト
 */
function convertBlock(src: string): string {
  let convertedText = src;
  // テーブルの変換
  convertedText = convertTablesToMarkdown(convertedText);
  // 行単位の置換
  convertedText = convertedText.split("\n").map(convertSingleLine).join("\n");
  return convertedText;
}

/**
 * テーブルの変換
 * @param src - 変換対象のテキストすべて
 * @returns Markdown形式のテーブルに変換されたテキスト
 */
function convertTablesToMarkdown(src: string): string {
  const lines = String(src).split("\n");
  const out: string[] = [];
  let buf: string[] = [];
  const isTableLine = (line: string) => /^\s*\|/.test(line.trim());
  const flush = () => {
    if (buf.length === 0) return;
    // 1) 1テーブル塊を解析
    const rows = buf.map((raw) => {
      let line = raw.trim();
      let headerMarked = false;
      // 行末の |h / |H でヘッダー指定
      if (/\|h\s*$/i.test(line)) {
        headerMarked = true;
        line = line.replace(/\|h\s*$/i, "");
      }
      // 先頭・末尾の | を除去
      line = line.replace(/^\|/, "").replace(/\|$/, "");
      // セル分割
      const cells = line.split("|").map((c) => {
        let cell = c.trim();
        // セル先頭の ~ は削除（※ヘッダー指定には使わない）
        if (/^~+/.test(cell)) cell = cell.replace(/^~+/, "");
        // 必要最小限のエスケープ
        cell = cell.replace(/\|/g, "\\|");
        return cell;
      });
      return { cells, headerMarked };
    });
    // 2) 列数そろえ
    const cols = Math.max(1, ...rows.map((r) => r.cells.length));
    const pad = (arr: string[]) => {
      const a = arr.slice();
      while (a.length < cols) a.push("");
      return a;
    };
    // 3) ヘッダー決定：|h があればその行、なければ「空ヘッダー」
    const headerIdx = rows.findIndex((r) => r.headerMarked);
    const md: string[] = [];
    if (headerIdx === -1) {
      // 空ヘッダー
      const empty = Array(cols).fill("");
      md.push(`\n| ${empty.join(" | ")} |`); // テーブル表示されないケースがあるので改行を追加
      md.push(`| ${empty.map(() => "---").join(" | ")} |`);
      rows.forEach((r) => md.push(`| ${pad(r.cells).join(" | ")} |`));
    } else {
      // |h 行をヘッダーとして使用
      const header = pad(rows[headerIdx].cells);
      md.push(`\n| ${header.join(" | ")} |`); // テーブル表示されないケースがあるので改行を追加
      md.push(`| ${header.map(() => "---").join(" | ")} |`);
      rows.forEach((r, i) => {
        if (i === headerIdx) return;
        md.push(`| ${pad(r.cells).join(" | ")} |`);
      });
    }
    out.push(md.join("\n"));
    buf = [];
  };
  for (const line of lines) {
    if (isTableLine(line)) buf.push(line);
    else {
      flush();
      out.push(line);
    }
  }
  flush();
  return out.join("\n");
}

/**
 * 単一行のBacklog記法をMarkdownに変換
 * @param line - 変換対象の行
 * @returns 変換後の行
 */
function convertSingleLine(line: string): string {
  let convertedLine = line;
  // 目次 #contents => [toc]
  convertedLine = convertedLine.replace(/#contents/gi, "[toc]");
  // 改行 &br; => <br>
  convertedLine = convertedLine.replace(/&br;/gi, "<br>");
  // 画像 #image(), #thumbnail() => ![](URL) ※URLだとこっち
  convertedLine = convertedLine.replace(/#(?:image|thumbnail)\((https?:\/\/[^)]+)\)/gi, (_, url) => `![](${url})`);
  // 画像 #image(), #thumbnail() => ![][PATH] ※ファイル名だとこっち
  convertedLine = convertedLine.replace(/#(?:image|thumbnail)\(([^)]+)\)/gi, (_, path) => `![][${path}]`);
  // URL [[Label>URL]] / [[Label:URL]] => [$1]($2)
  convertedLine = convertedLine.replace(/\[\[([^\]>\:]+)[>:]([^\]]+)\]\]/g, "[$1]($2)");
  // 打ち消し %%...%% => ~~...~~
  convertedLine = convertedLine.replace(/%%([^%]+)%%/g, "~~$1~~");
  // 斜体/太字（順序注意：''' => *, 次に '' => **）
  convertedLine = convertedLine.replace(/'''([\s\S]*?)'''/g, "*$1*");
  convertedLine = convertedLine.replace(/''([\s\S]*?)''/g, "**$1**");
  // 見出し  * / ** / *** => # / ## / ###
  convertedLine = convertedLine.replace(/^(\*{1,6})\s+(.*)$/, (_, stars, rest) => {
    const headingLevel = Math.min(6, stars.length);
    return `${"#".repeat(headingLevel)} ${rest.trim()}`;
  });
  // 箇条書き（- の深さでインデント）
  const bulletMatch = convertedLine.match(/^(-+)\s+(.*)$/);
  if (bulletMatch) {
    const indentLevel = Math.max(1, bulletMatch[1].length);
    return `${"    ".repeat(indentLevel - 1)}- ${bulletMatch[2]}`;
  }
  // 箇条書き（数字）+ の深さでインデント、番号は 1. でOK
  const numberedMatch = convertedLine.match(/^(\++)\s+(.*)$/);
  if (numberedMatch) {
    const indentLevel = Math.max(1, numberedMatch[1].length);
    return `${"    ".repeat(indentLevel - 1)}1. ${numberedMatch[2]}`;
  }
  // 色マクロ（簡易：色指定は捨ててテキストのみ残す）
  //convertedLine = convertedLine.replace(/&color\(([^)]+)\)\s*\{\s*([^}]+)\s*\}/gi, "$2");
  return convertedLine;
}
