import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { InspectionSection, Machine } from '@/lib/mock-data';
import type { DebriefAnalysis } from '@/hooks/useDebriefAnalysis';

interface SaveInspectionParams {
  machine: Machine;
  sections: InspectionSection[];
  transcript?: string;
  elapsed?: number;
  analysis?: DebriefAnalysis | null;
  analyzedItems?: Record<string, any>;
}

export function useInspectionStorage() {
  const uploadPhoto = useCallback(async (base64DataUrl: string, inspectionId: string, itemId: string): Promise<string | null> => {
    try {
      const res = await fetch(base64DataUrl);
      const blob = await res.blob();
      const fileName = `${inspectionId}/${itemId}_${Date.now()}.jpg`;

      const { data, error } = await supabase.storage
        .from('evidence-photos')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

      if (error) {
        console.error('Photo upload error:', error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('evidence-photos')
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (e) {
      console.error('Photo upload failed:', e);
      return null;
    }
  }, []);

  const saveInspection = useCallback(async ({
    machine,
    sections,
    transcript,
    elapsed,
    analysis,
    analyzedItems,
  }: SaveInspectionParams): Promise<string | null> => {
    try {
      const { data: inspection, error: inspError } = await supabase
        .from('inspections')
        .insert({
          machine_id: machine.id,
          machine_model: machine.model,
          machine_serial: machine.serial,
          asset_id: machine.assetId,
          smu_hours: machine.smuHours,
          inspector_name: 'Marcus Chen',
          location: machine.location,
          duration_seconds: elapsed || null,
          transcript: transcript || null,
          health_score: analysis?.executiveSummary?.healthScore || null,
          status: analysis?.executiveSummary?.status || null,
          executive_summary: analysis?.executiveSummary?.summary || null,
          analysis_json: analysis ? (analysis as any) : null,
        })
        .select('id')
        .single();

      if (inspError || !inspection) {
        console.error('Failed to save inspection:', inspError);
        return null;
      }

      const inspectionId = inspection.id;

      // Collect all items with their photo upload needs
      const itemsRaw: Array<{
        item: any;
        section: any;
        aiResult: any;
        rawPhotoUrl: string | null;
      }> = [];

      for (const section of sections) {
        for (const item of section.items) {
          const aiResult = analyzedItems?.[item.id];
          const rawPhotoUrl = aiResult?.photoUrl || (item as any).photoUrl || null;
          itemsRaw.push({ item, section, aiResult, rawPhotoUrl });
        }
      }

      // Upload ALL photos in parallel (instead of one-by-one)
      const photoUploadPromises = itemsRaw.map(async ({ item, rawPhotoUrl }) => {
        if (rawPhotoUrl && rawPhotoUrl.startsWith('data:')) {
          return uploadPhoto(rawPhotoUrl, inspectionId, item.id);
        }
        return rawPhotoUrl; // already a URL or null
      });

      const photoUrls = await Promise.all(photoUploadPromises);

      // Build items to insert with resolved photo URLs
      const itemsToInsert = itemsRaw.map(({ item, section, aiResult }, idx) => ({
        inspection_id: inspectionId,
        item_id: item.id,
        label: item.label,
        section_id: section.id,
        section_title: section.title,
        status: item.status,
        comment: item.comment || aiResult?.comment || null,
        evidence_types: item.evidence || aiResult?.evidence || [],
        fault_code: item.faultCode || aiResult?.faultCode || null,
        annotation: (item as any).annotation || aiResult?.annotation || null,
        photo_url: photoUrls[idx] || null,
        ai_agreement: aiResult?.aiAgreement || (item as any).aiAgreement || null,
        ai_visual_note: aiResult?.aiVisualNote || (item as any).aiVisualNote || null,
      }));

      // Batch insert items
      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('inspection_items')
          .insert(itemsToInsert);

        if (itemsError) {
          console.error('Failed to save inspection items:', itemsError);
        }
      }

      return inspectionId;
    } catch (e) {
      console.error('Save inspection error:', e);
      return null;
    }
  }, [uploadPhoto]);

  const getInspectionHistory = useCallback(async (machineId?: string) => {
    let query = supabase
      .from('inspections')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (machineId) {
      query = query.eq('machine_id', machineId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Failed to fetch history:', error);
      return [];
    }
    return data || [];
  }, []);

  const getInspectionDetail = useCallback(async (inspectionId: string) => {
    const [inspRes, itemsRes] = await Promise.all([
      supabase.from('inspections').select('*').eq('id', inspectionId).single(),
      supabase.from('inspection_items').select('*').eq('inspection_id', inspectionId).order('item_id'),
    ]);

    if (inspRes.error) {
      console.error('Failed to fetch inspection:', inspRes.error);
      return null;
    }

    return {
      inspection: inspRes.data,
      items: itemsRes.data || [],
    };
  }, []);

  return { saveInspection, getInspectionHistory, getInspectionDetail, uploadPhoto };
}
