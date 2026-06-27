import { generateResponse } from "@/services/ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    console.log("Received request");
    if (!messages || !Array.isArray(messages)) throw new Error("Invalid messages format");

    const response = await generateResponse(messages);
    return new Response(response, {
      headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
    });
  } catch (error: unknown) {
    console.error(error);
if (error instanceof Error && error.message === "Invalid messages format") {
      return NextResponse.json(
        {
          error: "Invalid messages format",
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        error: "Failed",
      },
      { status: 500 },
    );
  }
}
