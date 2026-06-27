import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedInvoiceData } from "@/types";
import { getSpec } from "@/lib/analysis/specs";
import { extractJson } from "@/lib/analysis/json";
import type { AnalysisKey, AnalysisResult, GenericResult } from "@/lib/analysis/types";

const anthropic = new Anthropic();

const MODEL = "claude-sonnet-4-6";
type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

/** Construit le bloc de contenu (document PDF ou image) pour un fichier. */
function fileBlock(fileBuffer: Buffer, mimeType: string) {
  const base64 = fileBuffer.toString("base64");
  if (mimeType === "application/pdf") {
    return { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 } };
  }
  return { type: "image" as const, source: { type: "base64" as const, media_type: mimeType as ImageMediaType, data: base64 } };
}

/**
 * Analyse un ou plusieurs documents avec une spec d'analyse (les 9 analyseurs fiscaux).
 * Canal web payant : utilise l'API Anthropic. Renvoie le résultat normalisé (+ `tronque`).
 */
export async function analyzeDocument(
  files: { buffer: Buffer; mimeType: string }[],
  specKey: AnalysisKey
): Promise<AnalysisResult> {
  const spec = getSpec(specKey);
  if (!spec) throw new Error(`Spec d'analyse inconnue: ${specKey}`);

  const content: Anthropic.MessageCreateParams["messages"][0]["content"] = [
    ...files.map((f) => fileBlock(f.buffer, f.mimeType)),
    { type: "text", text: spec.instruction },
  ];

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: spec.large ? 16000 : 4000,
    system: spec.systemPrompt,
    messages: [{ role: "user", content }],
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  const tronque = response.stop_reason === "max_tokens";
  const result = spec.normalize(extractJson(text)) as AnalysisResult;
  if (tronque && result && typeof result === "object") (result as { tronque?: boolean }).tronque = true;
  return result;
}

/**
 * Classification automatique d'un document (catégorie + extraction libre).
 * Conserve la signature historique pour /api/ocr et upload-dialog.
 */
export async function extractDocumentData(
  fileBuffer: Buffer,
  mimeType: string,
  _fileName: string
): Promise<{ category: string; data: ExtractedInvoiceData | Record<string, unknown> }> {
  try {
    const result = (await analyzeDocument([{ buffer: fileBuffer, mimeType }], "GENERIC")) as GenericResult;
    return { category: result.category, data: result.data };
  } catch {
    return { category: "OTHER", data: {} };
  }
}
