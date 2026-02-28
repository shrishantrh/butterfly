import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import PreInspection from "./pages/PreInspection";
import ActiveInspection from "./pages/ActiveInspection";
import ReviewInspection from "./pages/ReviewInspection";
import Debrief from "./pages/Debrief";
import InspectionHistory from "./pages/InspectionHistory";
import InspectionDetail from "./pages/InspectionDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/pre-inspection/:machineId" element={<PreInspection />} />
          <Route path="/inspect/:machineId" element={<ActiveInspection />} />
          <Route path="/review/:machineId" element={<ReviewInspection />} />
          <Route path="/debrief/:machineId" element={<Debrief />} />
          <Route path="/history/:machineId" element={<InspectionHistory />} />
          <Route path="/history" element={<InspectionHistory />} />
          <Route path="/inspection-detail/:inspectionId" element={<InspectionDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
