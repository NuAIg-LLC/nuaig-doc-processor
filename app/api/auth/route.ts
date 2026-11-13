import { NextResponse } from "next/server";

import {
  COOKIE_OPTIONS,
  SESSION_COOKIE,
  authConfigured,
  issueToken,
  verifyCredentials,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!authConfigured()) {
    return NextResponse.json(
      {
        error:
          "Sign-in is not configured on this deployment. Set APP_USERNAME and APP_PASSWORD in the environment.",
      },
      { status: 503 },
    );
  }

  let username = "";
  let password = "";
  try {
    const body = await request.json();
    username = String(body.username ?? "");
    password = String(body.password ?? "");
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  if (!(await verifyCredentials(username, password))) {
    // Deliberately vague: do not reveal which field was wrong.
    return NextResponse.json({ error: "Those credentials were not accepted." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await issueToken(), COOKIE_OPTIONS);
  return response;
}

/** Sign out. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 });
  return response;
}
