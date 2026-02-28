
-- Inspections table
CREATE TABLE public.inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id TEXT NOT NULL,
  machine_model TEXT NOT NULL,
  machine_serial TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  smu_hours INTEGER NOT NULL DEFAULT 0,
  inspector_name TEXT NOT NULL DEFAULT 'Unknown',
  location TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  duration_seconds INTEGER,
  transcript TEXT,
  health_score INTEGER,
  status TEXT CHECK (status IN ('READY', 'CAUTION', 'DOWN')),
  executive_summary TEXT,
  analysis_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inspection items table
CREATE TABLE public.inspection_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  label TEXT NOT NULL,
  section_id TEXT NOT NULL,
  section_title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pass', 'monitor', 'fail', 'normal', 'unconfirmed')),
  comment TEXT,
  evidence_types TEXT[] DEFAULT '{}',
  fault_code TEXT,
  annotation TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_items ENABLE ROW LEVEL SECURITY;

-- Permissive policies (no auth required for this tool)
CREATE POLICY "Allow all read on inspections" ON public.inspections FOR SELECT USING (true);
CREATE POLICY "Allow all insert on inspections" ON public.inspections FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on inspections" ON public.inspections FOR UPDATE USING (true);

CREATE POLICY "Allow all read on inspection_items" ON public.inspection_items FOR SELECT USING (true);
CREATE POLICY "Allow all insert on inspection_items" ON public.inspection_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on inspection_items" ON public.inspection_items FOR UPDATE USING (true);

-- Create indexes
CREATE INDEX idx_inspections_machine_id ON public.inspections(machine_id);
CREATE INDEX idx_inspections_created_at ON public.inspections(created_at DESC);
CREATE INDEX idx_inspection_items_inspection_id ON public.inspection_items(inspection_id);

-- Create storage bucket for evidence photos
INSERT INTO storage.buckets (id, name, public) VALUES ('evidence-photos', 'evidence-photos', true);

-- Storage policies
CREATE POLICY "Public read evidence photos" ON storage.objects FOR SELECT USING (bucket_id = 'evidence-photos');
CREATE POLICY "Anyone can upload evidence photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'evidence-photos');
