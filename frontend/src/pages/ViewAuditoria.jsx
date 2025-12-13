import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import { 
  Shield, ArrowLeft, Download, Sparkles, Edit3, Save, FileText, 
  BarChart3, CheckCircle2, XCircle, AlertTriangle, Target,
  TrendingUp, TrendingDown, Minus, Calendar, Users, FileCheck
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Componente de gráfico de barras simple
const BarChart = ({ data, title }) => {
  const maxValue = Math.max(...data.map(d => d.value), 100);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium truncate max-w-[200px]">{item.label}</span>
                <span className={`font-bold ${
                  item.value >= 85 ? 'text-green-600' : 
                  item.value >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {item.value.toFixed(1)}%
                </span>
              </div>
              <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    item.value >= 85 ? 'bg-green-500' : 
                    item.value >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Componente de tarjeta de estadística
const StatCard = ({ icon: Icon, title, value, subtitle, color }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
    </CardContent>
  </Card>
);

const ViewAuditoria = () => {
  const { auditoriaId } = useParams();
  const navigate = useNavigate();
  
  const [auditoria, setAuditoria] = useState(null);
  const [standards, setStandards] = useState([]);
  const [company, setCompany] = useState(null);
  const [auditConfig, setAuditConfig] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedReport, setEditedReport] = useState("");

  useEffect(() => {
    fetchData();
  }, [auditoriaId]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Obtener auditoría
      const auditoriaRes = await axios.get(`${API}/inspections/${auditoriaId}`, { headers });
      setAuditoria(auditoriaRes.data);
      setCompany(auditoriaRes.data.company);

      // Obtener estándares
      const standardsRes = await axios.get(`${API}/standards`, { headers });
      setStandards(standardsRes.data);

      // Obtener configuración de auditoría si existe
      if (auditoriaRes.data.audit_config_id) {
        try {
          const configRes = await axios.get(`${API}/audit-config/${auditoriaRes.data.audit_config_id}`, { headers });
          setAuditConfig(configRes.data);
        } catch (e) {
          console.log("No audit config found");
        }
      }

      // Obtener análisis existente si hay
      try {
        const analysisRes = await axios.get(`${API}/analysis/${auditoriaId}`, { headers });
        setAnalysis(analysisRes.data);
        setEditedReport(analysisRes.data.report);
      } catch (e) {
        console.log("No analysis yet");
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar la auditoría");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAnalysis = async () => {
    setAnalyzing(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API}/analyze-inspection`,
        { inspection_id: auditoriaId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAnalysis(response.data);
      setEditedReport(response.data.report);
      toast.success("¡Informe generado exitosamente!");
    } catch (error) {
      console.error("Error generating analysis:", error);
      toast.error("Error al generar el informe");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveReport = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API}/analysis/${analysis.id}`,
        { report: editedReport },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAnalysis({ ...analysis, report: editedReport });
      setEditMode(false);
      toast.success("Informe actualizado exitosamente");
    } catch (error) {
      toast.error("Error al guardar el informe");
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/generate-pdf/${auditoriaId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `informe_auditoria_${company?.company_name || 'empresa'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("PDF descargado exitosamente");
    } catch (error) {
      toast.error("Error al generar el PDF");
    } finally {
      setDownloading(false);
    }
  };

  // Calcular estadísticas por categoría
  const calculateCategoryStats = () => {
    if (!auditoria?.responses || !standards.length) return [];
    
    const categories = {};
    
    auditoria.responses.forEach(resp => {
      const standard = standards.find(s => s.id === resp.standard_id);
      if (!standard) return;
      
      if (!categories[standard.category]) {
        categories[standard.category] = { total: 0, achieved: 0, count: 0 };
      }
      
      categories[standard.category].total += standard.weight;
      categories[standard.category].achieved += resp.score;
      categories[standard.category].count++;
    });

    return Object.entries(categories).map(([category, stats]) => ({
      label: category,
      value: stats.total > 0 ? (stats.achieved / stats.total) * 100 : 0,
      count: stats.count
    }));
  };

  // Calcular resumen de respuestas
  const calculateResponseSummary = () => {
    if (!auditoria?.responses) return { cumple: 0, noCumple: 0, noAplica: 0 };
    
    return auditoria.responses.reduce((acc, resp) => {
      if (resp.response === 'cumple') acc.cumple++;
      else if (resp.response === 'no_cumple') acc.noCumple++;
      else if (resp.response === 'no_aplica') acc.noAplica++;
      return acc;
    }, { cumple: 0, noCumple: 0, noAplica: 0 });
  };

  // Obtener hallazgos (no conformidades)
  const getFindings = () => {
    if (!auditoria?.responses || !standards.length) return [];
    
    return auditoria.responses
      .filter(resp => resp.response === 'no_cumple')
      .map(resp => {
        const standard = standards.find(s => s.id === resp.standard_id);
        return {
          id: resp.standard_id,
          title: standard?.title || 'Estándar',
          description: standard?.description || '',
          category: standard?.category || '',
          observations: resp.observations || ''
        };
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" className="text-blue-600" />
      </div>
    );
  }

  const categoryStats = calculateCategoryStats();
  const responseSummary = calculateResponseSummary();
  const findings = getFindings();
  const totalScore = auditoria?.total_score || 0;
  const scoreColor = totalScore >= 85 ? 'text-green-600' : totalScore >= 60 ? 'text-yellow-600' : 'text-red-600';
  const scoreBg = totalScore >= 85 ? 'bg-green-500' : totalScore >= 60 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Navbar */}
      <nav className="bg-white shadow-md border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              {company?.logo_url ? (
                <img src={company.logo_url} alt="Logo" className="w-10 h-10 rounded-xl object-cover" />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>
                  Resultado de Auditoría
                </h1>
                <p className="text-sm text-gray-500">{company?.company_name}</p>
              </div>
            </div>
            <Button onClick={() => navigate("/client/dashboard")} variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Resumen Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Puntaje Total */}
          <Card className="lg:col-span-1">
            <CardContent className="pt-6 text-center">
              <div className={`text-6xl font-bold ${scoreColor} mb-2`}>
                {totalScore.toFixed(1)}%
              </div>
              <Badge className={`${scoreBg} text-white px-4 py-1 text-lg`}>
                {totalScore >= 85 ? 'Excelente' : totalScore >= 60 ? 'Moderado' : 'Crítico'}
              </Badge>
              <Progress value={totalScore} className="mt-4 h-3" />
              <p className="text-sm text-gray-500 mt-4">
                Fecha: {new Date(auditoria?.created_at).toLocaleDateString('es-ES')}
              </p>
            </CardContent>
          </Card>

          {/* Estadísticas Rápidas */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard 
              icon={CheckCircle2} 
              title="Cumple" 
              value={responseSummary.cumple}
              color="bg-green-500"
            />
            <StatCard 
              icon={XCircle} 
              title="No Cumple" 
              value={responseSummary.noCumple}
              color="bg-red-500"
            />
            <StatCard 
              icon={Minus} 
              title="No Aplica" 
              value={responseSummary.noAplica}
              color="bg-gray-500"
            />
            <StatCard 
              icon={AlertTriangle} 
              title="Hallazgos" 
              value={findings.length}
              subtitle="No conformidades"
              color="bg-orange-500"
            />
          </div>
        </div>

        {/* Configuración de Auditoría */}
        {auditConfig && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-blue-600" />
                Configuración de la Auditoría
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Tipo</p>
                  <p className="font-medium">{auditConfig.tipo_auditoria || 'SST'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fecha Inicio</p>
                  <p className="font-medium">{auditConfig.fecha_inicio || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Auditor Líder</p>
                  <p className="font-medium">{auditConfig.equipo_auditor?.[0]?.nombre || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Alcance</p>
                  <p className="font-medium text-sm">{auditConfig.alcance || '-'}</p>
                </div>
              </div>
              {auditConfig.objetivos && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500">Objetivos</p>
                  <p className="text-sm">{auditConfig.objetivos}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">
              <BarChart3 className="mr-2 h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="findings">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Hallazgos
            </TabsTrigger>
            <TabsTrigger value="report">
              <FileText className="mr-2 h-4 w-4" />
              Informe IA
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BarChart 
                data={categoryStats} 
                title="Cumplimiento por Categoría (Ciclo PHVA)"
              />
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Distribución de Respuestas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                        <span>Cumple</span>
                      </div>
                      <span className="font-bold">{responseSummary.cumple}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-500 rounded"></div>
                        <span>No Cumple</span>
                      </div>
                      <span className="font-bold">{responseSummary.noCumple}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-400 rounded"></div>
                        <span>No Aplica</span>
                      </div>
                      <span className="font-bold">{responseSummary.noAplica}</span>
                    </div>
                  </div>
                  
                  {/* Simple pie chart visualization */}
                  <div className="mt-6 flex justify-center">
                    <div className="relative w-32 h-32">
                      <svg viewBox="0 0 36 36" className="w-full h-full">
                        {/* Background circle */}
                        <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="3"/>
                        
                        {/* Cumple segment */}
                        <circle 
                          cx="18" cy="18" r="16" fill="none" 
                          stroke="#22c55e" strokeWidth="3"
                          strokeDasharray={`${(responseSummary.cumple / (responseSummary.cumple + responseSummary.noCumple + responseSummary.noAplica || 1)) * 100} 100`}
                          strokeLinecap="round"
                          transform="rotate(-90 18 18)"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold">{auditoria?.responses?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-center text-sm text-gray-500 mt-2">Total de estándares evaluados</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Findings Tab */}
          <TabsContent value="findings" className="space-y-4">
            {findings.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-4" />
                  <h3 className="text-xl font-bold mb-2">¡Excelente!</h3>
                  <p className="text-gray-600">No se encontraron no conformidades en esta auditoría.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <h3 className="text-lg font-semibold">
                    {findings.length} No Conformidad{findings.length > 1 ? 'es' : ''} Identificada{findings.length > 1 ? 's' : ''}
                  </h3>
                </div>
                {findings.map((finding, index) => (
                  <Card key={finding.id} className="border-l-4 border-l-red-500">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">
                            {index + 1}. {finding.title}
                          </CardTitle>
                          <Badge variant="secondary" className="mt-2">{finding.category}</Badge>
                        </div>
                        <Badge variant="destructive">No Cumple</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-2">{finding.description}</p>
                      {finding.observations && (
                        <div className="bg-red-50 p-3 rounded-lg mt-2">
                          <p className="text-sm font-medium text-red-800">Observaciones:</p>
                          <p className="text-sm text-red-700">{finding.observations}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </TabsContent>

          {/* Report Tab */}
          <TabsContent value="report" className="space-y-6">
            {!analysis ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Sparkles className="mx-auto h-16 w-16 text-purple-500 mb-4" />
                  <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>
                    Generar Informe con IA
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Utilice inteligencia artificial para obtener un análisis detallado con fortalezas, 
                    debilidades, planes de mejora y recomendaciones personalizadas.
                  </p>
                  <Button
                    onClick={handleGenerateAnalysis}
                    disabled={analyzing}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    size="lg"
                  >
                    {analyzing ? (
                      <span className="flex items-center">
                        <LoadingSpinner size="sm" className="mr-2" />
                        <span>Generando Informe...</span>
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <Sparkles className="mr-2 h-5 w-5" />
                        <span>Generar Informe con IA</span>
                      </span>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Análisis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                      Análisis de la Auditoría
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose max-w-none">
                      <ReactMarkdown>{analysis.analysis}</ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>

                {/* Informe Ejecutivo */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        Informe Ejecutivo
                      </CardTitle>
                      <div className="flex gap-2">
                        {editMode ? (
                          <Button onClick={handleSaveReport} size="sm">
                            <Save className="mr-2 h-4 w-4" />
                            Guardar
                          </Button>
                        ) : (
                          <Button onClick={() => setEditMode(true)} size="sm" variant="outline">
                            <Edit3 className="mr-2 h-4 w-4" />
                            Editar
                          </Button>
                        )}
                        <Button
                          onClick={handleDownloadPDF}
                          disabled={downloading}
                          size="sm"
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {downloading ? (
                            <LoadingSpinner size="sm" className="mr-2" />
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
                        rows={25}
                        className="font-mono text-sm"
                      />
                    ) : (
                      <div className="prose max-w-none">
                        <ReactMarkdown>{analysis.report}</ReactMarkdown>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Sección de Firma */}
                <Card>
                  <CardHeader>
                    <CardTitle>Firmas de Conformidad</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="text-center border-t-2 border-gray-300 pt-4">
                        <div className="h-16 mb-2"></div>
                        <div className="border-b-2 border-gray-400 mx-8 mb-2"></div>
                        <p className="font-medium">{auditConfig?.equipo_auditor?.[0]?.nombre || 'Auditor Líder'}</p>
                        <p className="text-sm text-gray-500">Auditor Líder</p>
                      </div>
                      <div className="text-center border-t-2 border-gray-300 pt-4">
                        <div className="h-16 mb-2"></div>
                        <div className="border-b-2 border-gray-400 mx-8 mb-2"></div>
                        <p className="font-medium">{company?.representante_legal || company?.admin_name}</p>
                        <p className="text-sm text-gray-500">Representante de la Organización</p>
                      </div>
                    </div>
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

export default ViewAuditoria;
