import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import { 
  Shield, ArrowLeft, Save, CheckCircle2, XCircle, 
  Circle as CircleIcon, Sparkles, Camera, X, Image as ImageIcon,
  Info, Copy, ChevronDown, ChevronUp, Lock
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuditoriaPage = () => {
  const { auditoriaId } = useParams();
  const navigate = useNavigate();
  
  const [auditoria, setAuditoria] = useState(null);
  const [standards, setStandards] = useState([]);
  const [companyData, setCompanyData] = useState(null);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [auditConfig, setAuditConfig] = useState(null);
  
  // AI States
  const [aiLoading, setAiLoading] = useState({});
  const [aiRecommendations, setAiRecommendations] = useState({});
  const [expandedRecommendations, setExpandedRecommendations] = useState({});
  
  // Image States
  const [imageLoading, setImageLoading] = useState({});
  const [evidenceImages, setEvidenceImages] = useState({});
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImageData, setSelectedImageData] = useState(null);
  
  const fileInputRefs = useRef({});

  useEffect(() => {
    fetchData();
  }, [auditoriaId]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch auditoria, standards
      const [auditoriaRes, standardsRes] = await Promise.all([
        axios.get(`${API}/inspections/${auditoriaId}`, { headers }),
        axios.get(`${API}/standards`, { headers })
      ]);

      setAuditoria(auditoriaRes.data);
      setStandards(standardsRes.data);
      setCompanyData(auditoriaRes.data.company);

      // Load audit config if exists
      if (auditoriaRes.data.config_id) {
        try {
          const configRes = await axios.get(`${API}/configuracion-auditoria/${auditoriaRes.data.config_id}`, { headers });
          setAuditConfig(configRes.data);
        } catch (err) {
          console.error("Error loading audit config:", err);
        }
      }

      // Initialize responses from existing data
      const initialResponses = {};
      const existingResponses = auditoriaRes.data.responses || [];
      
      standardsRes.data.forEach(standard => {
        const existing = existingResponses.find(r => r.standard_id === standard.id);
        initialResponses[standard.id] = {
          response: existing?.response || "",
          observations: existing?.observations || "",
          ai_recommendation: existing?.ai_recommendation || "",
          evidence_images: existing?.evidence_images || []
        };
        
        // Load AI recommendations
        if (existing?.ai_recommendation) {
          setAiRecommendations(prev => ({
            ...prev,
            [standard.id]: existing.ai_recommendation
          }));
        }
        
        // Load evidence images
        if (existing?.evidence_images?.length > 0) {
          setEvidenceImages(prev => ({
            ...prev,
            [standard.id]: existing.evidence_images
          }));
        }
      });
      setResponses(initialResponses);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar la auditoría");
      navigate("/client/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleResponseChange = (standardId, field, value) => {
    setResponses(prev => ({
      ...prev,
      [standardId]: {
        ...prev[standardId],
        [field]: value
      }
    }));
  };

  // Save progress without closing
  const handleSaveProgress = async () => {
    if (auditoria?.status === 'cerrada') {
      toast.error("La auditoría está cerrada y no se puede modificar");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      
      const responsesArray = Object.entries(responses).map(([standard_id, data]) => ({
        standard_id,
        response: data.response,
        observations: data.observations,
        ai_recommendation: aiRecommendations[standard_id] || "",
        evidence_images: evidenceImages[standard_id] || []
      }));

      const response = await axios.put(
        `${API}/auditorias/${auditoriaId}/save`,
        responsesArray,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Progreso guardado. ${response.data.answered} de ${response.data.total} estándares completados.`);
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Error al guardar el progreso");
    } finally {
      setSaving(false);
    }
  };

  // AI Recommendation Function
  const getAIRecommendation = async (standard) => {
    const currentResponse = responses[standard.id];
    if (!currentResponse?.response) {
      toast.error("Por favor, seleccione primero una respuesta para este estándar");
      return;
    }

    setAiLoading(prev => ({ ...prev, [standard.id]: true }));

    try {
      const token = localStorage.getItem("token");
      const payload = {
        standard_id: standard.id,
        standard_title: standard.title,
        standard_description: standard.description,
        metodo_verificacion: standard.metodo_verificacion || "",
        criterio: standard.criterio || "",
        response: currentResponse.response,
        observations: currentResponse.observations || "",
        company_activity: companyData?.descripcion_actividad || "",
        risk_level: companyData?.nivel_riesgo || "",
        audit_config_id: auditoria?.config_id || null
      };

      const response = await axios.post(`${API}/ai/standard-recommendation`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setAiRecommendations(prev => ({
        ...prev,
        [standard.id]: response.data.recommendation
      }));
      setExpandedRecommendations(prev => ({ ...prev, [standard.id]: true }));
      toast.success("Recomendación generada exitosamente");
    } catch (error) {
      console.error("Error getting AI recommendation:", error);
      toast.error("Error al generar recomendación de IA");
    } finally {
      setAiLoading(prev => ({ ...prev, [standard.id]: false }));
    }
  };

  // Image Upload and Analysis
  const handleImageUpload = async (standardId, standard, event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    const currentImages = evidenceImages[standardId] || [];
    if (currentImages.length >= 2) {
      toast.error("Máximo 2 imágenes por estándar");
      return;
    }

    const file = files[0];
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error("Solo se permiten imágenes JPEG, PNG o WEBP");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede superar 5MB");
      return;
    }

    setImageLoading(prev => ({ ...prev, [standardId]: true }));

    try {
      const token = localStorage.getItem("token");
      
      // Upload image
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResponse = await axios.post(`${API}/upload-evidence`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      const imageUrl = uploadResponse.data.url;

      // Convert to base64 for AI analysis
      const base64 = await fileToBase64(file);
      
      // Analyze image with AI
      let analysisResult = "Análisis no disponible";
      try {
        const analysisPayload = {
          standard_id: standard.id,
          standard_title: standard.title,
          image_base64: base64.split(',')[1],
          company_activity: companyData?.descripcion_actividad || ""
        };

        const analysisResponse = await axios.post(`${API}/ai/analyze-image`, analysisPayload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        analysisResult = analysisResponse.data.analysis;
      } catch (analysisError) {
        console.error("Error in AI analysis:", analysisError);
        analysisResult = "No se pudo analizar la imagen. La imagen se guardó como evidencia.";
      }

      const newImage = {
        url: imageUrl,
        filename: file.name,
        analysis: analysisResult
      };

      setEvidenceImages(prev => ({
        ...prev,
        [standardId]: [...(prev[standardId] || []), newImage]
      }));

      toast.success("Imagen subida exitosamente");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Error al procesar la imagen");
    } finally {
      setImageLoading(prev => ({ ...prev, [standardId]: false }));
      if (fileInputRefs.current[standardId]) {
        fileInputRefs.current[standardId].value = '';
      }
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const removeImage = (standardId, index) => {
    setEvidenceImages(prev => ({
      ...prev,
      [standardId]: prev[standardId].filter((_, i) => i !== index)
    }));
  };

  const openImageDialog = (image) => {
    setSelectedImageData(image);
    setImageDialogOpen(true);
  };

  const copyToObservations = (standardId, text) => {
    const currentObs = responses[standardId]?.observations || "";
    const newObs = currentObs ? `${currentObs}\n\n--- Recomendación IA ---\n${text}` : text;
    handleResponseChange(standardId, "observations", newObs);
    toast.success("Copiado a observaciones");
  };

  const getCompletionPercentage = () => {
    const answered = Object.values(responses).filter(r => r.response).length;
    return (answered / standards.length) * 100;
  };

  const groupByCategory = () => {
    const grouped = {};
    standards.forEach(standard => {
      if (!grouped[standard.category]) {
        grouped[standard.category] = [];
      }
      grouped[standard.category].push(standard);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" className="text-blue-600" />
      </div>
    );
  }

  const groupedStandards = groupByCategory();
  const isClosed = auditoria?.status === 'cerrada';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <nav className="bg-white shadow-md border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-bold truncate" style={{ fontFamily: 'Space Grotesk' }}>
                  Auditoría {isClosed ? "(Cerrada)" : "en Curso"}
                </h1>
                {companyData && (
                  <p className="text-xs text-gray-500 truncate">{companyData.company_name}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
              {isClosed && (
                <Badge variant="secondary" className="bg-gray-200">
                  <Lock className="h-3 w-3 mr-1" />
                  Cerrada
                </Badge>
              )}
              <div className="text-xs sm:text-sm text-gray-600 hidden md:block">
                {Object.values(responses).filter(r => r.response).length} / {standards.length}
              </div>
              {!isClosed && (
                <Button 
                  onClick={handleSaveProgress} 
                  disabled={saving}
                  variant="default"
                  size="sm" 
                  className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm"
                >
                  {saving ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4 sm:mr-1" />}
                  <span className="hidden sm:inline">Guardar</span>
                </Button>
              )}
              <Button onClick={() => navigate("/client/dashboard")} variant="outline" size="sm" className="text-xs sm:text-sm">
                <ArrowLeft className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Volver</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Audit Config Info */}
        {auditConfig && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600" />
                Configuración de Auditoría
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Tipo:</span>
                  <p className="font-medium">{auditConfig.tipo_auditoria}</p>
                </div>
                <div>
                  <span className="text-gray-500">Fecha:</span>
                  <p className="font-medium">{auditConfig.fecha_inicio}</p>
                </div>
                <div>
                  <span className="text-gray-500">Auditor Líder:</span>
                  <p className="font-medium">{auditConfig.equipo_auditor?.[0]?.nombre || "N/A"}</p>
                </div>
                <div>
                  <span className="text-gray-500">Alcance:</span>
                  <p className="font-medium truncate">{auditConfig.alcance}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <Progress value={getCompletionPercentage()} className="h-3" />
            <p className="text-sm text-gray-600 mt-2 text-center">
              {getCompletionPercentage().toFixed(0)}% completado ({Object.values(responses).filter(r => r.response).length} de {standards.length} estándares)
            </p>
          </CardContent>
        </Card>

        {/* Standards */}
        <Accordion type="multiple" className="space-y-4">
          {Object.entries(groupedStandards).map(([category, categoryStandards]) => (
            <AccordionItem key={category} value={category} className="bg-white rounded-lg shadow-md border-0">
              <AccordionTrigger className="px-6 hover:bg-gray-50 rounded-t-lg">
                <div className="flex items-center justify-between w-full pr-4">
                  <span className="text-lg font-semibold text-left">{category}</span>
                  <span className="text-sm text-gray-500">
                    {categoryStandards.filter(s => responses[s.id]?.response).length} / {categoryStandards.length}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-6 mt-4">
                  {categoryStandards.map((standard) => {
                    const currentResponse = responses[standard.id]?.response;
                    return (
                    <Card key={standard.id} className={`border-l-4 ${isClosed ? 'border-l-gray-400 bg-gray-50' : 'border-l-blue-500'}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base flex items-center gap-2">
                              <span className="flex-shrink-0">
                                {currentResponse === "cumple" ? (
                                  <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                ) : currentResponse === "no_cumple" ? (
                                  <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                ) : currentResponse === "no_aplica" ? (
                                  <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth={2} /></svg>
                                ) : (
                                  <svg className="h-5 w-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth={2} /></svg>
                                )}
                              </span>
                              <span>{standard.id}. {standard.title}</span>
                            </CardTitle>
                            <CardDescription className="mt-2">{standard.description}</CardDescription>
                          </div>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-blue-600">
                                <Info className="h-4 w-4 mr-1" />
                                Ver guía
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-96">
                              <div className="space-y-3">
                                <div>
                                  <h4 className="font-semibold text-sm text-blue-600">Método de Verificación</h4>
                                  <p className="text-sm text-gray-600 mt-1">{standard.metodo_verificacion || "No especificado"}</p>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-sm text-purple-600">Criterio de Evaluación</h4>
                                  <p className="text-sm text-gray-600 mt-1">{standard.criterio || "No especificado"}</p>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Response Options */}
                        <div>
                          <Label className="mb-3 block">Nivel de Cumplimiento *</Label>
                          <div className="grid gap-2">
                            {["cumple", "no_cumple", "no_aplica"].map((option) => (
                              <label 
                                key={option}
                                className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                                  responses[standard.id]?.response === option 
                                    ? option === "cumple" ? "bg-green-50 border-green-500" 
                                      : option === "no_cumple" ? "bg-red-50 border-red-500"
                                      : "bg-gray-50 border-gray-500"
                                    : option === "cumple" ? "hover:bg-green-50" 
                                      : option === "no_cumple" ? "hover:bg-red-50"
                                      : "hover:bg-gray-50"
                                } ${isClosed ? 'pointer-events-none opacity-70' : ''}`}
                                data-testid={`response-${option}-${standard.id}`}
                              >
                                <input
                                  type="radio"
                                  name={`response-${standard.id}`}
                                  value={option}
                                  checked={responses[standard.id]?.response === option}
                                  onChange={(e) => handleResponseChange(standard.id, "response", e.target.value)}
                                  disabled={isClosed}
                                  className={`h-4 w-4 ${
                                    option === "cumple" ? "text-green-600" 
                                    : option === "no_cumple" ? "text-red-600" 
                                    : "text-gray-600"
                                  }`}
                                />
                                <div className="flex items-center gap-2 flex-1">
                                  <span className="flex-shrink-0">
                                    {option === "cumple" ? (
                                      <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    ) : option === "no_cumple" ? (
                                      <svg className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    ) : (
                                      <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth={2} /></svg>
                                    )}
                                  </span>
                                  <span className="font-medium">
                                    {option === "cumple" ? "CUMPLE" : option === "no_cumple" ? "NO CUMPLE" : "NO APLICA"}
                                  </span>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* AI Actions Bar */}
                        {!isClosed && (
                          <div className="flex flex-wrap gap-2 pt-2 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => getAIRecommendation(standard)}
                              disabled={aiLoading[standard.id] || !responses[standard.id]?.response}
                              className="text-purple-600 border-purple-200 hover:bg-purple-50"
                            >
                              {aiLoading[standard.id] ? (
                                <LoadingSpinner size="sm" className="mr-2" />
                              ) : (
                                <Sparkles className="h-4 w-4 mr-2" />
                              )}
                              Recomendación IA
                            </Button>
                            
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              ref={el => fileInputRefs.current[standard.id] = el}
                              onChange={(e) => handleImageUpload(standard.id, standard, e)}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRefs.current[standard.id]?.click()}
                              disabled={imageLoading[standard.id] || (evidenceImages[standard.id]?.length || 0) >= 2}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              {imageLoading[standard.id] ? (
                                <LoadingSpinner size="sm" className="mr-2" />
                              ) : (
                                <Camera className="h-4 w-4 mr-2" />
                              )}
                              Subir Evidencia ({(evidenceImages[standard.id]?.length || 0)}/2)
                            </Button>
                          </div>
                        )}

                        {/* AI Recommendation Display */}
                        {aiRecommendations[standard.id] && (
                          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-purple-600" />
                                <span className="font-semibold text-purple-800">Recomendación IA</span>
                              </div>
                              <div className="flex gap-2">
                                {!isClosed && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToObservations(standard.id, aiRecommendations[standard.id])}
                                    className="text-purple-600 h-8"
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copiar
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setExpandedRecommendations(prev => ({
                                    ...prev,
                                    [standard.id]: !prev[standard.id]
                                  }))}
                                  className="text-purple-600 h-8"
                                >
                                  {expandedRecommendations[standard.id] ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                            {expandedRecommendations[standard.id] && (
                              <div className="text-sm text-purple-900 whitespace-pre-wrap max-h-64 overflow-y-auto">
                                {aiRecommendations[standard.id]}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Evidence Images Display */}
                        {evidenceImages[standard.id]?.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <ImageIcon className="h-4 w-4 text-blue-600" />
                              <span className="font-semibold text-blue-800">Evidencias Fotográficas</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              {evidenceImages[standard.id].map((image, idx) => (
                                <div key={idx} className="relative group">
                                  <img
                                    src={image.url}
                                    alt={`Evidencia ${idx + 1}`}
                                    className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => openImageDialog(image)}
                                  />
                                  {!isClosed && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeImage(standard.id, idx);
                                      }}
                                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 rounded-b-lg">
                                    <p className="text-white text-xs truncate">Click para ver análisis</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Observations */}
                        <div>
                          <Label htmlFor={`obs-${standard.id}`}>Observaciones / Novedades</Label>
                          <Textarea
                            id={`obs-${standard.id}`}
                            placeholder="Describa los hallazgos, novedades o evidencias encontradas..."
                            value={responses[standard.id]?.observations || ""}
                            onChange={(e) => handleResponseChange(standard.id, "observations", e.target.value)}
                            rows={3}
                            className="mt-2"
                            disabled={isClosed}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Sticky Save Button */}
        {!isClosed && (
          <div className="sticky bottom-0 bg-white border-t shadow-lg mt-8 p-6 rounded-t-xl">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">
                  {Object.values(responses).filter(r => r.response).length} de {standards.length} estándares completados
                </p>
                <p className="text-xs text-gray-500">Los cambios se guardan manualmente</p>
              </div>
              <Button
                onClick={handleSaveProgress}
                disabled={saving}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 px-8"
              >
                {saving ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Progreso
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Image Analysis Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-blue-600" />
              Análisis de Evidencia
            </DialogTitle>
            <DialogDescription>
              Análisis de IA de la imagen subida
            </DialogDescription>
          </DialogHeader>
          {selectedImageData && (
            <div className="space-y-4">
              <img
                src={selectedImageData.url}
                alt="Evidencia"
                className="w-full max-h-64 object-contain rounded-lg border"
              />
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-blue-800">Análisis de IA</span>
                </div>
                <div className="text-sm text-blue-900 whitespace-pre-wrap">
                  {selectedImageData.analysis}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditoriaPage;
