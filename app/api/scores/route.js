import { NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/auth";
import { addScore, getTopScores } from "../../../lib/data";

export async function GET() {
  const scores = await getTopScores();
  return NextResponse.json({ scores });
}

export async function POST(request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Login required to submit scores." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const score = await addScore({
      username: user.username,
      score: Number(body.score),
    });

    return NextResponse.json({ score, scores: await getTopScores() });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Could not save score." },
      { status: 400 }
    );
  }
}
