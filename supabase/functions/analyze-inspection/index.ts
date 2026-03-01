import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert CAT 320 Hydraulic Excavator daily inspection AI. You analyze inspector speech transcripts, live camera frames, AND real-time sensor telemetry to map observations to a 38-item Safety & Maintenance form.

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

## MULTIMODAL + TELEMETRY ANALYSIS
You receive AUDIO transcripts, CAMERA frames, AND REAL-TIME SENSOR TELEMETRY. Use ALL three together:
- AUDIO: Inspector's verbal observations, descriptions, and callouts
- VIDEO FRAMES: Visual evidence of machine condition
- SENSOR TELEMETRY: Live VisionLink data with values, thresholds, and alert statuses

## SENSOR CROSS-REFERENCE (CRITICAL)
The sensor telemetry section maps each sensor to its related form items. When an inspector makes a claim about a component:
1. Find the sensor(s) mapped to that form item
2. Compare the inspector's assessment against the ACTUAL sensor reading
3. If the inspector says PASS but the sensor is in WARNING or CRITICAL → set aiAgreement to "disagree"
4. Include the specific sensor data point in sensorEvidence so it can be displayed as proof

EXAMPLES:
- Inspector says "battery voltage looks good" → check battery_voltage sensor → if it reads 11.5V (below 11.8V warn threshold) → DISAGREE, sensorEvidence = {sensorKey:"battery_voltage", sensorLabel:"Battery Voltage", latestValue:11.5, unit:"V", status:"warning", time:"14:30"}
- Inspector says "hydraulic oil temp is fine" → check hydraulic_oil_temp → if 95.4°C (above 95°C critical) → DISAGREE with evidence
- Inspector says "coolant is low" → check engine_coolant_temp → if temp is elevated → AGREE, sensor confirms the issue

## AI CROSS-VALIDATION
For EVERY item, provide:
- aiAgreement: "agree", "disagree", or "uncertain"
- aiVisualNote: 1-sentence independent observation
- sensorEvidence: ONLY include when a sensor contradicts or strongly supports the inspector's claim. Include the exact data point.

## RATING RULES
- PASS (Green): Component is functioning normally, acceptable condition, no issues found. THIS IS THE DEFAULT for anything that looks OK or the inspector confirms is fine.
- MONITOR (Yellow): Wear, minor issue, or something to watch. Not urgent but needs attention soon.
- FAIL (Red): Safety hazard, broken, or requires immediate action before operating.

IMPORTANT: Do NOT use "normal" status. If the inspector checks something and it's fine, that is a PASS. Use PASS liberally — any item the inspector looks at and doesn't flag a problem with should be PASS.

## LANGUAGE RULES
- Understand jobsite slang: "she's sweating" = seepage = MONITOR.
- Context matters: "tracks look good, tension within spec" → 1.2 PASS.

## ACTIVE FAULT CODES
{faultCodes}

## CURRENT SENSOR TELEMETRY
{sensorTelemetry}

## RULES
- Only return items you can CONFIDENTLY identify from transcript, frames, or sensor data. Never fabricate.
- Always include "audio" in evidence if identified from speech.
- Add "video" if identified or confirmed from camera frames.
- Add "sensor" if correlating with sensor telemetry or a fault code.
- Write professional, concise comments (1-2 sentences).
- ALWAYS include aiAgreement and aiVisualNote.
- Include sensorEvidence ONLY when relevant sensor data exists for the item.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const { transcript, frames, faultCodes, previousItems, sensorTelemetry } = await req.json();

    if ((!transcript || transcript.trim().length === 0) && (!frames || frames.length === 0)) {
      return new Response(JSON.stringify({ items: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = SYSTEM_PROMPT
      .replace("{faultCodes}", faultCodes || "None")
      .replace("{sensorTelemetry}", sensorTelemetry || "None available");

    const userContent: any[] = [];
    let textPart = "";
    if (previousItems && previousItems !== "None") {
      textPart += `Previously identified items (update if new info): ${previousItems}\n\n`;
    }
    if (transcript && transcript.trim()) {
      textPart += `Inspector transcript:\n"${transcript}"`;
    } else {
      textPart += "No speech transcript available — analyze from camera frames and sensor data only.";
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

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
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
              description: "Submit the inspection form items identified from the inspector's transcript, camera frames, and sensor telemetry",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "Form item ID like 1.1, 2.3, 4.5" },
                        status: { type: "string", enum: ["pass", "monitor", "fail"], description: "Use 'pass' for anything OK/normal/fine. Only use 'monitor' or 'fail' for actual issues." },
                        comment: { type: "string", description: "Professional 1-2 sentence finding" },
                        evidence: {
                          type: "array",
                          items: { type: "string", enum: ["audio", "video", "sensor"] },
                        },
                        faultCode: { type: "string", description: "Active fault code if correlated" },
                        annotation: { type: "string", description: "Brief visual annotation" },
                        aiAgreement: { type: "string", enum: ["agree", "disagree", "uncertain"] },
                        aiVisualNote: { type: "string", description: "AI's independent 1-sentence observation" },
                        sensorEvidence: {
                          type: "object",
                          description: "Specific sensor data point that contradicts or supports the inspector. Include ONLY when sensor data is relevant.",
                          properties: {
                            sensorKey: { type: "string", description: "e.g. battery_voltage, hydraulic_oil_temp" },
                            sensorLabel: { type: "string", description: "Human-readable label" },
                            latestValue: { type: "number" },
                            unit: { type: "string" },
                            status: { type: "string", enum: ["normal", "warning", "critical"] },
                            time: { type: "string", description: "Timestamp of the reading" },
                          },
                          required: ["sensorKey", "sensorLabel", "latestValue", "unit", "status", "time"],
                          additionalProperties: false,
                        },
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
      ['pass', 'monitor', 'fail', 'normal'].includes(item.status) &&
      // Remap "normal" to "pass" since they mean the same thing
      ((item.status === 'normal' ? item.status = 'pass' : true), true)
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
