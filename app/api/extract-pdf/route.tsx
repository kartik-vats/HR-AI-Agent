import { NextRequest, NextResponse } from "next/server";

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

export async function POST(req: NextRequest) {

  try {

    const formData = await req.formData();

    const file = formData.get("pdf") as File;

    if (!file) {

      return NextResponse.json(
        {
          success: false,
          error: "No PDF uploaded",
        },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();

    const uint8Array = new Uint8Array(bytes);

    const pdf = await pdfjsLib.getDocument({
      data: uint8Array,
    }).promise;

    let extractedText = "";

    for (let i = 1; i <= pdf.numPages; i++) {

      const page = await pdf.getPage(i);

      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");

      extractedText += pageText + "\n";
    }

    extractedText = extractedText
      .replace(/\s+/g, " ")
      .trim();

    console.log("Extracted Text:", extractedText);

    return NextResponse.json({
      success: true,
      text: extractedText,
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: "PDF extraction failed",
      },
      { status: 500 }
    );
  }
}