import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Shield, ArrowLeft, Download, Sparkles, Loader2, Edit3, Save, FileText, BarChart3 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InspectionCharts from "@/components/InspectionCharts";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ViewInspection = () => {
  const { id } = useParams();
  const [inspection, setInspection] = useState(null);
  const [standards, setStandards] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [historicalInspections, setHistoricalInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedReport, setEditedReport] = useState("");
  const [downloading, setDownloading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [inspectionRes, standardsRes, allInspectionsRes] = await Promise.all([
        axios.get(`${API}/inspections/${id}`, { headers }),
        axios.get(`${API}/standards`, { headers }),
        axios.get(`${API}/inspections`, { headers })
      ]);

      setInspection(inspectionRes.data);
      setStandards(standardsRes.data);
      
      // Filter historical inspections for the same company
      const companyInspections = allInspectionsRes.data
        .filter(insp => insp.company_id === inspectionRes.data.company_id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setHistoricalInspections(companyInspections);

      // Try to fetch existing analysis
      try {
        const analysisRes = await axios.get(`${API}/analysis/${id}`, { headers });
        setAnalysis(analysisRes.data);
        setEditedReport(analysisRes.data.report);
      } catch (error) {
        // No analysis yet
      }
    } catch (error) {
      toast.error("Error al cargar inspección");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API}/analyze-inspection`,
        { inspection_id: id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAnalysis(response.data);
      setEditedReport(response.data.report);
      toast.success("¡Análisis generado exitosamente!");
    } catch (error) {
      toast.error("Error al generar análisis");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveReport = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API}/analysis/${analysis.id}`,
        editedReport,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      setAnalysis({ ...analysis, report: editedReport });
      setEditMode(false);
      toast.success("Informe actualizado");
    } catch (error) {
      toast.error("Error al actualizar informe");
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/generate-pdf/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `informe_${inspection.company.company_name}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("PDF descargado exitosamente");
    } catch (error) {
      toast.error("Error al generar PDF");
    } finally {
      setDownloading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 85) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score) => {
    if (score >= 85) return { text: "Excelente", className: "bg-green-100 text-green-800" };
    if (score >= 60) return { text: "Moderado", className: "bg-yellow-100 text-yellow-800" };
    return { text: "Crítico", className: "bg-red-100 text-red-800" };
  };

  const getResponseBadge = (response) => {
    if (response === "cumple") return { text: "Cumple", className: "bg-green-100 text-green-800" };
    if (response === "cumple_parcial") return { text: "Cumple Parcial", className: "bg-yellow-100 text-yellow-800" };
    return { text: "No Cumple", className: "bg-red-100 text-red-800" };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="loading-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const scoreBadge = getScoreBadge(inspection.total_score);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <nav className="bg-white shadow-md border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0" data-testid="view-inspection-logo">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h1 className="text-base sm:text-xl lg:text-2xl font-bold truncate" style={{ fontFamily: 'Space Grotesk' }}>Detalle</h1>
            </div>
            <Button onClick={() => navigate("/client/dashboard")} variant="outline" size="sm" data-testid="back-button" className="text-xs sm:text-sm flex-shrink-0">
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Volver</span>
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-6 shadow-xl" data-testid="inspection-summary-card">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-4">
                {inspection.company.logo_url && (
                  <img 
                    src={`${BACKEND_URL}${inspection.company.logo_url}`}
                    alt={`${inspection.company.company_name} logo`}
                    className="w-16 h-16 object-contain rounded-lg border-2 border-gray-200"
                    data-testid="company-logo"
                  />
                )}
                <div>
                  <CardTitle className="text-3xl mb-2" style={{ fontFamily: 'Space Grotesk' }}>
                    {inspection.company.company_name}
                  </CardTitle>
                  <CardDescription className="text-base">
                    Fecha: {new Date(inspection.created_at).toLocaleDateString('es-ES', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </CardDescription>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-5xl font-bold ${getScoreColor(inspection.total_score)} mb-2`} data-testid="inspection-score">
                  {inspection.total_score.toFixed(1)}%
                </div>
                <Badge className={scoreBadge.className} data-testid="inspection-badge">{scoreBadge.text}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600">Administrador</p>
                <p className="font-medium">{inspection.company.admin_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Teléfono</p>
                <p className="font-medium">{inspection.company.phone}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600">Dirección</p>
                <p className="font-medium">{inspection.company.address}</p>
              </div>
            </div>
            <Progress value={inspection.total_score} className="h-3" data-testid="score-progress" />
          </CardContent>
        </Card>

        <Tabs defaultValue="charts" className="space-y-6" data-testid="inspection-tabs">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="charts" data-testid="charts-tab">
              <BarChart3 className="mr-2 h-4 w-4" />
              Gráficos y Análisis
            </TabsTrigger>
            <TabsTrigger value="results" data-testid="results-tab">Resultados Detallados</TabsTrigger>
            <TabsTrigger value="analysis" data-testid="analysis-tab">Informe con IA</TabsTrigger>
          </TabsList>

          <TabsContent value="charts" className="space-y-6" data-testid="charts-content">
            <InspectionCharts 
              inspection={inspection} 
              standards={standards}
              historicalData={historicalInspections}
            />
          </TabsContent>

          <TabsContent value="results" className="space-y-4" data-testid="results-content">
            {inspection.responses.map((resp) => {
              const standard = standards.find(s => s.id === resp.standard_id);
              if (!standard) return null;
              
              const responseBadge = getResponseBadge(resp.response);

              return (
                <Card key={resp.standard_id} className="border-l-4 border-l-blue-500" data-testid={`result-card-${resp.standard_id}`}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-base">
                          {standard.id}. {standard.title}
                        </CardTitle>
                        <CardDescription className="mt-1">{standard.description}</CardDescription>
                        <div className="mt-2">
                          <Badge className="text-xs" variant="secondary">{standard.category}</Badge>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <Badge className={responseBadge.className} data-testid={`response-badge-${resp.standard_id}`}>
                          {responseBadge.text}
                        </Badge>
                        <div className="text-sm text-gray-600 mt-2" data-testid={`score-${resp.standard_id}`}>
                          {resp.score.toFixed(1)} / {standard.weight} pts
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  {resp.observations && (
                    <CardContent>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <p className="text-sm font-medium text-gray-700 mb-1">Observaciones:</p>
                        <p className="text-sm text-gray-600" data-testid={`observations-${resp.standard_id}`}>{resp.observations}</p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6" data-testid="analysis-content">
            {!analysis ? (
              <Card className="text-center py-12" data-testid="no-analysis-card">
                <CardContent>
                  <Sparkles className="mx-auto h-16 w-16 text-purple-500 mb-4" />
                  <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>
                    Generar Análisis con IA
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Utilice inteligencia artificial para obtener un análisis detallado y recomendaciones personalizadas
                  </p>
                  <Button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    data-testid="generate-analysis-button"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Generando Análisis...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Generar Análisis con IA
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card data-testid="analysis-card">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        Análisis Detallado
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose max-w-none">
                      <ReactMarkdown>{analysis.analysis}</ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="report-card">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        Informe Ejecutivo
                      </CardTitle>
                      <div className="flex gap-2">
                        {editMode ? (
                          <Button onClick={handleSaveReport} size="sm" data-testid="save-report-button">
                            <Save className="mr-2 h-4 w-4" />
                            Guardar
                          </Button>
                        ) : (
                          <Button onClick={() => setEditMode(true)} size="sm" variant="outline" data-testid="edit-report-button">
                            <Edit3 className="mr-2 h-4 w-4" />
                            Editar
                          </Button>
                        )}
                        <Button
                          onClick={handleDownloadPDF}
                          disabled={downloading}
                          size="sm"
                          className="bg-red-600 hover:bg-red-700"
                          data-testid="download-pdf-button"
                        >
                          {downloading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="mr-2 h-4 w-4" />
                          )}
                          Descargar PDF
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {editMode ? (
                      <Textarea
                        value={editedReport}
                        onChange={(e) => setEditedReport(e.target.value)}
                        rows={20}
                        className="font-mono text-sm"
                        data-testid="edit-report-textarea"
                      />
                    ) : (
                      <div className="prose max-w-none" data-testid="report-content">
                        <ReactMarkdown>{analysis.report}</ReactMarkdown>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ViewInspection;