// app/api/chat/route.ts

import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";

export const runtime = "nodejs";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// =========================
// EMBEDDING MODEL (LangChain)
// =========================

const embeddings = new HuggingFaceTransformersEmbeddings({
  modelName: "Xenova/all-MiniLM-L6-v2",
});

// =========================
// TEXT SPLITTER
// =========================

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 300,
  chunkOverlap: 50,
  separators: ["\n\n", "\n", ".", " "],
});

// =========================
// RAG: Retrieve relevant chunks from resume for a given JD
// =========================

// =========================
// LIGHTWEIGHT RAG (No Vector Store)
// =========================

async function retrieveRelevantChunks(
  resumeText: string,
  jobDescription: string,
  topK: number = 3
): Promise<string> {

  // Step 1: Split resume into chunks
  const chunks = await splitter.splitText(resumeText);

  // Step 2: Embed JD
  const jdEmbedding = await embeddings.embedQuery(jobDescription);

  // Step 3: Embed all chunks
  const chunkEmbeddings = await embeddings.embedDocuments(chunks);

  // Step 4: Score chunks using cosine similarity
  const scoredChunks = chunks.map((chunk, i) => ({
    chunk,
    score: cosineSimilarity(jdEmbedding, chunkEmbeddings[i]),
  }));

  // Step 5: Take top-K most relevant chunks
  const topChunks = scoredChunks
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((item) => item.chunk);

  // Step 6: Merge into final context
  return topChunks.join("\n---\n");
}

// =========================
// COSINE SIMILARITY
// =========================

function cosineSimilarity(a: number[], b: number[]): number {
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

// =========================
// EVALUATE ONE CANDIDATE
// =========================

async function evaluateCandidate(
  candidateId: string,
  candidateName: string,
  relevantContext: string,
  jobDescription: string
): Promise<{
  id: string;
  name: string;
  overallScore: number;
  recommendation: string;
  summary: string;
  rubric: Record<string, { score: number; reason: string }>;
}> {

  const prompt = `
You are an expert AI HR evaluator.

You are given ONLY the most relevant excerpts from a candidate's resume (retrieved via semantic search against the job description). Use these excerpts to evaluate the candidate.

RUBRIC:
1. Skills Match (40%)
2. Experience Relevance (20%)
3. Education & Certifications (10%)
4. Projects / Portfolio (20%)
5. Communication Quality (10%)

SCORING GUIDELINES:

Skills Match:
- 9-10 = Matches nearly all required skills
- 7-8 = Matches most required skills
- 5-6 = Partial match
- Below 5 = Major missing skills

Experience Relevance:
- 9-10 = Directly relevant production experience
- 7-8 = Relevant internship/project experience
- 5-6 = Some transferable experience
- Below 5 = Mostly unrelated

Projects:
- High score only if projects closely align with JD requirements

IMPORTANT:
- Penalize candidates for missing required technologies
- Do NOT give inflated scores
- Different candidates should naturally receive different scores
- Be strict and realistic like a real recruiter

IMPORTANT:
- Return ONLY valid JSON, no markdown, no backticks, no explanations

FORMAT:
{
  "overallScore": 84,
  "recommendation": "Hire",
  "summary": "The candidate demonstrates strong alignment with the required skills and has relevant project experience. Their background in X makes them a strong fit for this role.",
  "rubric": {
    "skills": { "score": 9, "reason": "Proficient in all required tech stack" },
    "experience": { "score": 7, "reason": "3 years in similar domain" },
    "education": { "score": 8, "reason": "Relevant degree and certifications" },
    "projects": { "score": 9, "reason": "Portfolio directly matches job requirements" },
    "communication": { "score": 7, "reason": "Resume is well-structured and clear" }
  }
}

JOB DESCRIPTION:
${jobDescription}

RELEVANT RESUME EXCERPTS FOR CANDIDATE "${candidateName}":
${relevantContext}
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });

  const raw = completion.choices[0]?.message?.content || "{}";

  console.log(`[${candidateName}] RAW RESPONSE:`, raw);

  const cleaned = raw
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  let parsed;

try {
  parsed = JSON.parse(cleaned);
} catch (err) {
  console.error("JSON PARSE ERROR:", cleaned);

  parsed = {
    overallScore: 0,
    recommendation: "Reject",
    summary: "Failed to parse AI response.",
    rubric: {},
  };
}

  return {
    id: candidateId,
    name: candidateName,
    overallScore: parsed.overallScore,
    recommendation: parsed.recommendation,
    summary: parsed.summary,
    rubric: parsed.rubric,
  };
}

// =========================
// MAIN ROUTE HANDLER
// =========================
// =========================
// SLIGHT SCORE NORMALIZATION
// =========================

function normalizeScores(results: any[]) {

  const usedScores = new Set<number>();

  return results.map((candidate) => {

    let score = candidate.overallScore;

    // If same score already exists,
    // slightly adjust by 1-3 points
    while (usedScores.has(score)) {

      const adjustment = Math.floor(Math.random() * 3) + 1;

      // randomly + or -
      score += Math.random() > 0.5
        ? adjustment
        : -adjustment;

      // keep safe bounds
      score = Math.max(45, Math.min(99, score));
    }

    usedScores.add(score);

    return {
      ...candidate,
      overallScore: score,
    };
  });
}
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { jobDescription, candidates } = body;

    // =========================
    // VALIDATION
    // =========================

    if (!jobDescription || !candidates || !Array.isArray(candidates) || candidates.length === 0) {
      return NextResponse.json(
        { error: "jobDescription and a non-empty candidates array are required" },
        { status: 400 }
      );
    }

    // =========================
    // PROCESS EACH CANDIDATE WITH RAG
    // =========================

const results = [];

for (const candidate of candidates) {

  // Step A: Retrieve relevant chunks
  const relevantContext = await retrieveRelevantChunks(
    candidate.text,
    jobDescription,
    3 // smaller topK
  );

  console.log(`[${candidate.name}] Relevant chunks:\n`, relevantContext);

  // Step B: Evaluate candidate
  const evaluation = await evaluateCandidate(
    candidate.id,
    candidate.name,
    relevantContext,
    jobDescription
  );

  results.push(evaluation);

  // Small delay to avoid TPM spikes
  await new Promise((resolve) => setTimeout(resolve, 1200));
}

    // =========================
    // RANK BY OVERALL SCORE
    // =========================

    const normalizedResults = normalizeScores(results);

const rankedCandidates = normalizedResults.sort(
  (a, b) => b.overallScore - a.overallScore
);
    // =========================
    // FINAL RESPONSE
    // =========================

    return NextResponse.json({ rankedCandidates });

  } catch (error) {
    console.error("FULL ERROR:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}