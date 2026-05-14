import { NextRequest, NextResponse } from "next/server";

import mammoth from "mammoth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get("doc") as File;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "No DOCX uploaded",
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();

    const buffer = Buffer.from(arrayBuffer);

    const result = await mammoth.extractRawText({
      buffer,
    });

    return NextResponse.json({
      success: true,
      text: result.value,
    });

  } catch (error) {
    console.error("DOCX ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to extract DOCX text",
      },
      { status: 500 }
    );
  }
}