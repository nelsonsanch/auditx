import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Plus, LogOut, FileText, Calendar, TrendingUp, Eye, Building2, MapPin, Users, Edit, X, Loader2, Settings, BookOpen } from "lucide-react";
import ConfiguracionAuditoriaWizard from "@/components/ConfiguracionAuditoriaWizard";
import NormasEspecificasManager from "@/components/NormasEspecificasManager";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ClientDashboard = () => {
  const [inspections, setInspections] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("inspections");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [editSedesAdicionales, setEditSedesAdicionales] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [showAuditWizard, setShowAuditWizard] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      
      // Fetch inspections
      const inspectionsResponse = await axios.get(`${API}/inspections`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInspections(inspectionsResponse.data);
      
      // Fetch company data
      const companiesResponse = await axios.get(`${API}/my-companies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (companiesResponse.data && companiesResponse.data.length > 0) {
        setCompany(companiesResponse.data[0]);
      }
    } catch (error) {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const openEditDialog = () => {
    if (company) {
      setEditFormData({
        company_name: company.company_name || "",
        admin_name: company.admin_name || "",
        address: company.address || "",
        phone: company.phone || "",
        nit: company.nit || "",
        representante_legal: company.representante_legal || "",
        arl_afiliada: company.arl_afiliada || "",
        nivel_riesgo: company.nivel_riesgo || "",
        codigo_ciiu: company.codigo_ciiu || "",
        subdivision_ciiu: company.subdivision_ciiu || "",
        descripcion_actividad: company.descripcion_actividad || "",
        numero_trabajadores: company.numero_trabajadores || 0,
        numero_sedes: company.numero_sedes || 1,
        logo_url: company.logo_url || ""
      });
      setEditSedesAdicionales(company.sedes_adicionales || []);
      setLogoPreview(company.logo_url || null);
      setEditDialogOpen(true);
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten archivos de imagen");
      return;
    }

    // Create preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);

    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("token");
      const response = await axios.post(`${API}/upload-logo`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`
        }
      });

      setEditFormData(prev => ({ ...prev, logo_url: response.data.logo_url }));
      setLogoPreview(response.data.logo_url);
      toast.success("Logo subido exitosamente");
    } catch (error) {
      toast.error("Error al subir logo");
      // Revert preview on error
      setLogoPreview(editFormData.logo_url || null);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleAddEditSede = () => {
    setEditSedesAdicionales([...editSedesAdicionales, {
      direccion: "",
      numero_trabajadores: "",
      nivel_riesgo: "",
      codigo_ciiu: "",
      subdivision_ciiu: "",
      descripcion_actividad: ""
    }]);
  };

  const handleRemoveEditSede = (index) => {
    setEditSedesAdicionales(editSedesAdicionales.filter((_, i) => i !== index));
  };

  const handleEditSedeChange = (index, field, value) => {
    const newSedes = [...editSedesAdicionales];
    newSedes[index][field] = value;
    setEditSedesAdicionales(newSedes);
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      
      // Prepare data with sedes adicionales
      const dataToSend = {
        ...editFormData,
        numero_trabajadores: parseInt(editFormData.numero_trabajadores) || 0,
        numero_sedes: parseInt(editFormData.numero_sedes) || 1,
        sedes_adicionales: editSedesAdicionales.map(sede => ({
          ...sede,
          numero_trabajadores: parseInt(sede.numero_trabajadores) || 0
        }))
      };
      
      await axios.put(
        `${API}/company/${company.id}`,
        dataToSend,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success("Información actualizada exitosamente");
      setEditDialogOpen(false);
      
      // Refresh data
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al actualizar información");
    } finally {
      setSaving(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 85) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score) => {
    if (score >= 85) return <Badge className="bg-green-100 text-green-800">Excelente</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-100 text-yellow-800">Moderado</Badge>;
    return <Badge className="bg-red-100 text-red-800">Crítico</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <nav className="bg-white shadow-md border-b">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              {company?.logo_url ? (
                <img 
                  src={company.logo_url} 
                  alt="Logo empresa" 
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-cover flex-shrink-0" 
                  data-testid="company-logo"
                />
              ) : (
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0" data-testid="client-logo">
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              )}
              <h1 className="text-base sm:text-xl lg:text-2xl font-bold truncate" style={{ fontFamily: 'Space Grotesk' }}>
                {company?.company_name || "Panel Cliente"}
              </h1>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
              <Button 
                onClick={() => setShowAuditWizard(true)} 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-xs sm:text-sm"
                size="sm"
                data-testid="create-inspection-button"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Nueva Auditoría</span>
              </Button>
              <Button onClick={handleLogout} variant="outline" size="sm" data-testid="logout-button" className="text-xs sm:text-sm">
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200" data-testid="total-inspections-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-800 flex items-center">
                <FileText className="mr-2 h-4 w-4" />
                Total Inspecciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900" data-testid="total-inspections">{inspections.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200" data-testid="average-score-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-800 flex items-center">
                <TrendingUp className="mr-2 h-4 w-4" />
                Promedio de Cumplimiento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900" data-testid="average-score">
                {inspections.length > 0
                  ? (inspections.reduce((acc, i) => acc + i.total_score, 0) / inspections.length).toFixed(1)
                  : 0}%
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200" data-testid="last-inspection-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-purple-800 flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                Última Inspección
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-purple-900" data-testid="last-inspection-date">
                {inspections.length > 0
                  ? new Date(inspections[0].created_at).toLocaleDateString('es-ES')
                  : "N/A"}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="inspections" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Inspecciones
            </TabsTrigger>
            <TabsTrigger value="documentos" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Documentos Internos
            </TabsTrigger>
            <TabsTrigger value="caracterizacion" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Caracterización
            </TabsTrigger>
          </TabsList>

          {/* TAB: INSPECCIONES */}
          <TabsContent value="inspections">
            <Card className="shadow-xl" data-testid="inspections-table-card">
              <CardHeader>
                <CardTitle className="text-2xl" style={{ fontFamily: 'Space Grotesk' }}>Mis Inspecciones</CardTitle>
                <CardDescription>Historial de inspecciones de seguridad y salud en el trabajo</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8" data-testid="loading-indicator">Cargando...</div>
                ) : inspections.length === 0 ? (
                  <div className="text-center py-12" data-testid="no-inspections">
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-4">Aún no has creado ninguna inspección</p>
                    <Button 
                      onClick={() => navigate("/client/inspection/create")}
                      className="bg-gradient-to-r from-blue-600 to-purple-600"
                      data-testid="create-first-inspection-button"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Crear Primera Inspección
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Puntaje</TableHead>
                        <TableHead>Nivel</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inspections.map((inspection) => (
                        <TableRow key={inspection.id} data-testid={`inspection-row-${inspection.id}`}>
                          <TableCell className="font-medium">{inspection.company_name}</TableCell>
                          <TableCell>{new Date(inspection.created_at).toLocaleDateString('es-ES')}</TableCell>
                          <TableCell>
                            <span className={`text-2xl font-bold ${getScoreColor(inspection.total_score)}`} data-testid={`score-${inspection.id}`}>
                              {inspection.total_score.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell>{getScoreBadge(inspection.total_score)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              onClick={() => navigate(`/client/inspection/${inspection.id}`)}
                              size="sm"
                              variant="outline"
                              data-testid={`view-button-${inspection.id}`}
                            >
                              <Eye className="mr-1 h-4 w-4" />
                              Ver Detalle
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: DOCUMENTOS INTERNOS */}
          <TabsContent value="documentos">
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
                  <BookOpen className="h-6 w-6 text-blue-600" />
                  Documentos Internos
                </CardTitle>
                <CardDescription>
                  Políticas, reglamentos, manuales e instructivos de su organización que serán considerados en las auditorías
                </CardDescription>
              </CardHeader>
              <CardContent>
                {company && <NormasEspecificasManager companyId={company.id} />}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: CARACTERIZACIÓN */}
          <TabsContent value="caracterizacion">
            <Card className="shadow-xl">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
                      <Building2 className="h-6 w-6" />
                      Caracterización de la Empresa
                    </CardTitle>
                    <CardDescription>Información detallada de la empresa según Resolución 0312 de 2019</CardDescription>
                  </div>
                  {company && (
                    <Button
                      onClick={openEditDialog}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Editar Información
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Cargando...</div>
                ) : !company ? (
                  <div className="text-center py-8 text-gray-600">
                    No se encontró información de la empresa
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Información General */}
                    <div className="border-b pb-4">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-blue-600" />
                        Información General
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Nombre de la Empresa</p>
                          <p className="font-semibold">{company.company_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Representante Legal</p>
                          <p className="font-semibold">{company.representante_legal || "No especificado"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">NIT</p>
                          <p className="font-semibold">{company.nit || "No especificado"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">ARL Afiliada</p>
                          <p className="font-semibold">{company.arl_afiliada || "No especificado"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Dirección</p>
                          <p className="font-semibold">{company.address}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Teléfono</p>
                          <p className="font-semibold">{company.phone}</p>
                        </div>
                      </div>
                    </div>

                    {/* Actividad Económica */}
                    <div className="border-b pb-4">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        Actividad Económica (Decreto 768/2022)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Código Completo</p>
                          <p className="font-semibold text-lg">
                            {company.nivel_riesgo || "?"}-{company.codigo_ciiu || "????"}-{company.subdivision_ciiu || "??"}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Nivel de Riesgo: {company.nivel_riesgo || "No especificado"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Descripción</p>
                          <p className="font-semibold">{company.descripcion_actividad || "Según definición establecida en el CIIU"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Información Laboral */}
                    <div className="border-b pb-4">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Users className="h-5 w-5 text-purple-600" />
                        Información Laboral
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Número de Trabajadores (Sede Principal)</p>
                          <p className="font-semibold text-2xl">{company.numero_trabajadores || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Número Total de Sedes</p>
                          <p className="font-semibold text-2xl">{company.numero_sedes || 1}</p>
                        </div>
                      </div>
                    </div>

                    {/* Sedes Adicionales */}
                    {company.sedes_adicionales && company.sedes_adicionales.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-red-600" />
                          Sedes Adicionales
                        </h3>
                        <div className="space-y-4">
                          {company.sedes_adicionales.map((sede, index) => (
                            <Card key={index} className="border-l-4 border-blue-500">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base">Sede {index + 2}</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div>
                                    <p className="text-sm text-gray-600">Dirección</p>
                                    <p className="font-semibold">{sede.direccion}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-600">Número de Trabajadores</p>
                                    <p className="font-semibold">{sede.numero_trabajadores}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-600">Código de Actividad</p>
                                    <p className="font-semibold">
                                      {sede.nivel_riesgo}-{sede.codigo_ciiu}-{sede.subdivision_ciiu}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-600">Descripción Actividad</p>
                                    <p className="font-semibold text-sm">{sede.descripcion_actividad}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* DIALOG: EDITAR CARACTERIZACIÓN */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Editar Caracterización de la Empresa
            </DialogTitle>
            <DialogDescription>
              Actualice la información de su empresa según Resolución 0312 de 2019
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Logo de la Empresa */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Logo de la Empresa</h3>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {logoPreview ? (
                    <div className="relative">
                      <img 
                        src={logoPreview} 
                        alt="Logo preview" 
                        className="w-24 h-24 rounded-lg object-cover border-2 border-gray-300"
                      />
                      {uploadingLogo && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                          <Loader2 className="h-6 w-6 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                      <Building2 className="h-10 w-10 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <Label htmlFor="edit_logo" className="text-sm font-medium">
                    {logoPreview ? "Cambiar Logo" : "Subir Logo"}
                  </Label>
                  <Input
                    id="edit_logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {uploadingLogo ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Subiendo logo...
                      </span>
                    ) : (
                      "Formatos: JPG, PNG. Tamaño máximo: 5MB"
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Información General */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Información General</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_company_name">Nombre de la Empresa *</Label>
                  <Input
                    id="edit_company_name"
                    name="company_name"
                    value={editFormData.company_name || ""}
                    onChange={handleEditChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_admin_name">Administrador *</Label>
                  <Input
                    id="edit_admin_name"
                    name="admin_name"
                    value={editFormData.admin_name || ""}
                    onChange={handleEditChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_nit">NIT *</Label>
                  <Input
                    id="edit_nit"
                    name="nit"
                    value={editFormData.nit || ""}
                    onChange={handleEditChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_representante_legal">Representante Legal *</Label>
                  <Input
                    id="edit_representante_legal"
                    name="representante_legal"
                    value={editFormData.representante_legal || ""}
                    onChange={handleEditChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_arl_afiliada">ARL Afiliada *</Label>
                  <Input
                    id="edit_arl_afiliada"
                    name="arl_afiliada"
                    value={editFormData.arl_afiliada || ""}
                    onChange={handleEditChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_phone">Teléfono *</Label>
                  <Input
                    id="edit_phone"
                    name="phone"
                    value={editFormData.phone || ""}
                    onChange={handleEditChange}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit_address">Dirección *</Label>
                  <Input
                    id="edit_address"
                    name="address"
                    value={editFormData.address || ""}
                    onChange={handleEditChange}
                  />
                </div>
              </div>
            </div>

            {/* Actividad Económica */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Actividad Económica</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_nivel_riesgo">Nivel de Riesgo (1-5)</Label>
                  <Input
                    id="edit_nivel_riesgo"
                    name="nivel_riesgo"
                    maxLength="1"
                    value={editFormData.nivel_riesgo || ""}
                    onChange={handleEditChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_codigo_ciiu">Código CIIU (4 dígitos)</Label>
                  <Input
                    id="edit_codigo_ciiu"
                    name="codigo_ciiu"
                    maxLength="4"
                    value={editFormData.codigo_ciiu || ""}
                    onChange={handleEditChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_subdivision_ciiu">Subdivisión (2 dígitos)</Label>
                  <Input
                    id="edit_subdivision_ciiu"
                    name="subdivision_ciiu"
                    maxLength="2"
                    value={editFormData.subdivision_ciiu || ""}
                    onChange={handleEditChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_descripcion_actividad">Descripción de la Actividad</Label>
                <textarea
                  id="edit_descripcion_actividad"
                  name="descripcion_actividad"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={editFormData.descripcion_actividad || ""}
                  onChange={handleEditChange}
                  rows="3"
                />
                <p className="text-xs text-gray-500">Esta información será usada por la IA para generar informes personalizados</p>
              </div>
            </div>

            {/* Información Laboral */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Información Laboral</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_numero_trabajadores">Número de Trabajadores (Sede Principal)</Label>
                  <Input
                    id="edit_numero_trabajadores"
                    name="numero_trabajadores"
                    type="number"
                    min="0"
                    value={editFormData.numero_trabajadores || 0}
                    onChange={handleEditChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_numero_sedes">Número de Sedes</Label>
                  <Input
                    id="edit_numero_sedes"
                    name="numero_sedes"
                    type="number"
                    min="1"
                    value={editFormData.numero_sedes || 1}
                    onChange={(e) => {
                      handleEditChange(e);
                      const numSedes = parseInt(e.target.value) || 1;
                      if (numSedes === 1) {
                        setEditSedesAdicionales([]);
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Sedes Adicionales */}
            {parseInt(editFormData.numero_sedes) > 1 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h3 className="text-lg font-semibold">Sedes Adicionales</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddEditSede}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar Sede
                  </Button>
                </div>
                
                {editSedesAdicionales.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No hay sedes adicionales. Haz clic en "Agregar Sede" para añadir una.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {editSedesAdicionales.map((sede, index) => (
                      <Card key={index} className="border-l-4 border-blue-500 relative">
                        <button
                          type="button"
                          onClick={() => handleRemoveEditSede(index)}
                          className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Sede {index + 2}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div>
                              <Label className="text-xs">Dirección *</Label>
                              <Input
                                type="text"
                                placeholder="Dirección de la sede"
                                value={sede.direccion}
                                onChange={(e) => handleEditSedeChange(index, 'direccion', e.target.value)}
                                required
                              />
                            </div>
                            
                            <div>
                              <Label className="text-xs">Número de Trabajadores *</Label>
                              <Input
                                type="number"
                                min="1"
                                placeholder="20"
                                value={sede.numero_trabajadores}
                                onChange={(e) => handleEditSedeChange(index, 'numero_trabajadores', e.target.value)}
                                required
                              />
                            </div>
                            
                            <div>
                              <Label className="text-xs">Código de Actividad Económica *</Label>
                              <div className="grid grid-cols-3 gap-2">
                                <Input
                                  type="text"
                                  maxLength="1"
                                  pattern="[1-5]"
                                  placeholder="Riesgo"
                                  value={sede.nivel_riesgo}
                                  onChange={(e) => handleEditSedeChange(index, 'nivel_riesgo', e.target.value)}
                                  required
                                />
                                <Input
                                  type="text"
                                  maxLength="4"
                                  pattern="[0-9]{4}"
                                  placeholder="CIIU"
                                  value={sede.codigo_ciiu}
                                  onChange={(e) => handleEditSedeChange(index, 'codigo_ciiu', e.target.value)}
                                  required
                                />
                                <Input
                                  type="text"
                                  maxLength="2"
                                  pattern="[0-9]{2}"
                                  placeholder="Subdiv"
                                  value={sede.subdivision_ciiu}
                                  onChange={(e) => handleEditSedeChange(index, 'subdivision_ciiu', e.target.value)}
                                  required
                                />
                              </div>
                            </div>
                            
                            <div>
                              <Label className="text-xs">Descripción de la Actividad *</Label>
                              <textarea
                                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                placeholder="Según definición establecida en el CIIU"
                                value={sede.descripcion_actividad}
                                onChange={(e) => handleEditSedeChange(index, 'descripcion_actividad', e.target.value)}
                                required
                                rows="2"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveChanges}
                disabled={saving}
                className="bg-gradient-to-r from-blue-600 to-purple-600"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Cambios"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para Wizard de Configuración de Auditoría */}
      <Dialog open={showAuditWizard} onOpenChange={setShowAuditWizard}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              Configurar Nueva Auditoría
            </DialogTitle>
            <DialogDescription>
              Configure los parámetros de la auditoría antes de iniciar
            </DialogDescription>
          </DialogHeader>
          {company && (
            <ConfiguracionAuditoriaWizard
              companyId={company.id}
              onComplete={(configId) => {
                setShowAuditWizard(false);
                toast.success("Configuración guardada. Iniciando auditoría...");
                // Navegar a crear inspección con el config_id
                navigate(`/client/inspection/create?config=${configId}`);
              }}
              onCancel={() => setShowAuditWizard(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientDashboard;