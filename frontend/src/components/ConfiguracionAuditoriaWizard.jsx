import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import { 
  Settings, Plus, Trash2, Save, Calendar, Users, 
  Target, BookOpen, ArrowRight, ArrowLeft, Check, FileText
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TIPOS_AUDITORIA = [
  { value: "SST", label: "Seguridad y Salud en el Trabajo" },
  { value: "Calidad", label: "Gestión de Calidad" },
  { value: "Talento_Humano", label: "Talento Humano" },
  { value: "Medio_Ambiente", label: "Medio Ambiente" },
  { value: "Integrada", label: "Auditoría Integrada" },
  { value: "Otro", label: "Otro / Personalizada" },
];

const ROLES_AUDITOR = [
  "Auditor Líder",
  "Auditor",
  "Auditor en Formación",
  "Observador",
  "Experto Técnico"
];

const ConfiguracionAuditoriaWizard = ({ companyId, onComplete, onCancel }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Data for selection
  const [normasGenerales, setNormasGenerales] = useState([]);
  const [normasEspecificas, setNormasEspecificas] = useState([]);
  
  // Form data
  const [config, setConfig] = useState({
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: "",
    tipo_auditoria: "SST",
    alcance: "",
    objetivos: "",
    areas_proceso: [],
    criterios_adicionales: "",
    equipo_auditor: [{ nombre: "", identificacion: "", rol: "Auditor Líder", cargo: "", email: "" }],
    equipo_auditado: [{ nombre: "", identificacion: "", rol: "Auditado", cargo: "", email: "" }],
    normas_generales_ids: [],
    normas_especificas_ids: []
  });

  const [newArea, setNewArea] = useState("");

  useEffect(() => {
    fetchNormas();
  }, [companyId]);

  const fetchNormas = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [generalesRes, especificasRes] = await Promise.all([
        axios.get(`${API}/normas-generales`, { headers }),
        axios.get(`${API}/normas-especificas/${companyId}`, { headers })
      ]);

      setNormasGenerales(generalesRes.data);
      setNormasEspecificas(especificasRes.data);
    } catch (error) {
      console.error("Error fetching normas:", error);
    } finally {
      setLoading(false);
    }
  };

  const addTeamMember = (team) => {
    const newMember = { nombre: "", identificacion: "", rol: team === "auditor" ? "Auditor" : "Auditado", cargo: "", email: "" };
    setConfig(prev => ({
      ...prev,
      [team === "auditor" ? "equipo_auditor" : "equipo_auditado"]: [
        ...prev[team === "auditor" ? "equipo_auditor" : "equipo_auditado"],
        newMember
      ]
    }));
  };

  const removeTeamMember = (team, index) => {
    const key = team === "auditor" ? "equipo_auditor" : "equipo_auditado";
    if (config[key].length === 1) return;
    setConfig(prev => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index)
    }));
  };

  const updateTeamMember = (team, index, field, value) => {
    const key = team === "auditor" ? "equipo_auditor" : "equipo_auditado";
    setConfig(prev => ({
      ...prev,
      [key]: prev[key].map((member, i) => 
        i === index ? { ...member, [field]: value } : member
      )
    }));
  };

  const addArea = () => {
    if (newArea.trim() && !config.areas_proceso.includes(newArea.trim())) {
      setConfig(prev => ({
        ...prev,
        areas_proceso: [...prev.areas_proceso, newArea.trim()]
      }));
      setNewArea("");
    }
  };

  const removeArea = (area) => {
    setConfig(prev => ({
      ...prev,
      areas_proceso: prev.areas_proceso.filter(a => a !== area)
    }));
  };

  const toggleNormaGeneral = (normaId) => {
    setConfig(prev => ({
      ...prev,
      normas_generales_ids: prev.normas_generales_ids.includes(normaId)
        ? prev.normas_generales_ids.filter(id => id !== normaId)
        : [...prev.normas_generales_ids, normaId]
    }));
  };

  const toggleNormaEspecifica = (normaId) => {
    setConfig(prev => ({
      ...prev,
      normas_especificas_ids: prev.normas_especificas_ids.includes(normaId)
        ? prev.normas_especificas_ids.filter(id => id !== normaId)
        : [...prev.normas_especificas_ids, normaId]
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!config.alcance || !config.fecha_inicio) {
      toast.error("Por favor complete los campos requeridos");
      return;
    }

    const validAuditores = config.equipo_auditor.filter(m => m.nombre.trim());
    if (validAuditores.length === 0) {
      toast.error("Debe agregar al menos un auditor");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      
      // Crear configuración
      const configPayload = {
        company_id: companyId,
        ...config,
        equipo_auditor: config.equipo_auditor.filter(m => m.nombre.trim()),
        equipo_auditado: config.equipo_auditado.filter(m => m.nombre.trim())
      };

      const configResponse = await axios.post(`${API}/configuraciones-auditoria`, configPayload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Crear auditoría vacía con estado en_proceso
      const auditPayload = {
        company_id: companyId,
        config_id: configResponse.data.id,
        responses: [] // Sin respuestas aún
      };

      const auditResponse = await axios.post(`${API}/auditorias`, auditPayload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Auditoría creada exitosamente");
      onComplete(auditResponse.data.id);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al crear auditoría");
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold">Información General</h3>
              <p className="text-gray-600">Configure los datos básicos de la auditoría</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Fecha de Inicio *</Label>
                <Input
                  type="date"
                  value={config.fecha_inicio}
                  onChange={(e) => setConfig({ ...config, fecha_inicio: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Fecha de Finalización</Label>
                <Input
                  type="date"
                  value={config.fecha_fin}
                  onChange={(e) => setConfig({ ...config, fecha_fin: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Tipo de Auditoría *</Label>
                <Select value={config.tipo_auditoria} onValueChange={(v) => setConfig({ ...config, tipo_auditoria: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_AUDITORIA.map(tipo => (
                      <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Alcance de la Auditoría *</Label>
                <Textarea
                  value={config.alcance}
                  onChange={(e) => setConfig({ ...config, alcance: e.target.value })}
                  placeholder="Describa el alcance de la auditoría: procesos, áreas, ubicaciones, período a evaluar..."
                  rows={4}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label>Objetivos de la Auditoría</Label>
                <Textarea
                  value={config.objetivos}
                  onChange={(e) => setConfig({ ...config, objetivos: e.target.value })}
                  placeholder="Objetivos específicos que se buscan lograr con esta auditoría..."
                  rows={3}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Áreas/Procesos a Auditar</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    placeholder="Nombre del área o proceso"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addArea())}
                  />
                  <Button type="button" onClick={addArea} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.areas_proceso.map((area, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1 py-1">
                      {area}
                      <button onClick={() => removeArea(area)} className="ml-1 hover:text-red-600">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold">Equipos de Auditoría</h3>
              <p className="text-gray-600">Configure el equipo auditor y auditado</p>
            </div>

            {/* Equipo Auditor */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-lg">Equipo Auditor</h4>
                <Button type="button" onClick={() => addTeamMember("auditor")} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Agregar Auditor
                </Button>
              </div>
              
              {config.equipo_auditor.map((member, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Nombre Completo *</Label>
                      <Input
                        value={member.nombre}
                        onChange={(e) => updateTeamMember("auditor", index, "nombre", e.target.value)}
                        placeholder="Nombre del auditor"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Identificación</Label>
                      <Input
                        value={member.identificacion}
                        onChange={(e) => updateTeamMember("auditor", index, "identificacion", e.target.value)}
                        placeholder="CC / CE"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Rol</Label>
                      <Select 
                        value={member.rol} 
                        onValueChange={(v) => updateTeamMember("auditor", index, "rol", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES_AUDITOR.map(rol => (
                            <SelectItem key={rol} value={rol}>{rol}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Email</Label>
                      <Input
                        type="email"
                        value={member.email}
                        onChange={(e) => updateTeamMember("auditor", index, "email", e.target.value)}
                        placeholder="correo@ejemplo.com"
                      />
                    </div>
                    <div className="flex items-end">
                      {config.equipo_auditor.length > 1 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeTeamMember("auditor", index)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Equipo Auditado */}
            <div className="space-y-4 mt-8">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-lg">Equipo Auditado</h4>
                <Button type="button" onClick={() => addTeamMember("auditado")} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Agregar Persona
                </Button>
              </div>
              
              {config.equipo_auditado.map((member, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Nombre Completo</Label>
                      <Input
                        value={member.nombre}
                        onChange={(e) => updateTeamMember("auditado", index, "nombre", e.target.value)}
                        placeholder="Nombre"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Cargo</Label>
                      <Input
                        value={member.cargo}
                        onChange={(e) => updateTeamMember("auditado", index, "cargo", e.target.value)}
                        placeholder="Cargo en la empresa"
                      />
                    </div>
                    <div className="flex items-end">
                      {config.equipo_auditado.length > 1 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeTeamMember("auditado", index)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold">Criterios Normativos</h3>
              <p className="text-gray-600">Seleccione las normas base para la auditoría</p>
            </div>

            {/* Normas Generales */}
            <div className="space-y-3">
              <h4 className="font-semibold">Normas Generales (Repositorio Central)</h4>
              <p className="text-sm text-gray-500">Estas normas aplican a todas las empresas</p>
              
              {normasGenerales.length === 0 ? (
                <p className="text-gray-500 text-sm italic">No hay normas generales registradas</p>
              ) : (
                <div className="grid gap-2 max-h-48 overflow-y-auto">
                  {normasGenerales.map(norma => (
                    <div 
                      key={norma.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        config.normas_generales_ids.includes(norma.id) 
                          ? 'bg-purple-50 border-purple-300' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => toggleNormaGeneral(norma.id)}
                    >
                      <Checkbox 
                        checked={config.normas_generales_ids.includes(norma.id)}
                        onChange={() => {}}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{norma.nombre}</p>
                        <p className="text-sm text-gray-500">{norma.categoria}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Normas Específicas */}
            <div className="space-y-3 mt-6">
              <h4 className="font-semibold">Normas Internas de la Empresa</h4>
              <p className="text-sm text-gray-500">Políticas, reglamentos y manuales propios de la organización</p>
              
              {normasEspecificas.length === 0 ? (
                <p className="text-gray-500 text-sm italic">No hay normas internas registradas para esta empresa</p>
              ) : (
                <div className="grid gap-2 max-h-48 overflow-y-auto">
                  {normasEspecificas.map(norma => (
                    <div 
                      key={norma.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        config.normas_especificas_ids.includes(norma.id) 
                          ? 'bg-blue-50 border-blue-300' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => toggleNormaEspecifica(norma.id)}
                    >
                      <Checkbox 
                        checked={config.normas_especificas_ids.includes(norma.id)}
                        onChange={() => {}}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{norma.nombre}</p>
                        <Badge variant="outline" className="mt-1">{norma.tipo}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Criterios Adicionales */}
            <div className="mt-6">
              <Label>Criterios Adicionales</Label>
              <Textarea
                value={config.criterios_adicionales}
                onChange={(e) => setConfig({ ...config, criterios_adicionales: e.target.value })}
                placeholder="Otros criterios, requisitos o referencias que deba considerar la auditoría..."
                rows={3}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold">Confirmar Configuración</h3>
              <p className="text-gray-600">Revise la información antes de iniciar</p>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Información General</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p><strong>Tipo:</strong> {TIPOS_AUDITORIA.find(t => t.value === config.tipo_auditoria)?.label}</p>
                  <p><strong>Fecha:</strong> {config.fecha_inicio} {config.fecha_fin ? `a ${config.fecha_fin}` : ''}</p>
                  <p><strong>Alcance:</strong> {config.alcance}</p>
                  {config.areas_proceso.length > 0 && (
                    <p><strong>Áreas:</strong> {config.areas_proceso.join(", ")}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Equipo Auditor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {config.equipo_auditor.filter(m => m.nombre).map((m, i) => (
                      <p key={i} className="text-sm">
                        <strong>{m.rol}:</strong> {m.nombre}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Criterios Normativos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {config.normas_generales_ids.length > 0 && (
                      <div>
                        <p className="text-sm font-medium">Normas Generales:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {config.normas_generales_ids.map(id => {
                            const norma = normasGenerales.find(n => n.id === id);
                            return norma ? (
                              <Badge key={id} variant="secondary">{norma.nombre}</Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                    {config.normas_especificas_ids.length > 0 && (
                      <div>
                        <p className="text-sm font-medium">Normas Internas:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {config.normas_especificas_ids.map(id => {
                            const norma = normasEspecificas.find(n => n.id === id);
                            return norma ? (
                              <Badge key={id} variant="outline">{norma.nombre}</Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                    {config.normas_generales_ids.length === 0 && config.normas_especificas_ids.length === 0 && (
                      <p className="text-sm text-gray-500">No se seleccionaron normas específicas</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="xl" className="text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-2 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              s === step ? 'bg-blue-600 text-white' :
              s < step ? 'bg-green-500 text-white' :
              'bg-gray-200 text-gray-500'
            }`}>
              {s < step ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 4 && <div className={`w-12 h-1 mx-1 ${s < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {renderStep()}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => step === 1 ? onCancel() : setStep(step - 1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {step === 1 ? 'Cancelar' : 'Anterior'}
        </Button>

        {step < 4 ? (
          <Button onClick={() => setStep(step + 1)}>
            Siguiente
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit} 
            disabled={saving}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Iniciar Auditoría
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ConfiguracionAuditoriaWizard;
