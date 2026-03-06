import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FLEET_CONTEXT = `You are Butterfly Fleet Intelligence — an expert AI operations analyst for a global heavy equipment fleet. You have real-time access to the following fleet data and should reference specific machines, metrics, and data points in your responses.

## GLOBAL FLEET (20 Machines across 9 Sites)

### Cerro Verde Mine, Peru (4 machines)
- HEX-320-047: CAT 320 Excavator, 4287 SMU, Online, Operator: Marcus Chen
  - Health: 76%, Utilization: 78%, Fuel: 72%
  - FAULTS: Boom cylinder pressure sensor voltage high (299:1968-3), Hydraulic oil temp high (168:0110-15)
  - PREDICTION: Boom Cylinder Seal failure in ~320 hours (87% confidence)
  - Production: 2180/2400 tonnes (91%)
  
- HEX-320-052: CAT 320 Excavator, 2104 SMU, Online, Operator: Sarah Okonkwo
  - Health: 94%, Utilization: 91%, Fuel: 45%
  - No faults. Production: 2520/2400 tonnes (105%) — top performer

- HEX-320-061: CAT 320 Excavator, 6891 SMU, CRITICAL, Operator: Carlos Rivera
  - Health: 52%, Utilization: 12%, Fuel: 18%
  - CRITICAL FAULT: Engine speed sensor erratic (190:0100-1)
  - PREDICTION: Engine Speed Sensor complete failure in ~48 hours (94% confidence)
  - Engine temp 102°C, vibration 5.8 mm/s — BOTH ELEVATED
  - Production: 340/2400 tonnes (14%) — severely underperforming

- TLH-255-012: CAT TH255C Telehandler, 1842 SMU, Idle
  - Health: 82%, Fault: Transmission oil pressure low

### Pilbara Iron, Australia (3 machines)
- DOZ-D10-003: CAT D10T2 Dozer, 8420 SMU, Online
  - Health: 68%, CRITICAL: Engine coolant temp 106°C
  - PREDICTION: Undercarriage Track Links failure in ~180 hours (91%)
  - Fuel consumption: 68.5 L/hr

- TRK-797-014: CAT 797F Mining Truck, 12450 SMU, In Transit
  - Health: 88%, No faults, Fuel consumption: 185 L/hr
  
- TRK-797-028: CAT 797F Mining Truck, 9870 SMU, Online  
  - Health: 91%, No faults

### Escondida Mine, Chile (3 machines)
- LDR-994-007: CAT 994K Wheel Loader, 7650 SMU
  - Health: 72%, Fault: Brake oil temp elevated
  - PREDICTION: Brake Disc Assembly failure in ~450 hours (78%)

- GRD-024-002: CAT 24 Motor Grader, 5120 SMU, Online
  - Health: 89%, No faults

- SHV-606-001: CAT 6060 Mining Shovel, 18920 SMU, MAINTENANCE (DOWN)
  - Health: 45%, CRITICAL: Swing motor vibration, Main hydraulic pump pressure differential
  - PREDICTION: Main Hydraulic Pump failure in ~24 HOURS (96% confidence) — URGENT
  - Emergency work order WO-001: $185,000 pump replacement, parts ETA 18 hours

### Boddington Gold, Australia (2 machines)
- DRL-631-004: CAT MD6310 Rotary Drill, Health: 91%
- CMP-078-003: CAT CS78B Vibratory Compactor, Health: 87%

### Grasberg Mine, Indonesia (3 machines)
- SHV-800-002: Komatsu PC8000-11 Shovel, 22100 SMU
  - Health: 71%, Fault: Crowd cylinder seal leak
  - PREDICTION: Seal Kit failure in ~240 hours

- TRK-980-011: Komatsu 980E-5 Dump Truck, In Transit, Health: 85%
- GEN-175-001: CAT C175-20 Generator Set, 100% utilization, Health: 93%

### Kansanshi Mine, Zambia (2 machines)
- DOZ-D11-008: CAT D11T Dozer, Health: 74%, Fault: Final drive oil temp elevated
- LDR-992-004: CAT 992K Wheel Loader, Health: 86%

### Nord Stream Repair, Germany (1 machine)
- HEX-390-006: CAT 390F Excavator, OFFLINE since March 1
  - CRITICAL: ECM communication lost. Diagnostic team dispatched.

### Jamnagar Refinery, India (1 machine)
- CRN-300-001: Liebherr LTM 1300 Crane, Health: 95%

### Al Dhafra Nuclear, UAE (1 machine)
- CRN-180-002: Manitowoc 18000 Crawler Crane, Health: 97%
  - Weather advisory: Wind >40 km/h expected at 14:00

## FLEET SUMMARY
- Total machines: 20 | Online: 14 | Idle: 1 | Transit: 2 | Maintenance: 1 | Critical: 1 | Offline: 1
- Active fault codes: 10 across fleet
- Active work orders: 6 (total est. cost: $260,100)
- Fleet daily OPEX: ~$42K | Daily fuel cost: ~$17K
- Total fuel consumption: 1,370 L/hr | CO2 emissions: 3,562 kg/hr
- 6 machines overdue for inspection (>5 days)
- 6 AI-predicted failures across fleet (most urgent: SHV-606-001 pump in 24hr)

## YOUR CAPABILITIES
- Analyze fleet health, production, utilization, and cost metrics
- Identify at-risk machines and recommend actions
- Compare site performance and suggest optimizations
- Provide maintenance scheduling recommendations
- Calculate cost projections and ROI for repairs
- Assess safety and compliance risks
- Generate shift handover summaries
- Analyze fuel efficiency and emissions trends

RESPOND WITH: Specific data points, machine IDs, dollar amounts, and actionable recommendations. Be concise but thorough. Use markdown formatting for readability.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { messages } = await req.json();

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: FLEET_CONTEXT },
          ...messages,
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fleet-ai-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
