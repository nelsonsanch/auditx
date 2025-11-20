from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from emergentintegrations.llm.chat import LlmChat, UserMessage
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.units import inch
from reportlab.lib import colors
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import io
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Security
security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ====================
# MODELS
# ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    company_name: str
    admin_name: str
    address: str
    phone: str
    logo_url: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    role: str  # "superadmin" or "client"
    is_active: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Company(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    company_name: str
    admin_name: str
    address: str
    phone: str
    logo_url: Optional[str] = None
    is_active: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StandardResponse(BaseModel):
    standard_id: str
    response: str  # "cumple", "cumple_parcial", "no_cumple"
    observations: str = ""

class InspectionCreate(BaseModel):
    company_id: str
    responses: List[StandardResponse]

class Inspection(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    user_id: str
    responses: List[Dict[str, Any]]
    total_score: float
    status: str = "completed"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AIAnalysisRequest(BaseModel):
    inspection_id: str

class AIAnalysis(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    inspection_id: str
    analysis: str
    report: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    token: str
    new_password: str

# ====================
# STANDARDS DATA
# ====================

STANDARDS = [
    {"id": "1.1.1", "category": "I. PLANEAR - Recursos", "title": "Responsable del Sistema de Gestión de Seguridad y Salud en el Trabajo SG-SST", "description": "Debe designarse un responsable del SG-SST con las competencias necesarias.", "weight": 0.5},
    {"id": "1.1.2", "category": "I. PLANEAR - Recursos", "title": "Responsabilidades en el Sistema de Gestión de Seguridad y Salud en el Trabajo – SG-SST", "description": "Se deben asignar roles y responsabilidades en el SG-SST de manera clara y documentada.", "weight": 0.5},
    {"id": "1.1.3", "category": "I. PLANEAR - Recursos", "title": "Asignación de recursos para el Sistema de Gestión en Seguridad y Salud en el Trabajo – SG-SST", "description": "La empresa debe asignar recursos financieros, técnicos y humanos necesarios para implementar el SG-SST.", "weight": 0.5},
    {"id": "1.1.4", "category": "I. PLANEAR - Recursos", "title": "Afiliación al Sistema General de Riesgos Laborales", "description": "Todos los trabajadores deben estar afiliados al Sistema General de Riesgos Laborales.", "weight": 0.5},
    {"id": "1.1.5", "category": "I. PLANEAR - Recursos", "title": "Pago de pensión trabajadores alto riesgo", "description": "Se debe garantizar el pago de pensión especial para trabajadores en actividades de alto riesgo.", "weight": 0.5},
    {"id": "1.1.6", "category": "I. PLANEAR - Recursos", "title": "Conformación COPASST / Vigía", "description": "Debe conformarse el Comité Paritario de Seguridad y Salud en el Trabajo o Vigía según el número de trabajadores.", "weight": 0.5},
    {"id": "1.1.7", "category": "I. PLANEAR - Recursos", "title": "Capacitación COPASST / Vigía", "description": "Los miembros del COPASST o Vigía deben recibir capacitación en SST.", "weight": 0.5},
    {"id": "1.1.8", "category": "I. PLANEAR - Recursos", "title": "Conformación Comité de Convivencia", "description": "Debe conformarse el Comité de Convivencia Laboral según normativa vigente.", "weight": 0.5},
    {"id": "1.2.1", "category": "I. PLANEAR - Capacitación SG-SST", "title": "Programa Capacitación promoción y prevención PYP", "description": "Debe existir un programa de capacitación documentado en promoción y prevención en SST.", "weight": 2.0},
    {"id": "1.2.2", "category": "I. PLANEAR - Capacitación SG-SST", "title": "Capacitación, Inducción y Reinducción en Sistema de Gestión de Seguridad y Salud en el Trabajo SG-SST", "description": "Todo trabajador debe recibir inducción y reinducción periódica en el SG-SST.", "weight": 2.0},
    {"id": "1.2.3", "category": "I. PLANEAR - Capacitación SG-SST", "title": "Responsables del Sistema de Gestión de Seguridad y Salud en el Trabajo SG-SST con curso (50 horas)", "description": "El responsable del SG-SST debe tener certificación de curso de 50 horas en SST.", "weight": 2.0},
    {"id": "2.1.1", "category": "II. HACER - Política SG-SST", "title": "Política del Sistema de Gestión de Seguridad y Salud en el Trabajo SG-SST firmada, fechada y comunicada", "description": "La política de SST debe estar firmada por el representante legal, fechada y comunicada a todos los trabajadores.", "weight": 1.0},
    {"id": "2.2.1", "category": "II. HACER - Objetivos SG-SST", "title": "Objetivos definidos, claros, medibles, cuantificables, con metas, documentados, revisados del SG-SST", "description": "Los objetivos del SG-SST deben ser SMART (específicos, medibles, alcanzables, relevantes y con plazo).", "weight": 1.0},
    {"id": "2.3.1", "category": "II. HACER - Evaluación Inicial SG-SST", "title": "Evaluación e identificación de prioridades", "description": "Se debe realizar evaluación inicial del SG-SST para identificar prioridades de intervención.", "weight": 1.0},
    {"id": "2.4.1", "category": "II. HACER - Plan Anual Trabajo", "title": "Plan que identifica objetivos, metas, responsabilidad, recursos con cronograma y firmado", "description": "Debe existir un plan anual de trabajo con objetivos, metas, responsables, recursos y cronograma firmado.", "weight": 2.0},
    {"id": "2.5.1", "category": "II. HACER - Conservación Documental", "title": "Archivo o retención documental del Sistema de Gestión en Seguridad y Salud en el Trabajo SG-SST", "description": "Se debe establecer un sistema de archivo y retención documental del SG-SST.", "weight": 2.0},
    {"id": "2.6.1", "category": "II. HACER - Rendición de Cuentas", "title": "Rendición sobre el desempeño", "description": "La alta dirección debe rendir cuentas sobre el desempeño del SG-SST.", "weight": 1.0},
    {"id": "2.7.1", "category": "II. HACER - Normatividad Vigente", "title": "Matriz legal", "description": "Debe mantenerse actualizada una matriz de requisitos legales aplicables en SST.", "weight": 2.0},
    {"id": "2.8.1", "category": "II. HACER - Comunicación", "title": "Mecanismos de comunicación, auto reporte en Sistema de Gestión de Seguridad y Salud en el Trabajo SG-SST", "description": "Deben establecerse mecanismos de comunicación y auto-reporte en el SG-SST.", "weight": 1.0},
    {"id": "2.9.1", "category": "II. HACER - Adquisiciones", "title": "Identificación, evaluación, para adquisición de productos y servicios en SG-SST", "description": "Se debe evaluar el impacto en SST de las adquisiciones de productos y servicios.", "weight": 1.0},
    {"id": "2.10.1", "category": "II. HACER - Contratación", "title": "Evaluación y selección de proveedores y contratistas", "description": "Debe existir un procedimiento para evaluar y seleccionar proveedores y contratistas en temas de SST.", "weight": 2.0},
    {"id": "2.11.1", "category": "II. HACER - Gestión del Cambio", "title": "Evaluación del impacto de cambios internos y externos en el SG-SST", "description": "Se debe evaluar el impacto de los cambios organizacionales en el SG-SST.", "weight": 1.0},
    {"id": "3.1.1", "category": "II. HACER - Condiciones de Salud", "title": "Evaluación Médica Ocupacional", "description": "Debe realizarse evaluación médica ocupacional según los riesgos a los que están expuestos los trabajadores.", "weight": 1.0},
    {"id": "3.1.2", "category": "II. HACER - Condiciones de Salud", "title": "Actividades de Promoción y Prevención en Salud", "description": "Se deben implementar actividades de promoción y prevención de la salud de los trabajadores.", "weight": 1.0},
    {"id": "3.1.3", "category": "II. HACER - Condiciones de Salud", "title": "Información al médico de los perfiles de cargo", "description": "Se debe proporcionar al médico ocupacional información sobre los perfiles de cargo y exposiciones.", "weight": 1.0},
    {"id": "3.1.4", "category": "II. HACER - Condiciones de Salud", "title": "Realización de los exámenes médicos ocupacionales: preingreso, periódicos", "description": "Deben realizarse exámenes médicos de preingreso, periódicos, de retiro y post-incapacidad.", "weight": 1.0},
    {"id": "3.1.5", "category": "II. HACER - Condiciones de Salud", "title": "Custodia de Historias Clínicas", "description": "Las historias clínicas ocupacionales deben custodiarse garantizando confidencialidad.", "weight": 1.0},
    {"id": "3.1.6", "category": "II. HACER - Condiciones de Salud", "title": "Restricciones y recomendaciones médico laborales", "description": "Se deben implementar las restricciones y recomendaciones médico-laborales.", "weight": 1.0},
    {"id": "3.1.7", "category": "II. HACER - Condiciones de Salud", "title": "Estilos de vida y entornos saludables (controles tabaquismo, alcoholismo, farmacodependencia y otros)", "description": "Deben implementarse programas de estilos de vida saludable y prevención de adicciones.", "weight": 1.0},
    {"id": "3.1.8", "category": "II. HACER - Condiciones de Salud", "title": "Agua potable, servicios sanitarios y disposición de basuras", "description": "Se debe garantizar agua potable, servicios sanitarios adecuados y disposición de residuos.", "weight": 1.0},
    {"id": "3.1.9", "category": "II. HACER - Condiciones de Salud", "title": "Eliminación adecuada de residuos sólidos, líquidos o gaseosos", "description": "Debe existir un programa de gestión integral de residuos sólidos, líquidos y gaseosos.", "weight": 1.0},
    {"id": "3.2.1", "category": "II. HACER - Registro/Reporte/Investigación", "title": "Reporte de los accidentes de trabajo y enfermedad laboral a la ARL, EPS y Dirección Territorial", "description": "Todo accidente de trabajo y enfermedad laboral debe reportarse a las entidades competentes.", "weight": 2.0},
    {"id": "3.2.2", "category": "II. HACER - Registro/Reporte/Investigación", "title": "Investigación de Accidentes, Incidentes y Enfermedad Laboral", "description": "Se deben investigar todos los accidentes, incidentes y enfermedades laborales.", "weight": 2.0},
    {"id": "3.2.3", "category": "II. HACER - Registro/Reporte/Investigación", "title": "Registro y análisis estadístico de Incidentes, Accidentes de Trabajo y Enfermedad Laboral", "description": "Debe llevarse registro y análisis estadístico de incidentes, accidentes y enfermedades laborales.", "weight": 1.0},
    {"id": "3.3.1", "category": "II. HACER - Vigilancia Condiciones Salud", "title": "Medición de la severidad de los Accidentes de Trabajo y Enfermedad Laboral", "description": "Se debe medir y analizar la severidad de los accidentes de trabajo y enfermedades laborales.", "weight": 1.0},
    {"id": "3.3.2", "category": "II. HACER - Vigilancia Condiciones Salud", "title": "Medición de la frecuencia de los Incidentes, Accidentes de Trabajo y Enfermedad Laboral", "description": "Debe calcularse el índice de frecuencia de incidentes, accidentes y enfermedades laborales.", "weight": 1.0},
    {"id": "3.3.3", "category": "II. HACER - Vigilancia Condiciones Salud", "title": "Medición de la mortalidad de Accidentes de Trabajo y Enfermedad Laboral", "description": "Se debe llevar registro de la mortalidad por accidentes de trabajo y enfermedad laboral.", "weight": 1.0},
    {"id": "3.3.4", "category": "II. HACER - Vigilancia Condiciones Salud", "title": "Medición de la prevalencia de incidentes, Accidentes de Trabajo y Enfermedad Laboral", "description": "Debe medirse la prevalencia de incidentes, accidentes y enfermedades laborales.", "weight": 1.0},
    {"id": "3.3.5", "category": "II. HACER - Vigilancia Condiciones Salud", "title": "Medición de la incidencia de Incidentes, Accidentes de Trabajo y Enfermedad Laboral", "description": "Se debe calcular la incidencia de incidentes, accidentes y enfermedades laborales.", "weight": 1.0},
    {"id": "3.3.6", "category": "II. HACER - Vigilancia Condiciones Salud", "title": "Medición del ausentismo por incidentes, Accidentes de Trabajo y Enfermedad Laboral", "description": "Debe medirse y analizarse el ausentismo relacionado con SST.", "weight": 1.0},
    {"id": "4.1.1", "category": "II. HACER - Identificación Peligros y Riesgos", "title": "Metodología para la identificación, evaluación y valoración de peligros", "description": "Debe adoptarse una metodología sistemática para identificar, evaluar y valorar peligros (ej: GTC 45).", "weight": 4.0},
    {"id": "4.1.2", "category": "II. HACER - Identificación Peligros y Riesgos", "title": "Identificación de peligros con participación de todos los niveles de la empresa", "description": "La identificación de peligros debe hacerse con participación de todos los niveles.", "weight": 4.0},
    {"id": "4.1.3", "category": "II. HACER - Identificación Peligros y Riesgos", "title": "Identificación y priorización de la naturaleza de los peligros (Metodología adicional, cancerígenos y otros)", "description": "Deben identificarse y priorizarse peligros especiales como cancerígenos.", "weight": 3.0},
    {"id": "4.1.4", "category": "II. HACER - Identificación Peligros y Riesgos", "title": "Realización mediciones ambientales, químicos, físicos y biológicos", "description": "Se deben realizar mediciones higiénicas de agentes químicos, físicos y biológicos según exposición.", "weight": 4.0},
    {"id": "4.2.1", "category": "II. HACER - Medidas Prevención y Control", "title": "Se implementan las medidas de prevención y control de peligros", "description": "Deben implementarse controles siguiendo la jerarquía: eliminación, sustitución, ingeniería, administrativos, EPP.", "weight": 2.5},
    {"id": "4.2.2", "category": "II. HACER - Medidas Prevención y Control", "title": "Se verifica aplicación de las medidas de prevención y control", "description": "Se debe verificar periódicamente la efectividad de las medidas de control implementadas.", "weight": 2.5},
    {"id": "4.2.3", "category": "II. HACER - Medidas Prevención y Control", "title": "Hay procedimientos, instructivos, fichas, protocolos", "description": "Deben existir procedimientos, instructivos y protocolos de trabajo seguro documentados.", "weight": 2.5},
    {"id": "4.2.4", "category": "II. HACER - Medidas Prevención y Control", "title": "Inspección con el COPASST o Vigía", "description": "El COPASST o Vigía debe realizar inspecciones periódicas de seguridad.", "weight": 2.5},
    {"id": "4.2.5", "category": "II. HACER - Medidas Prevención y Control", "title": "Mantenimiento periódico de instalaciones, equipos, máquinas, herramientas", "description": "Debe existir programa de mantenimiento preventivo y correctivo de equipos e instalaciones.", "weight": 2.5},
    {"id": "4.2.6", "category": "II. HACER - Medidas Prevención y Control", "title": "Entrega de Elementos de Protección Personal EPP, se verifica con contratistas y subcontratistas", "description": "Se debe entregar, capacitar y verificar uso de EPP, incluyendo contratistas.", "weight": 2.5},
    {"id": "5.1.1", "category": "II. HACER - Plan de Emergencias", "title": "Se cuenta con el Plan de Prevención y Preparación ante emergencias", "description": "Debe existir un plan de prevención, preparación y respuesta ante emergencias documentado.", "weight": 5.0},
    {"id": "5.1.2", "category": "II. HACER - Plan de Emergencias", "title": "Brigada de prevención conformada, capacitada y dotada", "description": "Debe conformarse, capacitarse y dotarse una brigada de emergencias.", "weight": 5.0},
    {"id": "6.1.1", "category": "III. VERIFICAR - Verificación SG-SST", "title": "Indicadores estructura, proceso y resultado", "description": "Deben definirse y medirse indicadores de estructura, proceso y resultado del SG-SST.", "weight": 1.25},
    {"id": "6.1.2", "category": "III. VERIFICAR - Verificación SG-SST", "title": "La empresa adelanta auditoría por lo menos una vez al año", "description": "Debe realizarse auditoría interna del SG-SST al menos una vez al año.", "weight": 1.25},
    {"id": "6.1.3", "category": "III. VERIFICAR - Verificación SG-SST", "title": "Revisión anual por la alta dirección, resultados y alcance de la auditoría", "description": "La alta dirección debe revisar anualmente el SG-SST y los resultados de la auditoría.", "weight": 1.25},
    {"id": "6.1.4", "category": "III. VERIFICAR - Verificación SG-SST", "title": "Planificar auditoría con el COPASST", "description": "La planificación de la auditoría debe hacerse con participación del COPASST o Vigía.", "weight": 1.25},
    {"id": "7.1.1", "category": "IV. ACTUAR - Mejoramiento", "title": "Definir acciones de Promoción y Prevención con base en resultados del SG-SST", "description": "Se deben definir acciones de mejora con base en los resultados del SG-SST.", "weight": 2.5},
    {"id": "7.1.2", "category": "IV. ACTUAR - Mejoramiento", "title": "Toma de medidas correctivas, preventivas y de mejora", "description": "Deben implementarse acciones correctivas, preventivas y de mejora identificadas.", "weight": 2.5},
    {"id": "7.1.3", "category": "IV. ACTUAR - Mejoramiento", "title": "Ejecución de acciones preventivas, correctivas y de mejora de la investigación de incidentes, accidentes y enfermedad laboral", "description": "Las acciones derivadas de investigaciones deben implementarse y verificarse.", "weight": 2.5},
    {"id": "7.1.4", "category": "IV. ACTUAR - Mejoramiento", "title": "Implementar medidas y acciones correctivas de autoridades y de ARL", "description": "Deben implementarse las medidas ordenadas por autoridades y recomendadas por la ARL.", "weight": 2.5}
]

# ====================
# UTILITY FUNCTIONS
# ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str, email: str, role: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_jwt_token(token)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return user

async def mock_send_email(to_email: str, subject: str, body: str):
    """Mock email sending - logs to console"""
    logging.info(f"\n{'='*50}\nMOCK EMAIL\nTo: {to_email}\nSubject: {subject}\nBody: {body}\n{'='*50}\n")

# ====================
# UPLOAD ENDPOINTS
# ====================

@api_router.post("/upload-logo")
async def upload_logo(file: UploadFile = File(...)):
    """Upload company logo"""
    try:
        # Validate file type
        allowed_types = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Solo se permiten imágenes (JPG, PNG, WEBP)")
        
        # Generate unique filename
        file_extension = file.filename.split('.')[-1]
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = Path("/app/backend/uploads/logos") / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Return URL
        logo_url = f"/uploads/logos/{unique_filename}"
        return {"logo_url": logo_url}
        
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al subir imagen: {str(e)}")

# ====================
# AUTH ENDPOINTS
# ====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El correo ya está registrado")
    
    # Create user
    user = User(
        email=user_data.email,
        role="client",
        is_active=False
    )
    
    # Hash password
    hashed_password = hash_password(user_data.password)
    
    # Create company
    company = Company(
        user_id=user.id,
        company_name=user_data.company_name,
        admin_name=user_data.admin_name,
        address=user_data.address,
        phone=user_data.phone,
        logo_url=user_data.logo_url,
        is_active=False
    )
    
    # Save to database
    user_doc = user.model_dump()
    user_doc['password'] = hashed_password
    user_doc['created_at'] = user_doc['created_at'].isoformat()
    
    company_doc = company.model_dump()
    company_doc['created_at'] = company_doc['created_at'].isoformat()
    
    await db.users.insert_one(user_doc)
    await db.companies.insert_one(company_doc)
    
    # Send mock email to superadmin
    superadmin_email = os.getenv("SUPERADMIN_EMAIL", "nelson@sanchezcya.com")
    await mock_send_email(
        to_email=superadmin_email,
        subject="Nuevo Registro de Cliente - Pendiente Activación",
        body=f"""Se ha registrado un nuevo cliente:
        
        Empresa: {user_data.company_name}
        Administrador: {user_data.admin_name}
        Email: {user_data.email}
        Teléfono: {user_data.phone}
        Dirección: {user_data.address}
        
        Por favor, ingrese al panel de administrador para activar esta cuenta.
        """
    )
    
    return {"message": "Registro exitoso. Su cuenta está pendiente de activación por el administrador.", "user_id": user.id}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    # Find user
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")
    
    # Verify password
    if not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")
    
    # Check if active (except for superadmin)
    if user['role'] == 'client' and not user.get('is_active', False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Su cuenta aún no ha sido activada")
    
    # Create JWT token
    token = create_jwt_token(user['id'], user['email'], user['role'])
    
    return {
        "token": token,
        "user": {
            "id": user['id'],
            "email": user['email'],
            "role": user['role'],
            "is_active": user.get('is_active', False)
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user['id'],
        "email": current_user['email'],
        "role": current_user['role'],
        "is_active": current_user.get('is_active', False)
    }

@api_router.post("/auth/forgot-password")
async def forgot_password(request: PasswordResetRequest):
    """Request password reset"""
    user = await db.users.find_one({"email": request.email}, {"_id": 0})
    if not user:
        # Don't reveal if user exists or not for security
        return {"message": "Si el correo existe, recibirá un enlace para restablecer su contraseña"}
    
    # Generate reset token
    reset_token = str(uuid.uuid4())
    expiration = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Save token to database
    await db.password_resets.insert_one({
        "token": reset_token,
        "user_id": user['id'],
        "email": user['email'],
        "expires_at": expiration.isoformat(),
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Send mock email with reset link
    reset_link = f"https://auditx.sanchezcya.com/reset-password?token={reset_token}"
    await mock_send_email(
        to_email=user['email'],
        subject="Restablecer Contraseña - AuditX",
        body=f"""Ha solicitado restablecer su contraseña.
        
Haga clic en el siguiente enlace para crear una nueva contraseña:
{reset_link}

Este enlace expirará en 1 hora.

Si no solicitó este cambio, puede ignorar este correo.

Saludos,
Equipo AuditX"""
    )
    
    return {"message": "Si el correo existe, recibirá un enlace para restablecer su contraseña"}

@api_router.post("/auth/reset-password")
async def reset_password(request: PasswordReset):
    """Reset password with token"""
    # Find valid token
    reset_request = await db.password_resets.find_one({
        "token": request.token,
        "used": False
    }, {"_id": 0})
    
    if not reset_request:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token inválido o expirado")
    
    # Check expiration
    expires_at = datetime.fromisoformat(reset_request['expires_at'])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El token ha expirado")
    
    # Update password
    new_hashed_password = hash_password(request.new_password)
    await db.users.update_one(
        {"id": reset_request['user_id']},
        {"$set": {"password": new_hashed_password}}
    )
    
    # Mark token as used
    await db.password_resets.update_one(
        {"token": request.token},
        {"$set": {"used": True}}
    )
    
    return {"message": "Contraseña restablecida exitosamente"}

@api_router.get("/auth/verify-reset-token/{token}")
async def verify_reset_token(token: str):
    """Verify if reset token is valid"""
    reset_request = await db.password_resets.find_one({
        "token": token,
        "used": False
    }, {"_id": 0})
    
    if not reset_request:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token inválido")
    
    expires_at = datetime.fromisoformat(reset_request['expires_at'])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El token ha expirado")
    
    return {"valid": True, "email": reset_request['email']}

# ====================
# ADMIN ENDPOINTS
# ====================

@api_router.get("/admin/pending-companies")
async def get_pending_companies(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'superadmin':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    
    companies = await db.companies.find({"is_active": False}, {"_id": 0}).to_list(1000)
    
    # Get user info for each company
    result = []
    for company in companies:
        user = await db.users.find_one({"id": company['user_id']}, {"_id": 0, "password": 0})
        if user:
            result.append({
                **company,
                "user_email": user['email']
            })
    
    return result

@api_router.get("/admin/companies")
async def get_all_companies(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'superadmin':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    
    companies = await db.companies.find({}, {"_id": 0}).to_list(1000)
    
    result = []
    for company in companies:
        user = await db.users.find_one({"id": company['user_id']}, {"_id": 0, "password": 0})
        if user:
            result.append({
                **company,
                "user_email": user['email']
            })
    
    return result

@api_router.post("/admin/activate-company/{company_id}")
async def activate_company(company_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'superadmin':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa no encontrada")
    
    # Activate company and user
    await db.companies.update_one({"id": company_id}, {"$set": {"is_active": True}})
    await db.users.update_one({"id": company['user_id']}, {"$set": {"is_active": True}})
    
    # Get user email
    user = await db.users.find_one({"id": company['user_id']}, {"_id": 0})
    if user:
        await mock_send_email(
            to_email=user['email'],
            subject="Cuenta Activada",
            body="Su cuenta ha sido activada. Ya puede ingresar al sistema para crear inspecciones de seguridad."
        )
    
    return {"message": "Empresa activada exitosamente"}

@api_router.post("/admin/deactivate-company/{company_id}")
async def deactivate_company(company_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'superadmin':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa no encontrada")
    
    await db.companies.update_one({"id": company_id}, {"$set": {"is_active": False}})
    await db.users.update_one({"id": company['user_id']}, {"$set": {"is_active": False}})
    
    return {"message": "Empresa desactivada"}

# ====================
# COMPANY ENDPOINTS
# ====================

@api_router.get("/my-companies")
async def get_my_companies(current_user: dict = Depends(get_current_user)):
    """Get companies for the current user"""
    companies = await db.companies.find({"user_id": current_user['id']}, {"_id": 0}).to_list(1000)
    return companies

# ====================
# STANDARDS ENDPOINTS
# ====================

@api_router.get("/standards")
async def get_standards(current_user: dict = Depends(get_current_user)):
    return STANDARDS

# ====================
# INSPECTION ENDPOINTS
# ====================

@api_router.post("/inspections")
async def create_inspection(inspection_data: InspectionCreate, current_user: dict = Depends(get_current_user)):
    # Verify company belongs to user
    company = await db.companies.find_one({"id": inspection_data.company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa no encontrada")
    
    if current_user['role'] == 'client' and company['user_id'] != current_user['id']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permiso para esta empresa")
    
    # Calculate score
    total_score = 0.0
    total_weight = sum([s['weight'] for s in STANDARDS])
    
    responses_with_score = []
    for response in inspection_data.responses:
        standard = next((s for s in STANDARDS if s['id'] == response.standard_id), None)
        if standard:
            if response.response == "cumple":
                score = standard['weight']
            elif response.response == "cumple_parcial":
                score = standard['weight'] * 0.5
            else:  # no_cumple
                score = 0
            
            total_score += score
            responses_with_score.append({
                "standard_id": response.standard_id,
                "response": response.response,
                "observations": response.observations,
                "score": score
            })
    
    percentage = (total_score / total_weight) * 100 if total_weight > 0 else 0
    
    inspection = Inspection(
        company_id=inspection_data.company_id,
        user_id=current_user['id'],
        responses=responses_with_score,
        total_score=percentage
    )
    
    inspection_doc = inspection.model_dump()
    inspection_doc['created_at'] = inspection_doc['created_at'].isoformat()
    
    await db.inspections.insert_one(inspection_doc)
    
    return {"message": "Inspección creada exitosamente", "inspection_id": inspection.id, "total_score": percentage}

@api_router.get("/inspections")
async def get_inspections(current_user: dict = Depends(get_current_user)):
    if current_user['role'] == 'superadmin':
        inspections = await db.inspections.find({}, {"_id": 0}).to_list(1000)
    else:
        inspections = await db.inspections.find({"user_id": current_user['id']}, {"_id": 0}).to_list(1000)
    
    # Add company info
    result = []
    for inspection in inspections:
        company = await db.companies.find_one({"id": inspection['company_id']}, {"_id": 0})
        if company:
            result.append({
                **inspection,
                "company_name": company['company_name']
            })
    
    return result

@api_router.get("/inspections/{inspection_id}")
async def get_inspection(inspection_id: str, current_user: dict = Depends(get_current_user)):
    inspection = await db.inspections.find_one({"id": inspection_id}, {"_id": 0})
    if not inspection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inspección no encontrada")
    
    if current_user['role'] == 'client' and inspection['user_id'] != current_user['id']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permiso")
    
    company = await db.companies.find_one({"id": inspection['company_id']}, {"_id": 0})
    
    return {
        **inspection,
        "company": company
    }

# ====================
# AI ANALYSIS ENDPOINTS
# ====================

@api_router.post("/analyze-inspection")
async def analyze_inspection(request: AIAnalysisRequest, current_user: dict = Depends(get_current_user)):
    inspection = await db.inspections.find_one({"id": request.inspection_id}, {"_id": 0})
    if not inspection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inspección no encontrada")
    
    if current_user['role'] == 'client' and inspection['user_id'] != current_user['id']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permiso")
    
    company = await db.companies.find_one({"id": inspection['company_id']}, {"_id": 0})
    
    # Calculate statistics by phase
    phase_stats = {}
    for resp in inspection['responses']:
        standard = next((s for s in STANDARDS if s['id'] == resp['standard_id']), None)
        if standard:
            phase = standard['category'].split(' - ')[0]  # Get phase (I. PLANEAR, II. HACER, etc.)
            if phase not in phase_stats:
                phase_stats[phase] = {'total': 0, 'obtained': 0, 'count': 0}
            phase_stats[phase]['total'] += standard['weight']
            phase_stats[phase]['obtained'] += resp['score']
            phase_stats[phase]['count'] += 1
    
    phase_percentages = {}
    for phase, stats in phase_stats.items():
        phase_percentages[phase] = (stats['obtained'] / stats['total'] * 100) if stats['total'] > 0 else 0
    
    # Build detailed responses text
    responses_text = ""
    critical_items = []
    partial_items = []
    
    for resp in inspection['responses']:
        standard = next((s for s in STANDARDS if s['id'] == resp['standard_id']), None)
        if standard:
            responses_text += f"\n\nEstándar {standard['id']}: {standard['title']}\n"
            responses_text += f"Categoría: {standard['category']}\n"
            responses_text += f"Descripción: {standard['description']}\n"
            responses_text += f"Respuesta: {resp['response']}\n"
            responses_text += f"Observaciones: {resp['observations']}\n"
            responses_text += f"Puntaje obtenido: {resp['score']}/{standard['weight']}\n"
            
            if resp['response'] == 'no_cumple':
                critical_items.append(f"{standard['id']} - {standard['title']}")
            elif resp['response'] == 'cumple_parcial':
                partial_items.append(f"{standard['id']} - {standard['title']}")
    
    prompt = f"""Eres un experto consultor en Seguridad y Salud en el Trabajo en Colombia, especializado en la Resolución 0312 de 2019.

INFORMACIÓN DE LA EMPRESA:
Empresa: {company['company_name']}
Puntaje Total: {inspection['total_score']:.2f}%

DESGLOSE POR FASES:
{chr(10).join([f"- {phase}: {pct:.1f}%" for phase, pct in phase_percentages.items()])}

ESTÁNDARES CRÍTICOS (No Cumple): {len(critical_items)}
ESTÁNDARES PARCIALES (Cumple Parcial): {len(partial_items)}

RESPUESTAS DETALLADAS A LOS ESTÁNDARES:
{responses_text}

Por favor, proporciona un análisis profesional y estructurado con:

1. **RESUMEN EJECUTIVO**
   - Nivel de cumplimiento global y clasificación (Crítico <60%, Moderado 60-84%, Excelente ≥85%)
   - Principales hallazgos en 3-4 puntos clave
   - Riesgo general identificado

2. **ANÁLISIS POR FASES (PHVA)**
   - Planear: Análisis del {phase_percentages.get('I. PLANEAR', 0):.1f}% obtenido
   - Hacer: Análisis del {phase_percentages.get('II. HACER', 0):.1f}% obtenido
   - Verificar: Análisis del {phase_percentages.get('III. VERIFICAR', 0):.1f}% obtenido
   - Actuar: Análisis del {phase_percentages.get('IV. ACTUAR', 0):.1f}% obtenido

3. **FORTALEZAS IDENTIFICADAS**
   - Listar estándares con cumplimiento total
   - Destacar buenas prácticas observadas

4. **BRECHAS Y OPORTUNIDADES DE MEJORA**
   - Análisis de los {len(critical_items)} estándares críticos (no cumple)
   - Análisis de los {len(partial_items)} estándares parciales
   - Identificar patrones comunes en los incumplimientos

5. **ANÁLISIS DE RIESGOS**
   - Riesgos asociados a los incumplimientos críticos
   - Impacto potencial en la seguridad de los trabajadores
   - Exposición legal y sanciones posibles

El análisis debe ser profesional, técnico, orientado a la acción y fácil de entender para la gerencia."""
    
    # Call OpenAI via Emergent Integration
    try:
        chat = LlmChat(
            api_key=os.getenv("EMERGENT_LLM_KEY"),
            session_id=f"inspection_{request.inspection_id}",
            system_message="Eres un experto consultor en Seguridad y Salud en el Trabajo en Colombia, especializado en la Resolución 0312 de 2019."
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=prompt)
        analysis_result = await chat.send_message(user_message)
        
        # Generate editable report with action plan
        report_prompt = f"""Basándote en el análisis anterior, genera un informe ejecutivo profesional con plan de acción detallado para {company['company_name']}.

El informe debe incluir:

1. **PORTADA**
   - Título: "INFORME DE EVALUACIÓN DEL SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO"
   - Empresa: {company['company_name']}
   - NIT/Identificación: [Pendiente de completar]
   - Fecha de evaluación: {datetime.now(timezone.utc).strftime('%d de %B de %Y')}
   - Responsable: {company['admin_name']}
   - Dirección: {company['address']}
   - Teléfono: {company['phone']}

2. **RESUMEN EJECUTIVO**
   - Puntaje global: {inspection['total_score']:.2f}%
   - Clasificación: [Crítico/Moderado/Excelente según puntaje]
   - Desglose por fases PHVA
   - Principales hallazgos (3-4 bullets)
   - Recomendación principal

3. **RESULTADOS POR FASE**
   - **I. PLANEAR ({phase_percentages.get('I. PLANEAR', 0):.1f}%)**: Análisis y hallazgos
   - **II. HACER ({phase_percentages.get('II. HACER', 0):.1f}%)**: Análisis y hallazgos
   - **III. VERIFICAR ({phase_percentages.get('III. VERIFICAR', 0):.1f}%)**: Análisis y hallazgos
   - **IV. ACTUAR ({phase_percentages.get('IV. ACTUAR', 0):.1f}%)**: Análisis y hallazgos

4. **FORTALEZAS IDENTIFICADAS**
   - Listar estándares que cumplen al 100%
   - Destacar buenas prácticas

5. **BRECHAS CRÍTICAS Y OPORTUNIDADES**
   - {len(critical_items)} estándares críticos sin cumplir
   - {len(partial_items)} estándares con cumplimiento parcial
   - Análisis de patrones e impacto

6. **ANÁLISIS DE RIESGOS ASOCIADOS**
   - Riesgos de seguridad identificados
   - Exposición legal y sanciones potenciales
   - Impacto en operaciones

7. **PLAN DE ACCIÓN PRIORIZADO**

   **A. ACCIONES INMEDIATAS (0-30 días) - PRIORIDAD CRÍTICA**
   Para cada acción incluir:
   - Nombre de la acción
   - Estándar(es) relacionado(s)
   - Descripción detallada
   - Responsable sugerido
   - Recursos estimados
   - Resultado esperado
   
   **B. ACCIONES A CORTO PLAZO (1-3 meses) - PRIORIDAD ALTA**
   Para cada acción incluir mismo formato anterior
   
   **C. ACCIONES A MEDIANO PLAZO (3-12 meses) - PRIORIDAD MEDIA**
   Para cada acción incluir mismo formato anterior

8. **CRONOGRAMA SUGERIDO**
   Tabla mensual con actividades priorizadas

9. **ESTIMACIÓN DE RECURSOS**
   - Recursos humanos necesarios
   - Recursos tecnológicos
   - Presupuesto estimado
   - Capacitaciones requeridas

10. **INDICADORES DE SEGUIMIENTO**
    - KPIs para medir progreso
    - Frecuencia de medición
    - Responsables

11. **CONCLUSIONES Y RECOMENDACIONES**
    - Síntesis de situación actual
    - Ruta crítica para cumplimiento
    - Beneficios esperados de implementar el plan

12. **ANEXOS SUGERIDOS**
    - Lista de estándares no conformes
    - Normatividad aplicable
    - Formatos recomendados

El informe debe ser formal, accionable y listo para presentar a gerencia. Usa formato markdown con títulos, subtítulos, listas y tablas."""
        
        report_message = UserMessage(text=report_prompt)
        report_result = await chat.send_message(report_message)
        
        # Save analysis
        ai_analysis = AIAnalysis(
            inspection_id=request.inspection_id,
            analysis=analysis_result,
            report=report_result
        )
        
        analysis_doc = ai_analysis.model_dump()
        analysis_doc['created_at'] = analysis_doc['created_at'].isoformat()
        
        await db.ai_analyses.insert_one(analysis_doc)
        
        return {
            "analysis_id": ai_analysis.id,
            "analysis": analysis_result,
            "report": report_result
        }
        
    except Exception as e:
        logging.error(f"Error calling AI: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al generar análisis: {str(e)}")

@api_router.get("/analysis/{inspection_id}")
async def get_analysis(inspection_id: str, current_user: dict = Depends(get_current_user)):
    analysis = await db.ai_analyses.find_one({"inspection_id": inspection_id}, {"_id": 0})
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Análisis no encontrado")
    
    inspection = await db.inspections.find_one({"id": inspection_id}, {"_id": 0})
    if current_user['role'] == 'client' and inspection['user_id'] != current_user['id']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permiso")
    
    return analysis

@api_router.put("/analysis/{analysis_id}")
async def update_analysis(analysis_id: str, report: str, current_user: dict = Depends(get_current_user)):
    analysis = await db.ai_analyses.find_one({"id": analysis_id}, {"_id": 0})
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Análisis no encontrado")
    
    await db.ai_analyses.update_one({"id": analysis_id}, {"$set": {"report": report}})
    
    return {"message": "Informe actualizado exitosamente"}

# ====================
# PDF GENERATION
# ====================

@api_router.get("/generate-pdf/{inspection_id}")
async def generate_pdf(inspection_id: str, current_user: dict = Depends(get_current_user)):
    inspection = await db.inspections.find_one({"id": inspection_id}, {"_id": 0})
    if not inspection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inspección no encontrada")
    
    if current_user['role'] == 'client' and inspection['user_id'] != current_user['id']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permiso")
    
    company = await db.companies.find_one({"id": inspection['company_id']}, {"_id": 0})
    analysis = await db.ai_analyses.find_one({"inspection_id": inspection_id}, {"_id": 0})
    
    # Create PDF
    pdf_path = f"/tmp/informe_{inspection_id}.pdf"
    doc = SimpleDocTemplate(pdf_path, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=30,
        alignment=1  # Center
    )
    story.append(Paragraph("INFORME DE EVALUACIÓN DEL SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO", title_style))
    story.append(Spacer(1, 0.3*inch))
    
    # Company info
    company_data = [
        ["Empresa:", company['company_name']],
        ["Administrador:", company['admin_name']],
        ["Dirección:", company['address']],
        ["Teléfono:", company['phone']],
        ["Fecha de Evaluación:", datetime.now(timezone.utc).strftime('%d/%m/%Y')],
        ["Puntaje Total:", f"{inspection['total_score']:.2f}%"]
    ]
    
    company_table = Table(company_data, colWidths=[2*inch, 4*inch])
    company_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e8f4f8')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey)
    ]))
    story.append(company_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Report content
    if analysis:
        story.append(Paragraph("INFORME DETALLADO", styles['Heading2']))
        story.append(Spacer(1, 0.2*inch))
        
        # Split report into paragraphs
        report_lines = analysis['report'].split('\n')
        for line in report_lines:
            if line.strip():
                story.append(Paragraph(line, styles['BodyText']))
                story.append(Spacer(1, 0.1*inch))
    
    doc.build(story)
    
    return FileResponse(pdf_path, media_type='application/pdf', filename=f"informe_{company['company_name']}.pdf")

# ====================
# INITIALIZE SUPERADMIN
# ====================

@app.on_event("startup")
async def create_superadmin():
    superadmin_email = os.getenv("SUPERADMIN_EMAIL", "nelson@sanchezcya.com")
    existing = await db.users.find_one({"email": superadmin_email}, {"_id": 0})
    
    if not existing:
        superadmin = User(
            email=superadmin_email,
            role="superadmin",
            is_active=True
        )
        
        superadmin_doc = superadmin.model_dump()
        superadmin_doc['password'] = hash_password("admin123")  # Default password
        superadmin_doc['created_at'] = superadmin_doc['created_at'].isoformat()
        
        await db.users.insert_one(superadmin_doc)
        logging.info(f"Superadmin created: {superadmin_email} / admin123")

# ====================
# INCLUDE ROUTER
# ====================

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory="/app/backend/uploads"), name="uploads")

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()