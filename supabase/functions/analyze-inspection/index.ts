import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const INSPECTION_SCHEMA = `You are an expert CAT 320 Hydraulic Excavator inspection AI. You analyze real inspector speech transcripts to fill a Safety & Maintenance Daily inspection form.

## FORM SCHEMA (38 items across 4 zones)

### 1. From the Ground (16 items)
1.1 Machine Parked Level & Chocked
1.2 Undercarriage — Track Condition & Tension
1.3 Undercarriage — Rollers, Idlers & Sprockets
1.4 Track Frames & Guards
1.5 Boom — Structural & Welds
1.6 Stick — Structural & Welds
1.7 Bucket — Teeth, Cutting Edge & Structural
1.8 Hydraulic Cylinders — Boom
1.9 Hydraulic Cylinders — Stick
1.10 Hydraulic Cylinders — Bucket
1.11 Hydraulic Hoses & Fittings
1.12 Swing Bearing & Drive
1.13 Counterweight & Mounting
1.14 External Lights & Reflectors
1.15 Decals, Placards & Safety Labels
1.16 Ground-Level Fluid Leaks

### 2. Engine Compartment (8 items)
2.1 Engine Oil Level & Condition
2.2 Engine Coolant Level
2.3 Hydraulic Oil Level & Condition
2.4 Air Filter Indicator
2.5 Belts & Hoses
2.6 Radiator & Cooler Fins
2.7 DEF Level
2.8 Battery & Cables

### 3. On the Machine — Outside Cab (5 items)
3.1 Steps & Handrails
3.2 Cab Exterior — Glass & Seals
3.3 Mirrors & Camera System
3.4 Cab Mounting & ROPS/FOPS
3.5 Fuel Cap & Fill Area

### 4. Inside the Cab (9 items)
4.1 Seat & Seatbelt
4.2 Controls — Joysticks & Pedals
4.3 Horn
4.4 Backup Alarm
4.5 Gauges & Warning Lights
4.6 HVAC System
4.7 Fire Extinguisher
4.8 Windshield Wipers & Washer
4.9 Monitor Display & Cat Grade System

## RATING RULES
- **PASS** (Green): Component functioning normally. Inspector says "good", "fine", "looks good", "within spec", "no issues", "clean", "secure", "intact", "working", "operational".
- **MONITOR** (Yellow): Shows wear or minor issues, doesn't affect immediate safety. Inspector says "wearing", "minor", "seepage", "slightly low", "trending", "debris", "small scratch", "should top off", "needs cleaning".
- **FAIL** (Red): Safety hazard or immediate action needed. Inspector says "broken", "not working", "out", "cracked", "leaking", "damaged", "failed", "requires replacement".
- **NORMAL** (Gray): Routine factual observation. Inspector says "secure", "torqued", "in place" for items that are just confirming baseline state.

## LANGUAGE UNDERSTANDING
- Understand jobsite slang: "she's sweating" = seepage = MONITOR. "Grinding noise" = mechanical issue = FAIL or MONITOR depending on severity.
- Understand context: "tracks look good, tension within spec" → 1.2 PASS. "Two teeth showing wear" → 1.7 MONITOR.
- Understand shorthand: "oil good" → 2.1 PASS. "coolant low" → 2.2 MONITOR. "light out" → 1.14 FAIL.
- Multiple items can be mentioned in one sentence: "belts look good, no cracking" → 2.5 PASS.
- If inspector mentions "inside the cab" or cab-related items, map to section 4.
- If inspector mentions "engine compartment", map to section 2.

## FAULT CODE CORRELATION
When active fault codes are provided, cross-reference them:
- If a visual finding matches a fault code, include the faultCode field and add "sensor" to evidence.
- Example: Hydraulic oil temp warning (168:0110-15) + "radiator debris" → 2.6 FAIL with faultCode and sensor evidence.

## ACTIVE FAULT CODES
{faultCodes}

## PREVIOUS UNRESOLVED ITEMS
{previousItems}

## OUTPUT FORMAT
Return ONLY a valid JSON array. No markdown, no explanation, no wrapping. Just the raw JSON array.
Each object: { "id": "1.1", "status": "pass"|"monitor"|"fail"|"normal", "comment": "Professional 1-2 sentence finding", "evidence": ["audio"], "faultCode": "optional" }

- Always include "audio" in evidence since this is from speech.
- Add "video" if the inspector describes seeing something visually.
- Add "sensor" if correlating with a fault code.
- Only return items you can confidently identify from the transcript. Never fabricate.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { transcript, faultCodes, previousItems } = await req.json();

    if (!transcript || transcript.trim().length === 0) {
      return new Response(JSON.stringify({ items: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = INSPECTION_SCHEMA
      .replace("{faultCodes}", faultCodes || "None")
      .replace("{previousItems}", previousItems || "None");

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
          { role: "user", content: `Inspector transcript:\n"${transcript}"` },
        ],
        temperature: 0.05,
        response_format: { type: "json_object" },
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
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    
    // Extract JSON from the response (handle markdown code blocks or wrapped objects)
    let jsonStr = content.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let items;
    try {
      const parsed = JSON.parse(jsonStr);
      // Handle both array and { items: [...] } formats
      items = Array.isArray(parsed) ? parsed : (parsed.items || parsed.results || []);
    } catch {
      console.error("Failed to parse AI response as JSON:", content);
      items = [];
    }

    // Validate each item has required fields
    items = items.filter((item: any) => 
      item && item.id && item.status && 
      ['pass', 'monitor', 'fail', 'normal'].includes(item.status)
    );

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
