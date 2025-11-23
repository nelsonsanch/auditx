from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from datetime import datetime, timezone
import os
from io import BytesIO
import requests

# Colors palette for AuditX branding
AUDITX_BLUE = colors.HexColor('#2563eb')
AUDITX_PURPLE = colors.HexColor('#7c3aed')
AUDITX_GRAY = colors.HexColor('#6b7280')
AUDITX_LIGHT_GRAY = colors.HexColor('#f3f4f6')
HEADER_BG = colors.HexColor('#1e3a8a')

def add_header_footer(canvas, doc):
    """Add header and footer to each page"""
    canvas.saveState()
    
    # Footer
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(AUDITX_GRAY)
    
    # AuditX branding footer
    footer_text = "Generado por AuditX - El mejor software de auditoría en SG-SST | nelson@sanchezcya.com | Tel: 3206177799"
    canvas.drawCentredString(A4[0] / 2, 0.5 * inch, footer_text)
    
    # Page number
    page_num = canvas.getPageNumber()
    canvas.drawRightString(A4[0] - inch, 0.5 * inch, f"Página {page_num}")
    
    canvas.restoreState()

def create_cover_page(story, styles, company_data, inspection_data, company_logo_url=None):
    """Create a professional cover page"""
    
    # Add logo if available
    if company_logo_url:
        try:
            # Download logo
            response = requests.get(company_logo_url, timeout=5)
            if response.status_code == 200:
                img_data = BytesIO(response.content)
                img = Image(img_data, width=2*inch, height=2*inch)
                img.hAlign = 'CENTER'
                story.append(img)
                story.append(Spacer(1, 0.3*inch))
        except Exception:
            pass  # Continue without logo if it fails
    
    # Main title
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=HEADER_BG,
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold',
        leading=28
    )
    
    story.append(Spacer(1, 1*inch))
    story.append(Paragraph("INFORME DE EVALUACIÓN", title_style))
    story.append(Paragraph("SISTEMA DE GESTIÓN DE SEGURIDAD", title_style))
    story.append(Paragraph("Y SALUD EN EL TRABAJO", title_style))
    story.append(Spacer(1, 0.5*inch))
    
    # Score badge
    score = inspection_data['total_score']
    score_color = colors.green if score >= 85 else colors.orange if score >= 60 else colors.red
    
    score_style = ParagraphStyle(
        'Score',
        parent=styles['Normal'],
        fontSize=48,
        textColor=score_color,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    story.append(Paragraph(f"{score:.1f}%", score_style))
    story.append(Spacer(1, 0.3*inch))
    
    # Company name
    company_style = ParagraphStyle(
        'CompanyName',
        parent=styles['Heading2'],
        fontSize=20,
        textColor=AUDITX_BLUE,
        alignment=TA_CENTER,
        spaceAfter=20
    )
    story.append(Paragraph(company_data['company_name'], company_style))
    
    # Company info table
    info_data = [
        ["NIT:", company_data.get('nit', 'N/A')],
        ["Representante Legal:", company_data.get('representante_legal', company_data['admin_name'])],
        ["Dirección:", company_data['address']],
        ["Teléfono:", company_data['phone']],
        ["Fecha de Evaluación:", datetime.now(timezone.utc).strftime('%d de %B de %Y')],
    ]
    
    info_table = Table(info_data, colWidths=[2.5*inch, 3.5*inch])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('TEXTCOLOR', (0, 0), (0, -1), AUDITX_GRAY),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    
    story.append(Spacer(1, 0.5*inch))
    story.append(info_table)
    story.append(Spacer(1, 1*inch))
    
    # AuditX branding box
    branding_style = ParagraphStyle(
        'Branding',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.white,
        alignment=TA_CENTER,
        leading=14
    )
    
    branding_data = [[
        Paragraph("<b>Generado con AuditX</b><br/>El mejor software de auditoría en SG-SST<br/>nelson@sanchezcya.com | 3206177799", branding_style)
    ]]
    
    branding_table = Table(branding_data, colWidths=[5*inch])
    branding_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), HEADER_BG),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 15),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
        ('ROUNDEDCORNERS', [10, 10, 10, 10]),
    ]))
    
    story.append(branding_table)
    story.append(PageBreak())

def create_section_header(title, styles):
    """Create a styled section header"""
    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=HEADER_BG,
        spaceAfter=20,
        spaceBefore=20,
        fontName='Helvetica-Bold',
        borderPadding=(10, 5, 10, 5),
        backColor=AUDITX_LIGHT_GRAY,
        borderRadius=5
    )
    return Paragraph(title, section_style)

def create_characterization_section(story, styles, company_data):
    """Create company characterization section"""
    story.append(create_section_header("CARACTERIZACIÓN DE LA EMPRESA", styles))
    story.append(Spacer(1, 0.2*inch))
    
    char_data = []
    
    # Basic info
    if company_data.get('nit'):
        char_data.append(["NIT:", company_data['nit']])
    if company_data.get('representante_legal'):
        char_data.append(["Representante Legal:", company_data['representante_legal']])
    if company_data.get('arl_afiliada'):
        char_data.append(["ARL Afiliada:", company_data['arl_afiliada']])
    
    # Economic activity
    if company_data.get('nivel_riesgo') and company_data.get('codigo_ciiu'):
        actividad = f"{company_data.get('nivel_riesgo', '')}-{company_data.get('codigo_ciiu', '')}-{company_data.get('subdivision_ciiu', '')}"
        char_data.append(["Actividad Económica (Decreto 768/2022):", actividad])
    
    if company_data.get('descripcion_actividad'):
        char_data.append(["Descripción de Actividad:", company_data['descripcion_actividad']])
    
    # Labor info
    if company_data.get('numero_trabajadores'):
        char_data.append(["Número de Trabajadores:", str(company_data['numero_trabajadores'])])
    if company_data.get('numero_sedes') and company_data['numero_sedes'] > 1:
        char_data.append(["Número de Sedes:", str(company_data['numero_sedes'])])
    
    if char_data:
        char_table = Table(char_data, colWidths=[2.5*inch, 4*inch])
        char_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), AUDITX_BLUE),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, AUDITX_GRAY),
        ]))
        
        story.append(char_table)
        story.append(Spacer(1, 0.3*inch))

def generate_professional_pdf(pdf_path, company_data, inspection_data, analysis_data):
    """Generate a professional PDF report"""
    
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        rightMargin=inch,
        leftMargin=inch,
        topMargin=0.75*inch,
        bottomMargin=0.75*inch
    )
    
    story = []
    styles = getSampleStyleSheet()
    
    # Create cover page
    create_cover_page(story, styles, company_data, inspection_data, company_data.get('logo_url'))
    
    # Add characterization section
    create_characterization_section(story, styles, company_data)
    
    # Add report content
    if analysis_data:
        # Process markdown content from AI
        report_lines = analysis_data['report'].split('\n')
        
        for line in report_lines:
            line = line.strip()
            if not line:
                story.append(Spacer(1, 0.1*inch))
                continue
            
            # Headers
            if line.startswith('###'):
                header_text = line.replace('###', '').strip()
                header_style = ParagraphStyle(
                    'CustomH3',
                    parent=styles['Heading3'],
                    fontSize=12,
                    textColor=AUDITX_BLUE,
                    spaceAfter=10,
                    spaceBefore=15
                )
                story.append(Paragraph(header_text, header_style))
            elif line.startswith('##'):
                header_text = line.replace('##', '').strip()
                story.append(create_section_header(header_text, styles))
            elif line.startswith('#'):
                header_text = line.replace('#', '').strip()
                story.append(create_section_header(header_text, styles))
            # Lists
            elif line.startswith('-') or line.startswith('*'):
                list_text = line[1:].strip()
                story.append(Paragraph(f"• {list_text}", styles['Normal']))
            else:
                # Regular paragraph
                story.append(Paragraph(line, styles['BodyText']))
    
    # Build PDF with custom header/footer
    doc.build(story, onFirstPage=add_header_footer, onLaterPages=add_header_footer)
    
    return pdf_path
