import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert CAT 320 Hydraulic Excavator daily inspection AI. You analyze inspector speech transcripts AND live camera frames to map observations to a 38-item Safety & Maintenance form.

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

## MULTIMODAL ANALYSIS
You receive BOTH audio transcripts and camera frames. Use them together:
- AUDIO: Inspector's verbal observations, descriptions, and callouts
- VIDEO FRAMES: Visual evidence of machine condition — look for leaks, damage, wear, fluid levels, lights, debris, cracks, missing parts
- Cross-reference what the inspector says with what you see in the frames
- If you see something concerning in a frame that the inspector didn't mention, flag it
- If the inspector describes an issue, look for visual confirmation in the frames

## AI CROSS-VALIDATION (CRITICAL)
For EVERY item you identify, you MUST provide:
- aiAgreement: whether your visual analysis AGREES with the inspector's verbal assessment
  - "agree" = your visual assessment matches the inspector's stated condition
  - "disagree" = you see evidence that contradicts the inspector (e.g., they say PASS but you see damage)
  - "uncertain" = insufficient visual evidence to confirm or deny
- aiVisualNote: a brief (1 sentence) independent visual observation describing what YOU see, regardless of what the inspector said
  - For PASS items: describe the visual confirmation (e.g., "Track pads appear intact with normal wear patterns")
  - For disagreements: describe what you see that differs (e.g., "Visible fluid residue at seal junction despite inspector marking PASS")
  - DO NOT override the inspector's rating — just note your observation

## RATING RULES (CAT Inspect standard)
- PASS (Green): Functioning normally. Keywords: "good", "fine", "within spec", "no issues".
- MONITOR (Yellow): Wear or minor issue, doesn't affect immediate safety. Keywords: "wearing", "minor", "seepage", "slightly low", "debris".
- FAIL (Red): Safety hazard or immediate action. Keywords: "broken", "not working", "cracked", "leaking", "damaged".
- NORMAL (Gray): Routine factual confirmation.

## LANGUAGE RULES
- Understand jobsite slang: "she's sweating" = seepage = MONITOR. "Grinding" = mechanical issue.
- Context matters: "tracks look good, tension within spec" → 1.2 PASS.
- One sentence can cover multiple items.

## FAULT CODE CORRELATION
Cross-reference active fault codes with visual findings.

## ACTIVE FAULT CODES
{faultCodes}

## RULES
- Only return items you can CONFIDENTLY identify from transcript or frames. Never fabricate.
- Always include "audio" in evidence if identified from speech.
- Add "video" if identified or confirmed from camera frames.
- Add "sensor" if correlating with a fault code.
- Write professional, concise comments (1-2 sentences).
- ALWAYS include aiAgreement and aiVisualNote for every item.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { transcript, frames, faultCodes, previousItems } = await req.json();

    if ((!transcript || transcript.trim().length === 0) && (!frames || frames.length === 0)) {
      return new Response(JSON.stringify({ items: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = SYSTEM_PROMPT.replace("{faultCodes}", faultCodes || "None");

    const userContent: any[] = [];
    let textPart = "";
    if (previousItems && previousItems !== "None") {
      textPart += `Previously identified items (update if new info): ${previousItems}\n\n`;
    }
    if (transcript && transcript.trim()) {
      textPart += `Inspector transcript:\n"${transcript}"`;
    } else {
      textPart += "No speech transcript available — analyze from camera frames only.";
    }
    userContent.push({ type: "text", text: textPart });

    if (frames && Array.isArray(frames) && frames.length > 0) {
      userContent.push({ type: "text", text: "\n\nCamera frames from the live inspection:" });
      for (const frame of frames.slice(0, 2)) {
        const base64Match = frame.match(/^data:image\/(\w+);base64,(.+)$/);
        if (base64Match) {
          userContent.push({
            type: "image_url",
            image_url: { url: frame },
          });
        }
      }
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
          { role: "user", content: userContent },
        ],
        temperature: 0.05,
        tools: [
          {
            type: "function",
            function: {
              name: "submit_inspection_findings",
              description: "Submit the inspection form items identified from the inspector's transcript and camera frames",
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
                        annotation: { type: "string", description: "Brief visual annotation describing what was seen in the frame" },
                        aiAgreement: { type: "string", enum: ["agree", "disagree", "uncertain"], description: "Whether AI visual analysis agrees with inspector's assessment" },
                        aiVisualNote: { type: "string", description: "AI's independent 1-sentence visual observation of component condition" },
                      },
                      required: ["id", "status", "comment", "evidence", "aiAgreement", "aiVisualNote"],
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
        return new Response(JSON.stringify({ error: "Rate limited, please wait" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data).slice(0, 500));

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
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
