import { NextResponse } from "next/server";
import { createUser, createSessionToken } from "../../../../lib/auth";

export async function POST(request) {
  try {
    const body = await request.json();
    const user = await createUser(body);
    const response = NextResponse.json({
      user: { username: user.username, createdAt: user.createdAt },
    });

    response.cookies.set("pulseplay_session", createSessionToken(user.username), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to register user." },
      { status: 400 }
    );
  }
}
