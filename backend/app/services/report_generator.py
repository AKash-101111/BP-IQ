import io
import logging
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

logger = logging.getLogger("blueprintiq.report")

class ReportGenerator:
    """
    Generates professional engineering Bill of Quantities (BOQ) and Blueprint Inspection reports.
    Includes deterministic metrics, uncertainty disclosures, RAG citations, and statutory safety disclaimers.
    """

    @staticmethod
    def generate_pdf(
        project: Dict[str, Any],
        project_metadata: Dict[str, Any],
        boq_items: List[Dict[str, Any]],
        materials: List[Dict[str, Any]],
        issues: List[Dict[str, Any]],
        uncertainty: Dict[str, Any],
        rag_references: List[Dict[str, Any]],
        gemma_reasoning: Dict[str, Any]
    ) -> bytes:
        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        
        # Custom palette matching BlueprintIQ workstation colors
        c_primary = colors.HexColor("#20242A")
        c_secondary = colors.HexColor("#68707C")
        c_accent = colors.HexColor("#315E9B")
        c_border = colors.HexColor("#D9DDE3")
        c_bg = colors.HexColor("#F5F6F8")
        c_issue = colors.HexColor("#C43D3D")
        c_warning = colors.HexColor("#B7791F")
        c_success = colors.HexColor("#2F6B4F")

        # Custom typography styles
        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=20,
            leading=24,
            textColor=c_accent
        )
        subtitle_style = ParagraphStyle(
            'DocSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            leading=14,
            textColor=c_secondary
        )
        h1_style = ParagraphStyle(
            'Heading1',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=13,
            leading=16,
            textColor=c_primary,
            spaceBefore=14,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            'Body',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=13,
            textColor=c_primary
        )
        mono_style = ParagraphStyle(
            'Mono',
            parent=styles['Normal'],
            fontName='Courier',
            fontSize=8,
            leading=11,
            textColor=c_primary
        )
        disclaimer_style = ParagraphStyle(
            'Disclaimer',
            parent=styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=8,
            leading=11,
            textColor=c_secondary
        )

        story = []

        # 1. Header Banner
        story.append(Paragraph("BLUEPRINTIQ", title_style))
        story.append(Paragraph("UNCERTAINTY-AWARE BLUEPRINT-TO-BOQ INTELLIGENCE | TECHNICAL ANALYSIS REPORT", subtitle_style))
        story.append(Spacer(1, 10))

        # 2. Executive Summary & Verification Notice Callout Box
        disclaimer_text = (
            "<b>STATUTORY ENGINEERING NOTICE:</b> BlueprintIQ provides preliminary automated computer-vision analysis "
            "and quantity estimates. It does not replace a licensed architect, structural engineer, quantity surveyor, "
            "or local municipal authority approval. All quantities must be field-verified before material procurement."
        )
        notice_table = Table([[Paragraph(disclaimer_text, body_style)]], colWidths=[540])
        notice_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FEF5E7")),
            ('BOX', (0,0), (-1,-1), 1, c_warning),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ]))
        story.append(notice_table)
        story.append(Spacer(1, 12))

        # 3. Project Information Table
        story.append(Paragraph("1. PROJECT & DRAWING METADATA", h1_style))
        proj_data = [
            ["Project Name", project.get("name", "N/A"), "Building Type", project.get("building_type", "Residential")],
            ["Floors", str(project.get("floors", 1)), "Unit System", project.get("unit_system", "METRIC")],
            ["Target Area", f"{project.get('approx_builtup_area', 'Auto')} m²", "Soil Type", project.get("soil_type", "Not Provided")],
            ["Drawing Scale", project_metadata.get("drawing_scale", "1:100"), "Concrete Grade", project_metadata.get("concrete_grade", "M20")],
            ["Wall Thickness", f"{project_metadata.get('wall_thickness', 0.23)*1000:.0f} mm", "Overall Confidence", uncertainty.get("overall_confidence", "MEDIUM")]
        ]
        t_proj = Table(proj_data, colWidths=[110, 160, 110, 160])
        t_proj.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,-1), c_bg),
            ('BACKGROUND', (2,0), (2,-1), c_bg),
            ('TEXTCOLOR', (0,0), (-1,-1), c_primary),
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('GRID', (0,0), (-1,-1), 0.5, c_border),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(t_proj)
        story.append(Spacer(1, 12))

        # 4. Materials Summary (Key Quantities with Ranges and Confidence)
        story.append(Paragraph("2. CONSOLIDATED MATERIAL ESTIMATES (UNCERTAINTY-AWARE)", h1_style))
        mat_headers = ["MATERIAL", "ESTIMATED", "RANGE", "CONFIDENCE", "CALCULATION BASIS"]
        mat_rows = [mat_headers]
        for m in materials:
            unit = m.get("unit", "")
            est = f"{m.get('estimated_quantity', 0):,.1f} {unit}"
            rng = f"{m.get('range_min', 0):,.0f} - {m.get('range_max', 0):,.0f}"
            conf = m.get("confidence", "MED")
            basis = m.get("calculation_basis", "")[:45] + "..." if len(m.get("calculation_basis", "")) > 45 else m.get("calculation_basis", "")
            mat_rows.append([m.get("material_name", ""), est, rng, conf, basis])

        t_mat = Table(mat_rows, colWidths=[130, 90, 85, 75, 160])
        t_mat.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), c_accent),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('GRID', (0,0), (-1,-1), 0.5, c_border),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg]),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(t_mat)
        story.append(Spacer(1, 12))

        # 5. Bill of Quantities (Civil Works)
        story.append(Paragraph("3. DETAILED BILL OF QUANTITIES (CIVIL & FINISHES)", h1_style))
        boq_headers = ["CODE", "DESCRIPTION", "QTY", "UNIT", "RANGE", "CONF."]
        boq_rows = [boq_headers]
        for b in boq_items:
            rng = f"{b.get('range_min', 0):.1f} - {b.get('range_max', 0):.1f}"
            boq_rows.append([
                b.get("item_code", ""),
                Paragraph(b.get("item_name", ""), body_style),
                f"{b.get('estimated_quantity', 0):.2f}",
                b.get("unit", ""),
                rng,
                b.get("confidence", "")
            ])

        t_boq = Table(boq_rows, colWidths=[45, 230, 60, 45, 110, 50])
        t_boq.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), c_primary),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('GRID', (0,0), (-1,-1), 0.5, c_border),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg]),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(t_boq)
        story.append(Spacer(1, 12))

        # 6. Detected Blueprint Issues & Audit Findings
        story.append(Paragraph("4. DETECTED BLUEPRINT ANOMALIES & COMPLIANCE FINDINGS", h1_style))
        if not issues:
            story.append(Paragraph("NO POTENTIAL ISSUES DETECTED based on the available blueprint information and referenced rules. Professional verification is still recommended.", body_style))
        else:
            issue_headers = ["ID", "SEVERITY", "FINDING & EVIDENCE", "RECOMMENDED ACTION"]
            issue_rows = [issue_headers]
            for iss in issues:
                sev = iss.get("severity", "MED")
                title_ev = f"<b>{iss.get('title')}</b><br/>{iss.get('evidence')}<br/><i>Ref: {iss.get('rag_reference', 'General Standard')}</i>"
                rec = f"{iss.get('recommendation')}<br/><b>Verification: Required</b>"
                issue_rows.append([
                    iss.get("issue_code", ""),
                    sev,
                    Paragraph(title_ev, body_style),
                    Paragraph(rec, body_style)
                ])

            t_issues = Table(issue_rows, colWidths=[55, 60, 235, 190])
            t_issues.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#4A5568")),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,-1), 8),
                ('GRID', (0,0), (-1,-1), 0.5, c_border),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg]),
                ('TOPPADDING', (0,0), (-1,-1), 5),
                ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ]))
            story.append(t_issues)

        story.append(Spacer(1, 12))

        # 7. Gemma 2B Technical Reasoning Summary
        if gemma_reasoning:
            story.append(Paragraph("5. LOCAL AI (GEMMA 2B) SYNTHESIS & REASONING", h1_style))
            exec_sum = gemma_reasoning.get("executive_summary", "")
            if exec_sum:
                story.append(Paragraph(f"<b>Executive Synthesis:</b> {exec_sum}", body_style))
                story.append(Spacer(1, 4))
            uncert_assess = gemma_reasoning.get("uncertainty_assessment", "")
            if uncert_assess:
                story.append(Paragraph(f"<b>Uncertainty Assessment:</b> {uncert_assess}", body_style))
                story.append(Spacer(1, 6))

        # 8. Missing Inputs and Applied Assumptions
        story.append(Paragraph("6. MISSING PARAMETERS & ENGINEERING ASSUMPTIONS", h1_style))
        missing = uncertainty.get("missing_inputs", [])
        if missing:
            story.append(Paragraph("<b>Missing Required / Recommended Inputs:</b>", body_style))
            for mi in missing:
                story.append(Paragraph(f"• <b>{mi.get('field')}:</b> {mi.get('status')} - <i>{mi.get('impact')}</i>", body_style))
            story.append(Spacer(1, 6))

        assumptions = uncertainty.get("major_assumptions", [])
        if assumptions:
            story.append(Paragraph("<b>Applied Engineering Assumptions:</b>", body_style))
            for a in assumptions:
                story.append(Paragraph(f"• {a}", body_style))

        doc.build(story)
        return buf.getvalue()

report_generator = ReportGenerator()
