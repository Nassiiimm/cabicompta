import { NextRequest } from "next/server";
import { extractDocumentData } from "@/lib/ocr";
import { requireStaff } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await requireStaff();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await extractDocumentData(buffer, file.type, file.name);

    return Response.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    return Response.json(
      { error: "Failed to process document" },
      { status: 500 }
    );
  }
}
