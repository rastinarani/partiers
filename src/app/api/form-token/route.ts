import { validatePublicFormKind } from "@/lib/validation";
import { createPublicFormToken } from "@/lib/publicFormProtection";

export async function GET(request: Request) {
  const kind = validatePublicFormKind(new URL(request.url).searchParams.get("form"));
  if (!kind)
    return Response.json({ error: "Invalid request." }, { status: 400 });
  try {
    return Response.json({ token: createPublicFormToken(kind) }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json({ error: "We couldn’t load the form. Please try again." }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
}
