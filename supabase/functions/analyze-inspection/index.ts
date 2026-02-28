import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert CAT 320 Hydraulic Excavator daily inspection AI. You analyze inspector speech transcripts to map observations to a 38-item Safety & Maintenance form.

## FORM SCHEMA

### Zone 1 — From the Ground (16 items)
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

### Zone 2 — Engine Compartment (8 items)
2.1 Engine Oil Level & Condition
2.2 Engine Coolant Level
2.3 Hydraulic Oil Level & Condition
2.4 Air Filter Indicator
2.5 Belts & Hoses
2.6 Radiator & Cooler Fins
2.7 DEF Level
2.8 Battery & Cables

### Zone 3 — On the Machine Outside (5 items)
3.1 Steps & Handrails
3.2 Cab Exterior — Glass & Seals
3.3 Mirrors & Camera System
3.4 Cab Mounting & ROPS/FOPS
3.5 Fuel Cap & Fill Area

### Zone 4 — Inside the Cab (9 items)
4.1 Seat & Seatbelt
4.2 Controls — Joysticks & Pedals
4.3 Horn
4.4 Backup Alarm
4.5 Gauges & Warning Lights
4.6 HVAC System
4.7 Fire Extinguisher
4.8 Windshield Wipers & Washer
4.9 Monitor Display & Cat Grade System

## RATING RULES (CAT Inspect standard)
- PASS (Green): Functioning normally. Keywords: "good", "fine", "within spec", "no issues", "working", "operational", "clean", "secure", "intact", "charged".
- MONITOR (Yellow): Wear or minor issue, doesn't affect immediate safety. Keywords: "wearing", "minor", "seepage" (not dripping), "slightly low", "trending", "debris", "small scratch", "should top off", "needs cleaning", "approaching".
- FAIL (Red): Safety hazard or immediate action. Keywords: "broken", "not working", "out", "cracked", "leaking" (dripping), "damaged", "failed", "requires replacement", "won't", "inoperative".
- NORMAL (Gray): Routine factual confirmation. Keywords: "in place", "torqued", "secure" for baseline items.

## LANGUAGE RULES
- Understand jobsite slang: "she's sweating" = seepage = MONITOR. "Grinding" = mechanical issue.
- Context matters: "tracks look good, tension within spec" → 1.2 PASS. "Two teeth showing wear" → 1.7 MONITOR.
- Shorthand: "oil good" → 2.1 PASS. "coolant low" → 2.2 MONITOR. "light out" → 1.14 FAIL.
- One sentence can cover multiple items: "belts look good, no cracking" → 2.5 PASS.

## FAULT CODE CORRELATION
Cross-reference active fault codes with visual findings. If they match, include the fault code and add "sensor" to evidence.

## ACTIVE FAULT CODES
{faultCodes}

## RULES
- Only return items you can CONFIDENTLY identify from the transcript. Never fabricate.
- Always include "audio" in evidence since this comes from speech.
- Add "video" if inspector describes seeing something visually.
- Add "sensor" if correlating with a fault code.
- Write professional, concise comments (1-2 sentences) that a maintenance supervisor would understand.`;

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

    const systemPrompt = SYSTEM_PROMPT
      .replace("{faultCodes}", faultCodes || "None");

    const userMessage = previousItems && previousItems !== 'None'
      ? `Previously identified items (update if new info contradicts): ${previousItems}\n\nNew inspector transcript:\n"${transcript}"`
      : `Inspector transcript:\n"${transcript}"`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.05,
        tools: [
          {
            type: "function",
            function: {
              name: "submit_inspection_findings",
              description: "Submit the inspection form items identified from the inspector's transcript",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "Form item ID like 1.1, 2.3, 4.5" },
                        status: { type: "string", enum: ["pass", "monitor", "fail", "normal"] },
                        comment: { type: "string", description: "Professional 1-2 sentence finding" },
                        evidence: {
                          type: "array",
                          items: { type: "string", enum: ["audio", "video", "sensor"] },
                        },
                        faultCode: { type: "string", description: "Active fault code if correlated" },
                      },
                      required: ["id", "status", "comment", "evidence"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["items"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_inspection_findings" } },
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
    console.log("AI response:", JSON.stringify(data).slice(0, 500));

    // Extract from tool call response
    let items: any[] = [];
    const toolCalls = data.choices?.[0]?.message?.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      try {
        const args = JSON.parse(toolCalls[0].function.arguments);
        items = args.items || [];
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e);
      }
    } else {
      // Fallback: try parsing content directly
      const content = data.choices?.[0]?.message?.content || "[]";
      try {
        let jsonStr = content.trim();
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) jsonStr = jsonMatch[1].trim();
        const parsed = JSON.parse(jsonStr);
        items = Array.isArray(parsed) ? parsed : (parsed.items || []);
      } catch {
        console.error("Failed to parse content as JSON:", content);
      }
    }

    // Validate
    items = items.filter((item: any) =>
      item && item.id && item.status &&
      ['pass', 'monitor', 'fail', 'normal'].includes(item.status)
    );

    console.log(`Returning ${items.length} inspection items`);

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
