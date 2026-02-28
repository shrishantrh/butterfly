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
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { searchTerms, machineModel, machineSerial } = await req.json();

    if (!searchTerms || !Array.isArray(searchTerms) || searchTerms.length === 0) {
      return new Response(JSON.stringify({ error: "No search terms provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Search parts.cat.com for each part need
    const results = await Promise.all(
      searchTerms.slice(0, 5).map(async (term: { itemId: string; keywords: string; partType: string }) => {
        const query = `${term.keywords} CAT 320 ${machineModel || ''}`.trim();
        
        try {
          // Use Firecrawl search to find parts
          const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: `site:parts.cat.com ${query}`,
              limit: 3,
              scrapeOptions: {
                formats: ["markdown"],
              },
            }),
          });

          if (!searchResponse.ok) {
            console.error(`Search failed for "${query}":`, searchResponse.status);
            // Fallback: try scraping the search page directly
            const scrapeUrl = `https://parts.cat.com/en/catcorp/search?q=${encodeURIComponent(query)}`;
            const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                url: scrapeUrl,
                formats: ["markdown"],
                onlyMainContent: true,
                waitFor: 3000,
              }),
            });
            
            if (!scrapeResponse.ok) {
              console.error(`Scrape also failed for "${query}"`);
              return {
                itemId: term.itemId,
                partType: term.partType,
                keywords: term.keywords,
                results: [],
                directUrl: scrapeUrl,
                error: "Search unavailable",
              };
            }
            
            const scrapeData = await scrapeResponse.json();
            return {
              itemId: term.itemId,
              partType: term.partType,
              keywords: term.keywords,
              results: [],
              markdown: scrapeData.data?.markdown || scrapeData.markdown || "",
              directUrl: scrapeUrl,
            };
          }

          const searchData = await searchResponse.json();
          const hits = (searchData.data || []).map((r: any) => ({
            title: r.title || "CAT Part",
            url: r.url,
            description: r.description || "",
            snippet: (r.markdown || "").slice(0, 300),
          }));

          return {
            itemId: term.itemId,
            partType: term.partType,
            keywords: term.keywords,
            results: hits,
            directUrl: `https://parts.cat.com/en/catcorp/search?q=${encodeURIComponent(query)}`,
          };
        } catch (err) {
          console.error(`Error searching for "${query}":`, err);
          return {
            itemId: term.itemId,
            partType: term.partType,
            keywords: term.keywords,
            results: [],
            directUrl: `https://parts.cat.com/en/catcorp/search?q=${encodeURIComponent(query)}`,
            error: "Search failed",
          };
        }
      })
    );

    return new Response(JSON.stringify({ parts: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parts-lookup error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
