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
  // 引用ブロック {quote}...{/quote} を > でラップ（入れ子も while で吸収）
  const quoteBlocks: string[] = [];
  const quoteRegex = /\{quote\}\n([\s\S]*?)\{\/quote\}/gi;
  while (quoteRegex.test(convertedText)) {
    convertedText = convertedText.replace(quoteRegex, (_, inner) => {
      const quoteBody = convertQuoteToMarkdown(inner);
      const blockId = quoteBlocks.push(quoteBody) - 1;
      return `\uE000QUOTE_BLOCK_${blockId}\uE001`;
    });
  }
  // 行単位の変換
  const convertedLines = convertedText.split("\n").map(convertSingleLine);
  convertedText = convertedLines.join("\n");
  // 保護したブロックを復元
  convertedText = convertedText.replace(/\uE000CODE_BLOCK_(\d+)\uE001/g, (_, index) => {
    const codeBody = (codeBlocks[Number(index)] || "").replace(/^\n+|\n+$/g, "");
    return `\`\`\`\n${codeBody}\n\`\`\``;
  });
  convertedText = convertedText.replace(/\uE000INLINE_CODE_BLOCK_(\d+)\uE001/g, (_, index) => {
    const codeBody = (inlineCodeBlocks[Number(index)] || "").replace(/^\n+|\n+$/g, "");
    return `\`${codeBody}\``;
  });
  convertedText = convertedText.replace(/\uE000QUOTE_BLOCK_(\d+)\uE001/g, (_, index) => `${quoteBlocks[Number(index)]}\n`);
  return convertedText;
}

/**
 * quoteブロックをMarkdownの引用形式に変換
 * @param inner - quoteブロックの内容
 * @returns Markdown形式の引用
 */
function convertQuoteToMarkdown(inner: string): string {
  return String(inner)
    .trimEnd()
    .split("\n")
    .map((line) => `> ${line.trim()}`)
    .join("\n");
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
  // 画像 #image(), #thumbnail() => ![][URL] ※ ![](URL)では動かず
  convertedLine = convertedLine.replace(/#(?:image|thumbnail)\(([^)]+)\)/gi, (_, url) => `![][${url}]`);
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
    return `${"  ".repeat(indentLevel - 1)}- ${bulletMatch[2]}`;
  }
  // 箇条書き（数字）+ の深さでインデント、番号は 1. でOK
  const numberedMatch = convertedLine.match(/^(\++)\s+(.*)$/);
  if (numberedMatch) {
    const indentLevel = Math.max(1, numberedMatch[1].length);
    return `${"  ".repeat(indentLevel - 1)}1. ${numberedMatch[2]}`;
  }
  // 色マクロ（簡易：色指定は捨ててテキストのみ残す）
  //convertedLine = convertedLine.replace(/&color\(([^)]+)\)\s*\{\s*([^}]+)\s*\}/gi, "$2");
  return convertedLine;
}
