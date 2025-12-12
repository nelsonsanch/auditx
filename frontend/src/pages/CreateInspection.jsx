import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Shield, ArrowLeft, Save, Loader2, CheckCircle2, XCircle, 
  Circle as CircleIcon, Sparkles, Camera, X, Image as ImageIcon,
  Info, Copy, ChevronDown, ChevronUp, Settings
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
import { Badge } from "@/components/ui/badge";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CreateInspection = () => {
  const [searchParams] = useSearchParams();
  const auditConfigId = searchParams.get('config');
  
  const [standards, setStandards] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [companyData, setCompanyData] = useState(null);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [auditConfig, setAuditConfig] = useState(null);
  
  // AI States
  const [aiLoading, setAiLoading] = useState({});
  const [aiRecommendations, setAiRecommendations] = useState({});
  const [expandedRecommendations, setExpandedRecommendations] = useState({});
  
  // Image States
  const [imageLoading, setImageLoading] = useState({});
  const [imageAnalyses, setImageAnalyses] = useState({});
  const [evidenceImages, setEvidenceImages] = useState({});
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImageData, setSelectedImageData] = useState(null);
  
  const fileInputRefs = useRef({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedCompany && companies.length > 0) {
      const company = companies.find(c => c.id === selectedCompany);
      setCompanyData(company);
    }
  }, [selectedCompany, companies]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [standardsRes, companiesRes] = await Promise.all([
        axios.get(`${API}/standards`, { headers }),
        axios.get(`${API}/my-companies`, { headers })
      ]);

      setStandards(standardsRes.data);
      
      const userCompanies = companiesRes.data.filter(c => c.is_active);
      setCompanies(userCompanies);
      
      if (userCompanies.length > 0) {
        setSelectedCompany(userCompanies[0].id);
        setCompanyData(userCompanies[0]);
      }

      // Load audit configuration if provided
      if (auditConfigId) {
        try {
          const configRes = await axios.get(`${API}/configuracion-auditoria/${auditConfigId}`, { headers });
          setAuditConfig(configRes.data);
          // Set company from config
          if (configRes.data.company_id) {
            setSelectedCompany(configRes.data.company_id);
          }
        } catch (err) {
          console.error("Error loading audit config:", err);
        }
      }

      const initialResponses = {};
      standardsRes.data.forEach(standard => {
        initialResponses[standard.id] = {
          response: "",
          observations: "",
          ai_recommendation: "",
          evidence_images: []
        };
      });
      setResponses(initialResponses);
    } catch (error) {
      toast.error("Error al cargar datos");
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
        audit_config_id: auditConfigId || null  // Include audit config for normative context
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

    const remainingSlots = 2 - currentImages.length;
    const filesToProcess = files.slice(0, remainingSlots);

    for (const file of filesToProcess) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error("Solo se permiten imágenes JPEG, PNG o WEBP");
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error("La imagen no puede superar 5MB");
        continue;
      }

      setImageLoading(prev => ({ ...prev, [standardId]: true }));

      try {
        const token = localStorage.getItem("token");
        
        // Upload image to Firebase
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
        const analysisPayload = {
          standard_id: standard.id,
          standard_title: standard.title,
          image_base64: base64.split(',')[1], // Remove data:image/... prefix
          company_activity: companyData?.descripcion_actividad || ""
        };

        let analysisResult = "Análisis no disponible";
        try {
          const analysisResponse = await axios.post(`${API}/ai/analyze-image`, analysisPayload, {
            headers: { Authorization: `Bearer ${token}` }
          });
          analysisResult = analysisResponse.data.analysis;
        } catch (analysisError) {
          console.error("Error in AI analysis:", analysisError);
          analysisResult = "No se pudo analizar la imagen. La imagen se guardó como evidencia.";
          toast.warning("Imagen guardada. El análisis de IA no está disponible para esta imagen.");
        }

        // Store image and analysis
        const newImage = {
          url: imageUrl,
          filename: file.name,
          analysis: analysisResult
        };

        setEvidenceImages(prev => ({
          ...prev,
          [standardId]: [...(prev[standardId] || []), newImage]
        }));

        setImageAnalyses(prev => ({
          ...prev,
          [`${standardId}_${currentImages.length}`]: analysisResult
        }));

        // Update responses with evidence
        handleResponseChange(standardId, 'evidence_images', 
          [...(responses[standardId]?.evidence_images || []), newImage]
        );

        if (analysisResult !== "No se pudo analizar la imagen. La imagen se guardó como evidencia.") {
          toast.success("Imagen subida y analizada exitosamente");
        }
      } catch (error) {
        console.error("Error uploading/analyzing image:", error);
        if (error.response?.status === 403) {
          toast.error("Error de permisos al subir imagen. Contacte al administrador.");
        } else if (error.response?.data?.detail) {
          toast.error(error.response.data.detail);
        } else {
          toast.error("Error al procesar la imagen. Intente con otra imagen.");
        }
      } finally {
        setImageLoading(prev => ({ ...prev, [standardId]: false }));
      }
    }

    // Reset input
    if (fileInputRefs.current[standardId]) {
      fileInputRefs.current[standardId].value = '';
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
    handleResponseChange(standardId, 'evidence_images',
      (responses[standardId]?.evidence_images || []).filter((_, i) => i !== index)
    );
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

  const handleSubmit = async () => {
    const unanswered = standards.filter(s => !responses[s.id]?.response);
    if (unanswered.length > 0) {
      toast.error(`Por favor, responda todos los estándares. Faltan ${unanswered.length} respuestas.`);
      return;
    }

    if (!selectedCompany) {
      toast.error("Por favor, seleccione una empresa");
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const payload = {
        company_id: selectedCompany,
        responses: Object.entries(responses).map(([standard_id, data]) => ({
          standard_id,
          response: data.response,
          observations: data.observations,
          ai_recommendation: aiRecommendations[standard_id] || "",
          evidence_images: evidenceImages[standard_id] || []
        }))
      };

      const response = await axios.post(`${API}/inspections`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(`Auditoría completada exitosamente. Puntaje: ${response.data.total_score.toFixed(1)}%`);
      navigate("/client/dashboard");
    } catch (error) {
      toast.error("Error al crear auditoría");
    } finally {
      setSubmitting(false);
    }
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
      <div className="min-h-screen flex items-center justify-center" data-testid="loading-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const groupedStandards = groupByCategory();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <nav className="bg-white shadow-md border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h1 className="text-base sm:text-xl lg:text-2xl font-bold truncate" style={{ fontFamily: 'Space Grotesk' }}>Auditoría en Curso</h1>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
              <div className="text-xs sm:text-sm text-gray-600 hidden md:block">
                {Object.values(responses).filter(r => r.response).length} / {standards.length}
              </div>
              <Button onClick={() => navigate("/client/dashboard")} variant="outline" size="sm" className="text-xs sm:text-sm">
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Volver</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Información de la Empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Empresa a Evaluar</Label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.company_name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <Progress value={getCompletionPercentage()} className="h-3" />
            <p className="text-sm text-gray-600 mt-2 text-center">
              {getCompletionPercentage().toFixed(0)}% completado
            </p>
          </CardContent>
        </Card>

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
                  {categoryStandards.map((standard) => (
                    <Card key={standard.id} className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base flex items-center gap-2">
                              {responses[standard.id]?.response === "cumple" && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                              {responses[standard.id]?.response === "no_aplica" && <CircleIcon className="h-5 w-5 text-gray-600" />}
                              {responses[standard.id]?.response === "no_cumple" && <XCircle className="h-5 w-5 text-red-600" />}
                              {standard.id}. {standard.title}
                            </CardTitle>
                            <CardDescription className="mt-2">{standard.description}</CardDescription>
                          </div>
                          {/* Info Popover for verification method */}
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
                            <label className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                              responses[standard.id]?.response === "cumple" ? "bg-green-50 border-green-500" : "hover:bg-green-50"
                            }`}>
                              <input
                                type="radio"
                                name={`response-${standard.id}`}
                                value="cumple"
                                checked={responses[standard.id]?.response === "cumple"}
                                onChange={(e) => handleResponseChange(standard.id, "response", e.target.value)}
                                className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                              />
                              <div className="flex items-center gap-2 flex-1">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <span className="font-medium">CUMPLE</span>
                                <span className="text-sm text-gray-500">(Puntaje total: 0,5 %)</span>
                              </div>
                            </label>
                            <label className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                              responses[standard.id]?.response === "no_cumple" ? "bg-red-50 border-red-500" : "hover:bg-red-50"
                            }`}>
                              <input
                                type="radio"
                                name={`response-${standard.id}`}
                                value="no_cumple"
                                checked={responses[standard.id]?.response === "no_cumple"}
                                onChange={(e) => handleResponseChange(standard.id, "response", e.target.value)}
                                className="h-4 w-4 text-red-600 border-gray-300 focus:ring-red-500"
                              />
                              <div className="flex items-center gap-2 flex-1">
                                <XCircle className="h-4 w-4 text-red-600" />
                                <span className="font-medium">NO CUMPLE</span>
                                <span className="text-sm text-gray-500">(0 puntos)</span>
                              </div>
                            </label>
                            <label className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                              responses[standard.id]?.response === "no_aplica" ? "bg-gray-50 border-gray-500" : "hover:bg-gray-50"
                            }`}>
                              <input
                                type="radio"
                                name={`response-${standard.id}`}
                                value="no_aplica"
                                checked={responses[standard.id]?.response === "no_aplica"}
                                onChange={(e) => handleResponseChange(standard.id, "response", e.target.value)}
                                className="h-4 w-4 text-gray-600 border-gray-300 focus:ring-gray-500"
                              />
                              <div className="flex items-center gap-2 flex-1">
                                <CircleIcon className="h-4 w-4 text-gray-600" />
                                <span className="font-medium">NO APLICA</span>
                                <span className="text-sm text-gray-500">(Puntaje total: 0,5 %)</span>
                              </div>
                            </label>
                          </div>
                        </div>

                        {/* AI Actions Bar */}
                        <div className="flex flex-wrap gap-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => getAIRecommendation(standard)}
                            disabled={aiLoading[standard.id] || !responses[standard.id]?.response}
                            className="text-purple-600 border-purple-200 hover:bg-purple-50"
                          >
                            {aiLoading[standard.id] ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
                            multiple
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRefs.current[standard.id]?.click()}
                            disabled={imageLoading[standard.id] || (evidenceImages[standard.id]?.length || 0) >= 2}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            {imageLoading[standard.id] ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Camera className="h-4 w-4 mr-2" />
                            )}
                            Subir Evidencia ({(evidenceImages[standard.id]?.length || 0)}/2)
                          </Button>
                        </div>

                        {/* AI Recommendation Display */}
                        {aiRecommendations[standard.id] && (
                          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-purple-600" />
                                <span className="font-semibold text-purple-800">Recomendación IA</span>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToObservations(standard.id, aiRecommendations[standard.id])}
                                  className="text-purple-600 h-8"
                                >
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copiar
                                </Button>
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
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeImage(standard.id, idx);
                                    }}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
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
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="sticky bottom-0 bg-white border-t shadow-lg mt-8 p-6 rounded-t-xl">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">
                {Object.values(responses).filter(r => r.response).length} de {standards.length} estándares completados
              </p>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={submitting || Object.values(responses).filter(r => r.response).length !== standards.length}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Inspección
                </>
              )}
            </Button>
          </div>
        </div>
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

export default CreateInspection;
