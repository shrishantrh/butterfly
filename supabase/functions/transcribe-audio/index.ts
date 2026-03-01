import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      throw new Error("No audio file provided");
    }

    console.log(`Transcribing file: ${audioFile.name}, size: ${audioFile.size}, type: ${audioFile.type}`);

    // Size limit check: 20MB max for base64 approach
    const MAX_SIZE = 20 * 1024 * 1024;
    if (audioFile.size > MAX_SIZE) {
      console.log("File too large for full transcription, will return empty transcript for frame-only analysis");
      return new Response(JSON.stringify({ text: "", warning: "File too large for transcription" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert file to base64
    const arrayBuffer = await audioFile.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    // Use chunked base64 encoding to avoid stack overflow on large files
    let base64 = "";
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      base64 += btoa(String.fromCharCode(...chunk));
    }

    const mimeType = audioFile.type || "video/mp4";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Transcribe ALL spoken words from this audio/video file. Output ONLY the raw transcription text, nothing else. No labels, no timestamps, no formatting. If there is no speech, output an empty string.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 8192,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("AI transcription error:", response.status, text);
      throw new Error(`Transcription failed: ${response.status}`);
    }

    const result = await response.json();
    const transcribedText = result.choices?.[0]?.message?.content?.trim() || "";
    console.log(`Transcription complete: ${transcribedText.length} chars`);

    return new Response(JSON.stringify({ text: transcribedText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("transcribe-audio error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
