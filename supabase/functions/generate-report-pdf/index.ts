import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Generate an HTML-based inspection report that can be printed/saved as PDF
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inspection, items, analysis } = await req.json();

    if (!inspection || !items) {
      return new Response(JSON.stringify({ error: "Missing inspection data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group items by section
    const sections: Record<string, { title: string; items: any[] }> = {};
    for (const item of items) {
      if (!sections[item.section_id]) {
        sections[item.section_id] = { title: item.section_title, items: [] };
      }
      sections[item.section_id].items.push(item);
    }

    const statusEmoji: Record<string, string> = {
      pass: '✅', monitor: '⚠️', fail: '❌', normal: '⬜', unconfirmed: '❓',
    };

    const statusLabel: Record<string, string> = {
      pass: 'PASS', monitor: 'MONITOR', fail: 'FAIL', normal: 'NORMAL', unconfirmed: 'UNCONFIRMED',
    };

    const statusColor: Record<string, string> = {
      pass: '#22c55e', monitor: '#eab308', fail: '#ef4444', normal: '#6b7280', unconfirmed: '#9ca3af',
    };

    const failCount = items.filter((i: any) => i.status === 'fail').length;
    const monitorCount = items.filter((i: any) => i.status === 'monitor').length;
    const passCount = items.filter((i: any) => i.status === 'pass').length;
    const normalCount = items.filter((i: any) => i.status === 'normal').length;

    const date = new Date(inspection.created_at || Date.now());

    let analysisHtml = '';
    if (analysis) {
      // Executive Summary
      analysisHtml += `
        <div class="section">
          <h2>Executive Summary</h2>
          <div class="summary-box ${analysis.executiveSummary?.status?.toLowerCase() || 'caution'}">
            <div class="health-score">${analysis.executiveSummary?.healthScore || '—'}<span>/100</span></div>
            <div class="status-label">${analysis.executiveSummary?.status || 'N/A'}</div>
            <p>${analysis.executiveSummary?.summary || ''}</p>
          </div>
        </div>
      `;

      // Root Cause Analysis
      if (analysis.rootCauseAnalysis?.length > 0) {
        analysisHtml += `<div class="section"><h2>Root Cause Analysis</h2>`;
        for (const rca of analysis.rootCauseAnalysis) {
          analysisHtml += `
            <div class="rca-item">
              <strong>${rca.itemId} — ${rca.itemLabel}</strong>
              <p>${rca.rootCause}</p>
              ${rca.cascadeRisk ? `<p class="cascade">⚠️ Cascade Risk: ${rca.cascadeRisk}</p>` : ''}
            </div>
          `;
        }
        analysisHtml += `</div>`;
      }

      // Work Orders
      if (analysis.workOrders?.length > 0) {
        analysisHtml += `<div class="section"><h2>Work Orders</h2><table class="wo-table"><thead><tr><th>Priority</th><th>Item</th><th>Description</th><th>Hours</th><th>Operate?</th></tr></thead><tbody>`;
        for (const wo of analysis.workOrders) {
          analysisHtml += `<tr class="priority-${wo.priority?.toLowerCase()}"><td><strong>${wo.priority}</strong></td><td>${wo.itemId}</td><td>${wo.title}<br><small>${wo.description}</small></td><td>${wo.estimatedHours}h</td><td>${wo.canOperate ? 'Yes' : '<strong style="color:red">NO</strong>'}</td></tr>`;
        }
        analysisHtml += `</tbody></table></div>`;
      }

      // Predictive Insights
      if (analysis.predictiveInsights?.length > 0) {
        analysisHtml += `<div class="section"><h2>Predictive Maintenance Insights</h2>`;
        for (const pi of analysis.predictiveInsights) {
          analysisHtml += `
            <div class="predict-item">
              <strong>${pi.itemLabel}</strong> <span class="confidence ${pi.confidence}">${pi.confidence} confidence</span>
              <p>${pi.prediction}</p>
              ${pi.estimatedHoursToFailure ? `<p class="hours-warn">⏱ ~${pi.estimatedHoursToFailure} SMU hours to potential failure</p>` : ''}
              <p class="recommendation">→ ${pi.recommendation}</p>
            </div>
          `;
        }
        analysisHtml += `</div>`;
      }

      // Parts Recommendations
      if (analysis.partsRecommendations?.length > 0) {
        analysisHtml += `<div class="section"><h2>Parts Recommendations</h2><table class="wo-table"><thead><tr><th>Item</th><th>Part Type</th><th>Search Keywords</th><th>Urgency</th></tr></thead><tbody>`;
        for (const part of analysis.partsRecommendations) {
          analysisHtml += `<tr><td>${part.itemId} ${part.itemLabel}</td><td>${part.partType}</td><td>${part.searchKeywords}</td><td><strong>${part.urgency}</strong></td></tr>`;
        }
        analysisHtml += `</tbody></table></div>`;
      }

      // Inspector Coaching
      if (analysis.inspectorCoaching) {
        const ic = analysis.inspectorCoaching;
        analysisHtml += `
          <div class="section">
            <h2>Inspector Performance</h2>
            <div class="coaching-box">
              <div class="grade">Grade: <strong>${ic.overallGrade}</strong></div>
              <div class="coverage">Coverage: <strong>${ic.coverageScore}%</strong></div>
              ${ic.strengths?.length ? `<p><strong>Strengths:</strong> ${ic.strengths.join('; ')}</p>` : ''}
              ${ic.improvements?.length ? `<p><strong>Areas to Improve:</strong> ${ic.improvements.join('; ')}</p>` : ''}
            </div>
          </div>
        `;
      }
    }

    // Build sections HTML
    let sectionsHtml = '';
    for (const [, section] of Object.entries(sections)) {
      const s = section as { title: string; items: any[] };
      sectionsHtml += `<div class="section"><h2>${s.title}</h2>`;
      for (const item of s.items) {
        sectionsHtml += `
          <div class="item ${item.status}">
            <div class="item-header">
              <span class="item-id">${item.item_id}</span>
              <span class="item-label">${item.label}</span>
              <span class="item-status" style="color:${statusColor[item.status]}">${statusLabel[item.status]}</span>
            </div>
            ${item.comment ? `<p class="item-comment">${item.comment}</p>` : ''}
            ${item.annotation ? `<p class="item-annotation">🔍 ${item.annotation}</p>` : ''}
            ${item.fault_code ? `<p class="item-fault">Fault Code: ${item.fault_code}</p>` : ''}
            ${item.photo_url ? `<div class="item-photo"><img src="${item.photo_url}" alt="Evidence" /></div>` : ''}
          </div>
        `;
      }
      sectionsHtml += `</div>`;
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Inspection Report - ${inspection.asset_id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; line-height: 1.5; font-size: 12px; }
    .page { max-width: 800px; margin: 0 auto; padding: 30px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #FFCD11; padding-bottom: 15px; margin-bottom: 20px; }
    .header-left h1 { font-size: 22px; color: #1a1a1a; letter-spacing: -0.5px; }
    .header-left p { font-size: 13px; color: #666; margin-top: 2px; }
    .header-right { text-align: right; }
    .header-right .counts { display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px; }
    .count-badge { padding: 4px 10px; border-radius: 4px; font-weight: 700; font-size: 11px; }
    .count-pass { background: #dcfce7; color: #16a34a; }
    .count-monitor { background: #fef9c3; color: #ca8a04; }
    .count-fail { background: #fee2e2; color: #dc2626; }
    .count-normal { background: #f3f4f6; color: #6b7280; }
    .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 20px; padding: 12px; background: #f9fafb; border-radius: 6px; border: 1px solid #e5e7eb; }
    .info-item label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; display: block; }
    .info-item span { font-weight: 600; font-size: 12px; }
    .section { margin-bottom: 20px; page-break-inside: avoid; }
    .section h2 { font-size: 14px; padding: 8px 12px; background: #f3f4f6; border-left: 3px solid #FFCD11; margin-bottom: 8px; }
    .item { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; }
    .item.fail { background: #fef2f2; }
    .item.monitor { background: #fffbeb; }
    .item-header { display: flex; align-items: center; gap: 8px; }
    .item-id { font-family: monospace; font-size: 10px; color: #9ca3af; min-width: 28px; }
    .item-label { flex: 1; font-weight: 500; }
    .item-status { font-weight: 700; font-size: 11px; text-transform: uppercase; }
    .item-comment { font-size: 11px; color: #6b7280; margin: 4px 0 0 36px; }
    .item-annotation { font-size: 10px; color: #0891b2; margin: 2px 0 0 36px; font-style: italic; }
    .item-fault { font-size: 10px; color: #0891b2; font-family: monospace; margin: 2px 0 0 36px; }
    .item-photo { margin: 6px 0 0 36px; }
    .item-photo img { max-width: 200px; max-height: 120px; border-radius: 4px; border: 1px solid #e5e7eb; }
    .summary-box { padding: 16px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #e5e7eb; }
    .summary-box.ready { border-color: #22c55e; background: #f0fdf4; }
    .summary-box.caution { border-color: #eab308; background: #fefce8; }
    .summary-box.down { border-color: #ef4444; background: #fef2f2; }
    .health-score { font-size: 36px; font-weight: 800; font-family: monospace; }
    .health-score span { font-size: 16px; color: #9ca3af; }
    .status-label { font-size: 14px; font-weight: 700; margin-bottom: 6px; }
    .rca-item { padding: 10px; background: #f9fafb; border-radius: 6px; margin-bottom: 8px; border: 1px solid #e5e7eb; }
    .cascade { color: #ca8a04; font-size: 11px; margin-top: 4px; }
    .wo-table { width: 100%; border-collapse: collapse; font-size: 11px; }
    .wo-table th { background: #f3f4f6; text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; }
    .wo-table td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    .wo-table small { color: #6b7280; }
    .priority-critical td:first-child { color: #dc2626; }
    .priority-high td:first-child { color: #ea580c; }
    .priority-medium td:first-child { color: #ca8a04; }
    .predict-item { padding: 10px; background: #f9fafb; border-radius: 6px; margin-bottom: 8px; border: 1px solid #e5e7eb; }
    .confidence { font-size: 10px; padding: 2px 6px; border-radius: 3px; }
    .confidence.high { background: #fee2e2; color: #dc2626; }
    .confidence.medium { background: #fef9c3; color: #ca8a04; }
    .confidence.low { background: #f3f4f6; color: #6b7280; }
    .hours-warn { color: #ca8a04; font-size: 11px; margin-top: 4px; }
    .recommendation { color: #2563eb; font-size: 11px; margin-top: 4px; }
    .coaching-box { padding: 12px; background: #f9fafb; border-radius: 6px; border: 1px solid #e5e7eb; }
    .grade { font-size: 16px; margin-bottom: 4px; }
    .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 10px; color: #9ca3af; }
    @media print { body { font-size: 11px; } .page { padding: 15px; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-left">
        <h1>Safety & Maintenance Inspection</h1>
        <p>${inspection.machine_model || 'Equipment'}</p>
      </div>
      <div class="header-right">
        <div class="counts">
          <span class="count-badge count-pass">${passCount} Pass</span>
          <span class="count-badge count-monitor">${monitorCount} Monitor</span>
          <span class="count-badge count-fail">${failCount} Fail</span>
          <span class="count-badge count-normal">${normalCount} Normal</span>
        </div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-item"><label>Serial Number</label><span>${inspection.machine_serial || '—'}</span></div>
      <div class="info-item"><label>Asset ID</label><span>${inspection.asset_id || '—'}</span></div>
      <div class="info-item"><label>Model</label><span>${inspection.machine_model || '—'}</span></div>
      <div class="info-item"><label>SMU Hours</label><span>${inspection.smu_hours?.toLocaleString() || '—'}</span></div>
      <div class="info-item"><label>Inspector</label><span>${inspection.inspector_name || '—'}</span></div>
      <div class="info-item"><label>Date</label><span>${date.toLocaleDateString()}</span></div>
      <div class="info-item"><label>Duration</label><span>${inspection.duration_seconds ? `${Math.floor(inspection.duration_seconds / 60)}m ${inspection.duration_seconds % 60}s` : '—'}</span></div>
      <div class="info-item"><label>Location</label><span>${inspection.location || '—'}</span></div>
    </div>

    ${analysisHtml}
    ${sectionsHtml}

    <div class="footer">
      <p>Generated by InspectAI • ${date.toLocaleDateString()} ${date.toLocaleTimeString()} • Report ID: ${inspection.id?.slice(0, 8) || 'DRAFT'}</p>
    </div>
  </div>
</body>
</html>`;

    return new Response(JSON.stringify({ html }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-report-pdf error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
