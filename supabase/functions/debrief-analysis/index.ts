import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert CAT heavy equipment maintenance analyst. You receive a completed inspection report for a CAT 320 Hydraulic Excavator and must produce a comprehensive post-inspection debrief.

## YOUR ANALYSIS MUST INCLUDE:

### 1. Executive Summary
A 2-3 sentence overall machine health assessment. Include a health score (0-100) and operational readiness status (READY, CAUTION, DOWN).

### 2. Root Cause Analysis
For every FAIL and MONITOR item, determine the likely root cause. Cross-reference fault codes with physical findings. Identify cascading failures (e.g., clogged radiator → high hydraulic temp → accelerated seal wear).

### 3. Action Items (Work Orders)
Generate prioritized work orders with:
- Priority: CRITICAL (safety/immediate), HIGH (within 24h), MEDIUM (within 1 week), LOW (next scheduled maintenance)
- Estimated labor hours
- Whether the machine can operate pending repair
- Specific repair procedure summary

### 4. Predictive Insights
Based on the inspection data, fault code history, and SMU hours:
- Predict which MONITOR items are likely to become FAIL within the next 250 hours
- Identify components approaching end-of-life based on wear patterns
- Flag any unusual correlations between findings

### 5. Parts Recommendations
For each FAIL and MONITOR item, suggest the specific CAT part category and search terms that would help find the right replacement parts. Include:
- Component name
- Likely part type (seal kit, filter, bulb, teeth, etc.)
- Search keywords for parts.cat.com
- Urgency (immediate, soon, scheduled)

### 6. Inspector Coaching
Brief feedback on inspection quality:
- Coverage completeness
- Evidence quality (video/audio/sensor mix)
- Any zones that seem rushed or under-documented

## MACHINE CONTEXT
Model: CAT 320 Hydraulic Excavator
This is a standard daily walkaround inspection per CAT Inspect protocol.

## OUTPUT FORMAT
Use the submit_debrief_analysis tool to return structured data.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { sections, machine, transcript, elapsed } = await req.json();

    if (!sections || !Array.isArray(sections)) {
      return new Response(JSON.stringify({ error: "No inspection data provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build inspection summary for the AI
    const inspectionText = sections.map((s: any) => {
      const items = s.items.map((i: any) =>
        `  ${i.id} ${i.label}: ${i.status.toUpperCase()}${i.comment ? ` — ${i.comment}` : ''}${i.faultCode ? ` [Fault: ${i.faultCode}]` : ''}${i.evidence?.length ? ` (Evidence: ${i.evidence.join(', ')})` : ''}`
      ).join('\n');
      return `${s.title}\n${items}`;
    }).join('\n\n');

    const machineContext = machine ? `
Asset: ${machine.assetId} | Serial: ${machine.serial} | Model: ${machine.model}
SMU Hours: ${machine.smuHours} | Fuel: ${machine.fuelLevel}%
Location: ${machine.location}
Active Fault Codes: ${machine.activeFaultCodes?.map((fc: any) => `${fc.code}: ${fc.description} (${fc.severity})`).join('; ') || 'None'}
Last Inspection: ${machine.lastInspection ? `${machine.lastInspection.date} by ${machine.lastInspection.inspector} — P:${machine.lastInspection.summary.pass} M:${machine.lastInspection.summary.monitor} F:${machine.lastInspection.summary.fail}` : 'N/A'}
` : '';

    const userPrompt = `## COMPLETED INSPECTION REPORT
${machineContext}
Inspection Duration: ${elapsed ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s` : 'Unknown'}
${transcript ? `\nInspector Transcript (partial):\n"${transcript.slice(0, 2000)}"` : ''}

## INSPECTION FINDINGS
${inspectionText}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        tools: [
          {
            type: "function",
            function: {
              name: "submit_debrief_analysis",
              description: "Submit the comprehensive post-inspection debrief analysis",
              parameters: {
                type: "object",
                properties: {
                  executiveSummary: {
                    type: "object",
                    properties: {
                      healthScore: { type: "number", description: "0-100 machine health score" },
                      status: { type: "string", enum: ["READY", "CAUTION", "DOWN"] },
                      summary: { type: "string", description: "2-3 sentence assessment" },
                    },
                    required: ["healthScore", "status", "summary"],
                    additionalProperties: false,
                  },
                  rootCauseAnalysis: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        itemId: { type: "string" },
                        itemLabel: { type: "string" },
                        status: { type: "string" },
                        rootCause: { type: "string" },
                        cascadeRisk: { type: "string", description: "What this could lead to if unaddressed" },
                        relatedItems: { type: "array", items: { type: "string" }, description: "IDs of related inspection items" },
                      },
                      required: ["itemId", "itemLabel", "status", "rootCause"],
                      additionalProperties: false,
                    },
                  },
                  workOrders: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        itemId: { type: "string" },
                        title: { type: "string" },
                        priority: { type: "string", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
                        description: { type: "string" },
                        estimatedHours: { type: "number" },
                        canOperate: { type: "boolean", description: "Can machine operate pending this repair?" },
                        procedure: { type: "string", description: "Brief repair procedure" },
                      },
                      required: ["itemId", "title", "priority", "description", "estimatedHours", "canOperate"],
                      additionalProperties: false,
                    },
                  },
                  predictiveInsights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        itemId: { type: "string" },
                        itemLabel: { type: "string" },
                        prediction: { type: "string" },
                        confidence: { type: "string", enum: ["high", "medium", "low"] },
                        estimatedHoursToFailure: { type: "number", description: "Estimated SMU hours until failure" },
                        recommendation: { type: "string" },
                      },
                      required: ["itemId", "itemLabel", "prediction", "confidence", "recommendation"],
                      additionalProperties: false,
                    },
                  },
                  partsRecommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        itemId: { type: "string" },
                        itemLabel: { type: "string" },
                        partType: { type: "string", description: "e.g. seal kit, filter, bulb, teeth" },
                        searchKeywords: { type: "string", description: "Search terms for parts.cat.com" },
                        urgency: { type: "string", enum: ["immediate", "soon", "scheduled"] },
                      },
                      required: ["itemId", "itemLabel", "partType", "searchKeywords", "urgency"],
                      additionalProperties: false,
                    },
                  },
                  inspectorCoaching: {
                    type: "object",
                    properties: {
                      overallGrade: { type: "string", enum: ["A", "B", "C", "D"] },
                      coverageScore: { type: "number", description: "0-100" },
                      strengths: { type: "array", items: { type: "string" } },
                      improvements: { type: "array", items: { type: "string" } },
                    },
                    required: ["overallGrade", "coverageScore", "strengths", "improvements"],
                    additionalProperties: false,
                  },
                },
                required: ["executiveSummary", "rootCauseAnalysis", "workOrders", "predictiveInsights", "partsRecommendations", "inspectorCoaching"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_debrief_analysis" } },
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
    console.log("Debrief AI response received");

    let analysis = null;
    const toolCalls = data.choices?.[0]?.message?.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      try {
        analysis = JSON.parse(toolCalls[0].function.arguments);
      } catch (e) {
        console.error("Failed to parse tool call:", e);
      }
    }

    if (!analysis) {
      // Fallback: try parsing content
      const content = data.choices?.[0]?.message?.content || "";
      try {
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        analysis = JSON.parse(jsonMatch ? jsonMatch[1].trim() : content.trim());
      } catch {
        console.error("Failed to parse debrief content");
        return new Response(JSON.stringify({ error: "Failed to generate analysis" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("debrief-analysis error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
