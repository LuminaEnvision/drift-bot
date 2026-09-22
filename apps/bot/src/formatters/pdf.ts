import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function promptToPdf(prompt: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Courier);
  const fontSize = 9;
  const lineHeight = 12;
  const margin = 48;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const maxWidth = pageWidth - margin * 2;
  const charWidth = font.widthOfTextAtSize("M", fontSize);
  const maxChars = Math.max(40, Math.floor(maxWidth / charWidth));

  const lines = wrapPrompt(toWinAnsi(prompt), maxChars);
  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  for (const line of lines) {
    if (y < margin + lineHeight) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    page.drawText(line.length > 0 ? line : " ", {
      x: margin,
      y,
      size: fontSize,
      font,
      color: rgb(0.1, 0.1, 0.12),
    });
    y -= lineHeight;
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

function toWinAnsi(text: string): string {
  return text.replace(/[^\t\n\r\x20-\x7E]/g, (ch) => {
    const map: Record<string, string> = {
      "\u2013": "-",
      "\u2014": "-",
      "\u2018": "'",
      "\u2019": "'",
      "\u201C": '"',
      "\u201D": '"',
      "\u2022": "-",
      "\u00A0": " ",
    };
    return map[ch] ?? "?";
  });
}

function wrapPrompt(text: string, maxChars: number): string[] {
  const out: string[] = [];
  for (const raw of text.replaceAll("\r\n", "\n").split("\n")) {
    const line = raw.replaceAll("\t", "  ");
    if (line.length <= maxChars) {
      out.push(line);
      continue;
    }
    let rest = line;
    while (rest.length > maxChars) {
      let cut = rest.lastIndexOf(" ", maxChars);
      if (cut < 20) {
        cut = maxChars;
      }
      out.push(rest.slice(0, cut));
      rest = rest.slice(cut).trimStart();
    }
    if (rest) {
      out.push(rest);
    }
  }
  return out;
}
