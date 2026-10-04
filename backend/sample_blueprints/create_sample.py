import os
from pathlib import Path
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib import colors
from reportlab.pdfgen import canvas

SAMPLE_DIR = Path(__file__).resolve().parent
SAMPLE_DIR.mkdir(parents=True, exist_ok=True)
PDF_PATH = SAMPLE_DIR / "sample_residential_blueprint.pdf"

def generate_sample_drawing():
    c = canvas.Canvas(str(PDF_PATH), pagesize=landscape(letter))
    width, height = landscape(letter) # 792 x 612

    # Draw Blueprint Border
    c.setLineWidth(2)
    c.setStrokeColor(colors.HexColor("#20242A"))
    c.rect(30, 30, width - 60, height - 60)

    # Title Block
    c.setLineWidth(1)
    c.rect(width - 240, 30, 210, 80)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(width - 230, 95, "PROJECT: VILLA RESIDENCE G+1")
    c.setFont("Helvetica", 9)
    c.drawString(width - 230, 80, "SHEET: GROUND FLOOR PLAN")
    c.drawString(width - 230, 65, "SCALE: 1:100  |  UNIT: METRIC (M)")
    c.drawString(width - 230, 50, "REF: ARCH-DWG-001  |  REV: 02")
    c.drawString(width - 230, 36, "DATE: 2026-10-01")

    # Outer External Walls (Thick double lines)
    # Living room: (80, 160) to (360, 480)
    c.setLineWidth(3)
    c.setStrokeColor(colors.HexColor("#20242A"))
    # Building main outline:
    c.rect(80, 160, 480, 380)

    # Internal Wall Partitions
    c.setLineWidth(2)
    # Horizontal partition dividing Living/Dining from Kitchen/Baths
    c.line(80, 320, 560, 320)
    # Vertical partition dividing Living from Master Bed
    c.line(340, 320, 340, 540)
    # Vertical partition dividing Kitchen from Bathroom
    c.line(240, 160, 240, 320)
    # Vertical partition dividing Bathroom from Staircase
    c.line(380, 160, 380, 320)

    # Room Labels & Dimensions
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(colors.HexColor("#20242A"))

    # Living & Dining
    c.drawString(130, 460, "LIVING & DINING")
    c.setFont("Helvetica", 10)
    c.drawString(130, 442, "4.80m x 5.20m (24.96 sq.m)")
    c.drawString(130, 426, "STATED AREA: 24.5 sq.m")

    # Master Bedroom (Note: Stated area 18.0 sq.m vs 3.6 x 3.6 = 12.96 sq.m -> triggers intentional area inconsistency issue!)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(380, 460, "MASTER BEDROOM")
    c.setFont("Helvetica", 10)
    c.drawString(380, 442, "3.60m x 3.60m")
    c.drawString(380, 426, "STATED AREA: 18.0 sq.m") # Stated 18.0 vs Measured 12.96!

    # Kitchen
    c.setFont("Helvetica-Bold", 12)
    c.drawString(110, 260, "KITCHEN")
    c.setFont("Helvetica", 10)
    c.drawString(110, 242, "2.60m x 2.60m (6.76 sq.m)")

    # Attached Bathroom
    c.setFont("Helvetica-Bold", 11)
    c.drawString(260, 260, "BATH & WC")
    c.setFont("Helvetica", 9)
    c.drawString(260, 242, "2.20m x 2.60m (5.72 sq.m)")

    # Staircase Zone (Narrow flight width 0.85m -> triggers intentional staircase clearance issue!)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(410, 280, "STAIRCASE")
    c.setFont("Helvetica", 9)
    c.drawString(410, 262, "FLIGHT WIDTH: 0.85m")
    c.drawString(410, 246, "16 TREADS @ 250mm")
    # Draw stair step lines
    c.setLineWidth(0.8)
    for step_y in range(175, 310, 15):
        c.line(390, step_y, 540, step_y)
    # Stair direction arrow
    c.line(465, 175, 465, 230)
    c.line(465, 230, 460, 222)
    c.line(465, 230, 470, 222)

    # Doors (with swing arcs)
    c.setLineWidth(1)
    # Main Door D1 (Living Room): (80, 360)
    c.setStrokeColor(colors.HexColor("#315E9B"))
    c.arc(80, 360, 130, 410, 0, 90)
    c.line(80, 360, 105, 360)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(88, 385, "D1 (1.0m)")

    # Bedroom Door D2
    c.arc(340, 330, 380, 370, 90, 180)
    c.drawString(346, 355, "D2 (0.9m)")

    # Bath Door D3 (Narrow door width 0.65m -> triggers door clearance issue!)
    c.arc(240, 275, 275, 310, 0, 90)
    c.drawString(245, 295, "D3 (0.65m)")

    # External Dimension Lines with ticks
    c.setStrokeColor(colors.HexColor("#68707C"))
    c.setLineWidth(0.8)
    # Top overall width dimension line
    c.line(80, 560, 560, 560)
    c.line(80, 552, 80, 568)
    c.line(560, 552, 560, 568)
    c.line(340, 555, 340, 565)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(320, 565, "TOTAL WIDTH: 8.00 m")

    # Left overall height dimension line
    c.line(60, 160, 60, 540)
    c.line(52, 160, 68, 160)
    c.line(52, 540, 68, 540)
    c.line(55, 320, 65, 320)
    c.saveState()
    c.translate(48, 350)
    c.rotate(90)
    c.drawCentredString(0, 0, "TOTAL LENGTH: 6.33 m")
    c.restoreState()

    c.showPage()
    c.save()
    print(f"Sample blueprint PDF created at: {PDF_PATH}")

if __name__ == "__main__":
    generate_sample_drawing()
