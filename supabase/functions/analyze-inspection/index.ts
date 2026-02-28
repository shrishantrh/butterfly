import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const INSPECTION_SCHEMA = `You are an expert heavy equipment inspection AI for CAT 320 Hydraulic Excavators. 
You analyze inspector speech transcripts (and optionally video frame descriptions) to fill out a standard Safety & Maintenance Daily inspection form.

The inspection form has these sections and items:
1. From the Ground: 1.1 Machine Parked Level & Chocked, 1.2 Undercarriage Track Condition & Tension, 1.3 Undercarriage Rollers Idlers & Sprockets, 1.4 Track Frames & Guards, 1.5 Boom Structural & Welds, 1.6 Stick Structural & Welds, 1.7 Bucket Teeth Cutting Edge & Structural, 1.8 Hydraulic Cylinders Boom, 1.9 Hydraulic Cylinders Stick, 1.10 Hydraulic Cylinders Bucket, 1.11 Hydraulic Hoses & Fittings, 1.12 Swing Bearing & Drive, 1.13 Counterweight & Mounting, 1.14 External Lights & Reflectors, 1.15 Decals Placards & Safety Labels, 1.16 Ground-Level Fluid Leaks
2. Engine Compartment: 2.1 Engine Oil Level & Condition, 2.2 Engine Coolant Level, 2.3 Hydraulic Oil Level & Condition, 2.4 Air Filter Indicator, 2.5 Belts & Hoses, 2.6 Radiator & Cooler Fins, 2.7 DEF Level, 2.8 Battery & Cables
3. On the Machine Outside Cab: 3.1 Steps & Handrails, 3.2 Cab Exterior Glass & Seals, 3.3 Mirrors & Camera System, 3.4 Cab Mounting & ROPS/FOPS, 3.5 Fuel Cap & Fill Area
4. Inside the Cab: 4.1 Seat & Seatbelt, 4.2 Controls Joysticks & Pedals, 4.3 Horn, 4.4 Backup Alarm, 4.5 Gauges & Warning Lights, 4.6 HVAC System, 4.7 Fire Extinguisher, 4.8 Windshield Wipers & Washer, 4.9 Monitor Display & Cat Grade System

For each item mentioned in the transcript, determine:
- status: "pass" | "monitor" | "fail" | "normal" 
- comment: A clear, professional description of the finding
- evidence: What type of evidence supports this (always include "audio", add "video" if visual observation is described, add "sensor" if fault code data is referenced)

Rules:
- Only return items you can confidently map from the transcript. Do not fabricate findings.
- If the inspector says something is "good", "fine", "looks good", "no issues" → PASS
- If something has wear, is trending, minor issues → MONITOR  
- If something is broken, not functioning, requires immediate action → FAIL
- If something is a routine factual observation (like "bolts torqued") → NORMAL
- Use natural language understanding. "She's sweating" about a seal = seepage = MONITOR.
- If active fault codes are provided, cross-reference them with visual findings.

ACTIVE FAULT CODES (if any):
{faultCodes}

PREVIOUS INSPECTION UNRESOLVED ITEMS (if any):
{previousItems}

Return ONLY valid JSON array of objects with shape:
{ "id": "1.1", "status": "pass"|"monitor"|"fail"|"normal", "comment": "...", "evidence": ["audio"|"video"|"sensor"], "faultCode": "optional fault code reference" }`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { transcript, faultCodes, previousItems, videoFrameDescription } = await req.json();

    if (!transcript || transcript.trim().length === 0) {
      return new Response(JSON.stringify({ items: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = INSPECTION_SCHEMA
      .replace("{faultCodes}", faultCodes || "None")
      .replace("{previousItems}", previousItems || "None");

    let userMessage = `Inspector transcript:\n"${transcript}"`;
    if (videoFrameDescription) {
      userMessage += `\n\nVideo observation: ${videoFrameDescription}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please wait a moment" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    
    // Extract JSON from the response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let items;
    try {
      items = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response as JSON:", content);
      items = [];
    }

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-inspection error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
