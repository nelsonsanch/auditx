import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
// Using native HTML radio inputs instead of Radix RadioGroup for React 19 compatibility
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Shield, ArrowLeft, Save, Loader2, CheckCircle2, XCircle, Circle as CircleIcon } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CreateInspection = () => {
  const [standards, setStandards] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [standardsRes, companiesRes] = await Promise.all([
        axios.get(`${API}/standards`, { headers }),
        axios.get(`${API}/my-companies`, { headers })
      ]);

      setStandards(standardsRes.data);
      
      // Filter active companies
      const userCompanies = companiesRes.data.filter(c => c.is_active);
      setCompanies(userCompanies);
      
      if (userCompanies.length > 0) {
        setSelectedCompany(userCompanies[0].id);
      }

      // Initialize responses
      const initialResponses = {};
      standardsRes.data.forEach(standard => {
        initialResponses[standard.id] = {
          response: "",
          observations: ""
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

  const handleSubmit = async () => {
    // Validate all standards have responses
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
          observations: data.observations
        }))
      };

      const response = await axios.post(`${API}/inspections`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(`Inspección creada exitosamente. Puntaje: ${response.data.total_score.toFixed(1)}%`);
      navigate("/client/dashboard");
    } catch (error) {
      toast.error("Error al crear inspección");
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
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0" data-testid="create-inspection-logo">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h1 className="text-base sm:text-xl lg:text-2xl font-bold truncate" style={{ fontFamily: 'Space Grotesk' }}>Nueva Inspección</h1>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
              <div className="text-xs sm:text-sm text-gray-600 hidden md:block" data-testid="progress-text">
                {Object.values(responses).filter(r => r.response).length} / {standards.length}
              </div>
              <Button onClick={() => navigate("/client/dashboard")} variant="outline" size="sm" data-testid="back-button" className="text-xs sm:text-sm">
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Volver</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-6" data-testid="company-selection-card">
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
                data-testid="company-select"
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

        <Card className="mb-6" data-testid="progress-card">
          <CardContent className="pt-6">
            <Progress value={getCompletionPercentage()} className="h-3" data-testid="progress-bar" />
            <p className="text-sm text-gray-600 mt-2 text-center" data-testid="completion-percentage">
              {getCompletionPercentage().toFixed(0)}% completado
            </p>
          </CardContent>
        </Card>

        <Accordion type="multiple" className="space-y-4" data-testid="standards-accordion">
          {Object.entries(groupedStandards).map(([category, categoryStandards]) => (
            <AccordionItem key={category} value={category} className="bg-white rounded-lg shadow-md border-0">
              <AccordionTrigger className="px-6 hover:bg-gray-50 rounded-t-lg" data-testid={`category-trigger-${category}`}>
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
                    <Card key={standard.id} className="border-l-4 border-l-blue-500" data-testid={`standard-card-${standard.id}`}>
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
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="mb-3 block">Nivel de Cumplimiento *</Label>
                          <div className="grid gap-2" data-testid={`radio-group-${standard.id}`}>
                            <label 
                              className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                                responses[standard.id]?.response === "cumple" ? "bg-green-50 border-green-500" : "hover:bg-green-50"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`response-${standard.id}`}
                                value="cumple"
                                checked={responses[standard.id]?.response === "cumple"}
                                onChange={(e) => handleResponseChange(standard.id, "response", e.target.value)}
                                className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                                data-testid={`radio-cumple-${standard.id}`}
                              />
                              <div className="flex items-center gap-2 flex-1">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <span className="font-medium">CUMPLE</span>
                                <span className="text-sm text-gray-500">(Puntaje total: 0,5 %)</span>
                              </div>
                            </label>
                            <label 
                              className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                                responses[standard.id]?.response === "no_cumple" ? "bg-red-50 border-red-500" : "hover:bg-red-50"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`response-${standard.id}`}
                                value="no_cumple"
                                checked={responses[standard.id]?.response === "no_cumple"}
                                onChange={(e) => handleResponseChange(standard.id, "response", e.target.value)}
                                className="h-4 w-4 text-red-600 border-gray-300 focus:ring-red-500"
                                data-testid={`radio-no-cumple-${standard.id}`}
                              />
                              <div className="flex items-center gap-2 flex-1">
                                <XCircle className="h-4 w-4 text-red-600" />
                                <span className="font-medium">NO CUMPLE</span>
                                <span className="text-sm text-gray-500">(0 puntos)</span>
                              </div>
                            </label>
                            <label 
                              className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                                responses[standard.id]?.response === "no_aplica" ? "bg-gray-50 border-gray-500" : "hover:bg-gray-50"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`response-${standard.id}`}
                                value="no_aplica"
                                checked={responses[standard.id]?.response === "no_aplica"}
                                onChange={(e) => handleResponseChange(standard.id, "response", e.target.value)}
                                className="h-4 w-4 text-gray-600 border-gray-300 focus:ring-gray-500"
                                data-testid={`radio-no-aplica-${standard.id}`}
                              />
                              <div className="flex items-center gap-2 flex-1">
                                <CircleIcon className="h-4 w-4 text-gray-600" />
                                <span className="font-medium">NO APLICA</span>
                                <span className="text-sm text-gray-500">(Puntaje total: 0,5 %)</span>
                              </div>
                            </label>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`obs-${standard.id}`}>Observaciones / Novedades</Label>
                          <Textarea
                            id={`obs-${standard.id}`}
                            placeholder="Describa los hallazgos, novedades o evidencias encontradas..."
                            value={responses[standard.id]?.observations || ""}
                            onChange={(e) => handleResponseChange(standard.id, "observations", e.target.value)}
                            rows={3}
                            className="mt-2"
                            data-testid={`observations-${standard.id}`}
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
              <p className="text-sm text-gray-600" data-testid="submit-progress-text">
                {Object.values(responses).filter(r => r.response).length} de {standards.length} estándares completados
              </p>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={submitting || Object.values(responses).filter(r => r.response).length !== standards.length}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8"
              data-testid="submit-inspection-button"
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
    </div>
  );
};

export default CreateInspection;