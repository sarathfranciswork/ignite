import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/lib/auth";
import { verifyCode } from "@/server/services/totp.service";
import { logger } from "@/server/lib/logger";

const verifyInput = z.object({
  code: z.string().min(1, "Code is required"),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = verifyInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  try {
    const result = await verifyCode({
      userId: session.user.id,
      code: parsed.data.code,
    });

    if (!result.valid) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    logger.info({ userId: session.user.id }, "2FA verification successful");

    // Return success — client will update the session
    return NextResponse.json({
      success: true,
      method: result.method,
    });
  } catch (error) {
    logger.error({ err: error }, "2FA verification error");
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
