import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import { 
  Shield, ArrowLeft, Download, Sparkles, Edit3, Save, FileText, 
  BarChart3, CheckCircle2, XCircle, AlertTriangle, Target,
  TrendingUp, TrendingDown, Minus, Calendar, Users, FileCheck,
  FileSpreadsheet, Filter
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, Legend, PieChart, Pie
} from "recharts";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Colores para gráficos
const COLORS = {
  cumple: "#22c55e",
  noCumple: "#ef4444", 
  noAplica: "#9ca3af",
  parcial: "#f59e0b"
};

const CATEGORY_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

// Componente de tarjeta de estadística mejorada
const StatCard = ({ icon: Icon, title, value, total, color, bgColor }) => (
  <Card className={`${bgColor} border-none`}>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
          {total && <p className="text-xs text-gray-500">de {total} estándares</p>}
        </div>
        <div className={`p-3 rounded-full ${color.replace('text-', 'bg-').replace('600', '100')}`}>
          <Icon className={`h-6 w-6 ${color}`} />
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
  
  // Estados para hallazgos
  const [filter, setFilter] = useState("todos");
  const [hallazgosData, setHallazgosData] = useState({});

  useEffect(() => {
    fetchData();
  }, [auditoriaId]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const auditoriaRes = await axios.get(`${API}/inspections/${auditoriaId}`, { headers });
      setAuditoria(auditoriaRes.data);
      setCompany(auditoriaRes.data.company);

      const standardsRes = await axios.get(`${API}/standards`, { headers });
      setStandards(standardsRes.data);

      // Inicializar datos de hallazgos con responsables y fechas vacíos
      const initialHallazgos = {};
      auditoriaRes.data.responses?.forEach(resp => {
        initialHallazgos[resp.standard_id] = {
          responsable: resp.responsable || "",
          fechaSeguimiento: resp.fecha_seguimiento || ""
        };
      });
      setHallazgosData(initialHallazgos);

      if (auditoriaRes.data.audit_config_id) {
        try {
          const configRes = await axios.get(`${API}/audit-config/${auditoriaRes.data.audit_config_id}`, { headers });
          setAuditConfig(configRes.data);
        } catch (e) {}
      }

      try {
        const analysisRes = await axios.get(`${API}/analysis/${auditoriaId}`, { headers });
        setAnalysis(analysisRes.data);
        setEditedReport(analysisRes.data.report);
      } catch (e) {}
    } catch (error) {
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
      toast.success("Informe actualizado");
    } catch (error) {
      toast.error("Error al guardar");
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
      link.setAttribute('download', `informe_${company?.company_name || 'auditoria'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("PDF descargado");
    } catch (error) {
      toast.error("Error al generar PDF");
    } finally {
      setDownloading(false);
    }
  };

  // Exportar a Excel
  const handleExportExcel = () => {
    const filteredItems = getFilteredItems();
    
    const excelData = filteredItems.map(item => ({
      "ID": item.standard_id,
      "Estándar": item.title,
      "Categoría": item.category,
      "Descripción": item.description,
      "Respuesta": item.response === "cumple" ? "CUMPLE" : 
                   item.response === "no_cumple" ? "NO CUMPLE" : "NO APLICA",
      "Observaciones": item.observations || "",
      "Responsable de Ejecución": hallazgosData[item.standard_id]?.responsable || "",
      "Fecha de Seguimiento": hallazgosData[item.standard_id]?.fechaSeguimiento || ""
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hallazgos");
    
    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 8 }, { wch: 40 }, { wch: 15 }, { wch: 50 },
      { wch: 12 }, { wch: 40 }, { wch: 25 }, { wch: 18 }
    ];
    ws['!cols'] = colWidths;

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `hallazgos_${company?.company_name || 'auditoria'}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Excel descargado exitosamente");
  };

  // Calcular estadísticas
  const calculateStats = () => {
    if (!auditoria?.responses || !standards.length) return null;
    
    let cumple = 0, noCumple = 0, noAplica = 0;
    const categoryStats = {};
    
    auditoria.responses.forEach(resp => {
      const standard = standards.find(s => s.id === resp.standard_id);
      if (!standard) return;
      
      if (resp.response === "cumple") cumple++;
      else if (resp.response === "no_cumple") noCumple++;
      else if (resp.response === "no_aplica") noAplica++;
      
      if (!categoryStats[standard.category]) {
        categoryStats[standard.category] = { total: 0, achieved: 0, count: 0 };
      }
      categoryStats[standard.category].total += standard.weight;
      categoryStats[standard.category].achieved += resp.score;
      categoryStats[standard.category].count++;
    });

    return { cumple, noCumple, noAplica, categoryStats };
  };

  // Datos para gráfico radar PHVA
  const getRadarData = () => {
    const stats = calculateStats();
    if (!stats) return [];
    
    const phvaMapping = {
      "PLANEAR": ["I. RECURSOS", "II. GESTIÓN INTEGRAL DEL SG-SST"],
      "HACER": ["III. GESTIÓN DE LA SALUD", "IV. GESTIÓN DE PELIGROS Y RIESGOS", "V. GESTIÓN DE AMENAZAS"],
      "VERIFICAR": ["VI. VERIFICACIÓN DEL SG-SST"],
      "ACTUAR": ["VII. MEJORAMIENTO"]
    };

    return Object.entries(phvaMapping).map(([phase, categories]) => {
      let total = 0, achieved = 0;
      categories.forEach(cat => {
        if (stats.categoryStats[cat]) {
          total += stats.categoryStats[cat].total;
          achieved += stats.categoryStats[cat].achieved;
        }
      });
      return {
        phase,
        value: total > 0 ? Math.round((achieved / total) * 100) : 0,
        fullMark: 100
      };
    });
  };

  // Datos para gráfico de barras de distribución
  const getDistributionData = () => {
    const stats = calculateStats();
    if (!stats) return [];
    return [
      { name: "Cumple", value: stats.cumple, fill: COLORS.cumple },
      { name: "No Cumple", value: stats.noCumple, fill: COLORS.noCumple },
      { name: "No Aplica", value: stats.noAplica, fill: COLORS.noAplica }
    ];
  };

  // Datos para gráfico de categorías
  const getCategoryData = () => {
    const stats = calculateStats();
    if (!stats) return [];
    
    return Object.entries(stats.categoryStats)
      .map(([category, data]) => ({
        name: category.length > 25 ? category.substring(0, 25) + "..." : category,
        fullName: category,
        value: data.total > 0 ? Math.round((data.achieved / data.total) * 100) : 0
      }))
      .sort((a, b) => b.value - a.value);
  };

  // Obtener items filtrados para hallazgos
  const getFilteredItems = () => {
    if (!auditoria?.responses || !standards.length) return [];
    
    return auditoria.responses
      .filter(resp => {
        if (filter === "todos") return true;
        if (filter === "cumple") return resp.response === "cumple";
        if (filter === "no_cumple") return resp.response === "no_cumple";
        if (filter === "no_aplica") return resp.response === "no_aplica";
        return true;
      })
      .map(resp => {
        const standard = standards.find(s => s.id === resp.standard_id);
        return {
          ...resp,
          title: standard?.title || "",
          description: standard?.description || "",
          category: standard?.category || ""
        };
      });
  };

  // Actualizar responsable o fecha
  const updateHallazgo = (standardId, field, value) => {
    setHallazgosData(prev => ({
      ...prev,
      [standardId]: {
        ...prev[standardId],
        [field]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" className="text-blue-600" />
      </div>
    );
  }

  const stats = calculateStats();
  const totalScore = auditoria?.total_score || 0;
  const totalResponses = auditoria?.responses?.length || 0;
  const scoreColor = totalScore >= 85 ? 'text-green-600' : totalScore >= 60 ? 'text-yellow-600' : 'text-red-600';
  const scoreBadge = totalScore >= 85 ? { text: 'Excelente', bg: 'bg-green-500' } : 
                    totalScore >= 60 ? { text: 'Moderado', bg: 'bg-yellow-500' } : 
                    { text: 'Crítico', bg: 'bg-red-500' };

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
        {/* Resumen Principal - Estilo de la imagen */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Puntaje Total */}
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-blue-100 text-sm mb-2">Puntaje Total</p>
                <p className="text-5xl font-bold mb-2">{totalScore.toFixed(1)}%</p>
                <Badge className={`${scoreBadge.bg} text-white`}>{scoreBadge.text}</Badge>
              </div>
            </CardContent>
          </Card>

          <StatCard 
            icon={CheckCircle2} 
            title="Cumple" 
            value={stats?.cumple || 0}
            total={totalResponses}
            color="text-green-600"
            bgColor="bg-green-50"
          />
          
          <StatCard 
            icon={XCircle} 
            title="No Cumple" 
            value={stats?.noCumple || 0}
            total={totalResponses}
            color="text-red-600"
            bgColor="bg-red-50"
          />
          
          <StatCard 
            icon={Minus} 
            title="No Aplica" 
            value={stats?.noAplica || 0}
            total={totalResponses}
            color="text-gray-600"
            bgColor="bg-gray-50"
          />
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Tipo</p>
                  <p className="font-medium">{auditConfig.tipo_auditoria || 'SST'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fecha</p>
                  <p className="font-medium">{auditConfig.fecha_inicio || new Date(auditoria?.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Auditor Líder</p>
                  <p className="font-medium">{auditConfig.equipo_auditor?.[0]?.nombre || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Alcance</p>
                  <p className="font-medium text-sm truncate">{auditConfig.alcance || '-'}</p>
                </div>
              </div>
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
            <TabsTrigger value="hallazgos">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Hallazgos ({stats?.noCumple || 0})
            </TabsTrigger>
            <TabsTrigger value="report">
              <FileText className="mr-2 h-4 w-4" />
              Informe IA
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico Radar PHVA */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Análisis por Fases PHVA</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={getRadarData()}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="phase" tick={{ fill: '#374151', fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Radar
                        name="Cumplimiento"
                        dataKey="value"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.5}
                      />
                      <Tooltip formatter={(value) => [`${value}%`, 'Cumplimiento']} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Gráfico de Distribución */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Distribución de Respuestas</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getDistributionData()} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} />
                      <Tooltip formatter={(value) => [value, 'Cantidad']} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {getDistributionData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico de Categorías - Ancho completo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Nivel de Cumplimiento por Categoría</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getCategoryData()} layout="vertical" margin={{ left: 20, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <YAxis dataKey="name" type="category" width={200} tick={{ fontSize: 11 }} />
                    <Tooltip 
                      formatter={(value, name, props) => [`${value}%`, 'Cumplimiento']}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {getCategoryData().map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.value >= 85 ? COLORS.cumple : entry.value >= 60 ? COLORS.parcial : COLORS.noCumple} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hallazgos Tab con Filtros */}
          <TabsContent value="hallazgos" className="space-y-4">
            {/* Barra de herramientas */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Filtros */}
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Filtrar:</span>
                    <div className="flex gap-2">
                      {[
                        { value: "todos", label: "Todos", count: totalResponses },
                        { value: "cumple", label: "Cumple", count: stats?.cumple, color: "bg-green-100 text-green-800" },
                        { value: "no_cumple", label: "No Cumple", count: stats?.noCumple, color: "bg-red-100 text-red-800" },
                        { value: "no_aplica", label: "No Aplica", count: stats?.noAplica, color: "bg-gray-100 text-gray-800" }
                      ].map(f => (
                        <Button
                          key={f.value}
                          variant={filter === f.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFilter(f.value)}
                          className={filter === f.value ? "" : f.color}
                        >
                          {f.label} ({f.count || 0})
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Botón Exportar */}
                  <Button onClick={handleExportExcel} variant="outline" className="text-green-600 border-green-200 hover:bg-green-50">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Exportar a Excel
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Lista de hallazgos */}
            {getFilteredItems().length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-4" />
                  <h3 className="text-xl font-bold mb-2">Sin resultados</h3>
                  <p className="text-gray-600">No hay elementos con el filtro seleccionado.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {getFilteredItems().map((item, index) => (
                  <Card 
                    key={item.standard_id} 
                    className={`border-l-4 ${
                      item.response === 'cumple' ? 'border-l-green-500' : 
                      item.response === 'no_cumple' ? 'border-l-red-500' : 'border-l-gray-400'
                    }`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-base">
                            {item.standard_id}. {item.title}
                          </CardTitle>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="secondary">{item.category}</Badge>
                            <Badge className={
                              item.response === 'cumple' ? 'bg-green-100 text-green-800' :
                              item.response === 'no_cumple' ? 'bg-red-100 text-red-800' : 
                              'bg-gray-100 text-gray-800'
                            }>
                              {item.response === 'cumple' ? 'CUMPLE' : 
                               item.response === 'no_cumple' ? 'NO CUMPLE' : 'NO APLICA'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">{item.description}</p>
                      
                      {item.observations && (
                        <div className="bg-gray-50 p-3 rounded-lg mb-4">
                          <p className="text-sm font-medium text-gray-700">Observaciones:</p>
                          <p className="text-sm text-gray-600">{item.observations}</p>
                        </div>
                      )}
                      
                      {/* Campos editables */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1 block">
                            Responsable de Ejecución
                          </label>
                          <Input
                            placeholder="Nombre del responsable"
                            value={hallazgosData[item.standard_id]?.responsable || ""}
                            onChange={(e) => updateHallazgo(item.standard_id, 'responsable', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1 block">
                            Fecha de Seguimiento
                          </label>
                          <Input
                            type="date"
                            value={hallazgosData[item.standard_id]?.fechaSeguimiento || ""}
                            onChange={(e) => updateHallazgo(item.standard_id, 'fechaSeguimiento', e.target.value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Report Tab */}
          <TabsContent value="report" className="space-y-6">
            {!analysis ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Sparkles className="mx-auto h-16 w-16 text-purple-500 mb-4" />
                  <h3 className="text-2xl font-bold mb-2">Generar Informe con IA</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Obtén un análisis detallado con fortalezas, debilidades, planes de mejora y recomendaciones.
                  </p>
                  <Button
                    onClick={handleGenerateAnalysis}
                    disabled={analyzing}
                    className="bg-gradient-to-r from-purple-600 to-pink-600"
                    size="lg"
                  >
                    {analyzing ? (
                      <span className="flex items-center">
                        <LoadingSpinner size="sm" className="mr-2" />
                        <span>Generando...</span>
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <Sparkles className="mr-2 h-5 w-5" />
                        <span>Generar Informe</span>
                      </span>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
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
                        <Button onClick={handleDownloadPDF} disabled={downloading} size="sm" className="bg-red-600 hover:bg-red-700">
                          {downloading ? <LoadingSpinner size="sm" className="mr-2" /> : <Download className="mr-2 h-4 w-4" />}
                          PDF
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {editMode ? (
                      <Textarea value={editedReport} onChange={(e) => setEditedReport(e.target.value)} rows={25} className="font-mono text-sm" />
                    ) : (
                      <div className="prose max-w-none">
                        <ReactMarkdown>{analysis.report}</ReactMarkdown>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Firmas */}
                <Card>
                  <CardHeader>
                    <CardTitle>Firmas de Conformidad</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="text-center">
                        <div className="h-20 border-b-2 border-gray-400 mx-8 mb-2"></div>
                        <p className="font-medium">{auditConfig?.equipo_auditor?.[0]?.nombre || 'Auditor Líder'}</p>
                        <p className="text-sm text-gray-500">Auditor Líder</p>
                      </div>
                      <div className="text-center">
                        <div className="h-20 border-b-2 border-gray-400 mx-8 mb-2"></div>
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
