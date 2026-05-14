import { NextRequest, NextResponse } from "next/server";
import { pipeline } from "@xenova/transformers";

// Load embedding model
const extractor = await pipeline(
  "feature-extraction",
  "Xenova/all-MiniLM-L6-v2"
);

// Cosine similarity function
function cosineSimilarity(
  a: number[],
  b: number[]
) {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { jdJson, resumeJson } = body;

    // Convert skills arrays to text
    const jdSkills =
      jdJson.required_skills.join(" ");

    const resumeSkills =
      resumeJson.skills.join(" ");

    // Generate embeddings
    const jdEmbedding = await extractor(
      jdSkills,
      {
        pooling: "mean",
        normalize: true,
      }
    );

    const resumeEmbedding =
      await extractor(resumeSkills, {
        pooling: "mean",
        normalize: true,
      });

    // Calculate similarity
    const similarity = cosineSimilarity(
      Array.from(jdEmbedding.data),
      Array.from(resumeEmbedding.data)
    );

    // Convert to percentage
    const percentage = (
      similarity * 100
    ).toFixed(2);

    return NextResponse.json({
      similarity: percentage,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Something went wrong",
      },
      { status: 500 }
    );
  }
}