import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import io
import logging
from typing import List, Dict, Any, Tuple
from backend.app.models.schemas import IssueItem

logger = logging.getLogger("blueprintiq.markup")

class BlueprintMarkupGenerator:
    """
    Renders visual marked-up blueprints with high-contrast bounding boxes,
    numbered badges [01], [02], translucent region highlights, and legend.
    Preserves full visual recognizability of the underlying architectural drawing.
    """

    @staticmethod
    def generate_marked_blueprint(
        raw_image_bytes: bytes,
        issues: List[Dict[str, Any]],
        page_number: int = 1
    ) -> bytes:
        # Load raw image into PIL Image for clean alpha blending and high-res vector drawing
        base_img = Image.open(io.BytesIO(raw_image_bytes)).convert("RGBA")
        width, height = base_img.size

        # Create overlay for translucent highlights
        overlay = Image.new("RGBA", (width, height), (255, 255, 255, 0))
        draw_overlay = ImageDraw.Draw(overlay)
        draw_solid = ImageDraw.Draw(base_img)

        # Filter issues for this page
        page_issues = [i for i in issues if i.get("page_number", 1) == page_number and i.get("bbox")]

        # Colors matching design guidelines
        color_map = {
            "CRITICAL": {"fill": (196, 61, 61, 70), "border": (196, 61, 61, 255), "badge": (196, 61, 61, 255)},
            "HIGH": {"fill": (196, 61, 61, 60), "border": (196, 61, 61, 255), "badge": (196, 61, 61, 255)},
            "MEDIUM": {"fill": (183, 121, 31, 55), "border": (183, 121, 31, 255), "badge": (183, 121, 31, 255)},
            "LOW": {"fill": (49, 94, 155, 45), "border": (49, 94, 155, 255), "badge": (49, 94, 155, 255)},
            "INFO": {"fill": (47, 107, 79, 45), "border": (47, 107, 79, 255), "badge": (47, 107, 79, 255)},
        }

        badge_positions = []

        for idx, issue in enumerate(page_issues):
            code_num = f"{idx + 1:02d}" # "01", "02"
            severity = issue.get("severity", "MEDIUM")
            c = color_map.get(severity, color_map["MEDIUM"])

            bb = issue["bbox"]
            bx = float(bb.get("x", 100))
            by = float(bb.get("y", 100))
            bw = float(bb.get("width", 100))
            bh = float(bb.get("height", 80))

            x0, y0 = bx, by
            x1, y1 = bx + bw, by + bh

            # 1. Draw translucent highlight rectangle
            draw_overlay.rectangle([x0, y0, x1, y1], fill=c["fill"])
            
            # 2. Draw border
            border_w = 3 if severity in ["HIGH", "CRITICAL"] else 2
            draw_solid.rectangle([x0, y0, x1, y1], outline=c["border"], width=border_w)

            # 3. Draw numbered badge circle at top-left corner
            badge_r = 16
            cx = max(badge_r, x0 - 8)
            cy = max(badge_r, y0 - 8)
            draw_solid.ellipse([cx - badge_r, cy - badge_r, cx + badge_r, cy + badge_r], fill=c["badge"], outline=(255, 255, 255, 255), width=2)
            
            # Badge text
            draw_solid.text((cx - 8, cy - 8), code_num, fill=(255, 255, 255, 255))
            badge_positions.append((code_num, issue.get("title", ""), severity))

        # Composite translucent overlay onto base image
        composed = Image.alpha_composite(base_img, overlay)
        draw_composed = ImageDraw.Draw(composed)

        # 4. Draw Legend Box if issues exist
        if badge_positions:
            leg_w = min(420, width - 40)
            leg_h = 35 + (len(badge_positions) * 24)
            leg_x = 20
            leg_y = height - leg_h - 20

            # Legend background panel
            draw_composed.rectangle([leg_x, leg_y, leg_x + leg_w, leg_y + leg_h], fill=(255, 255, 255, 240), outline=(217, 221, 227, 255), width=2)
            draw_composed.text((leg_x + 12, leg_y + 8), "BLUEPRINT AUDIT ANOMALIES & LEGEND", fill=(32, 36, 42, 255))

            for i, (num, title, sev) in enumerate(badge_positions):
                row_y = leg_y + 32 + (i * 22)
                c = color_map.get(sev, color_map["MEDIUM"])
                draw_composed.ellipse([leg_x + 12, row_y, leg_x + 28, row_y + 16], fill=c["badge"])
                draw_composed.text((leg_x + 16, row_y + 1), num, fill=(255, 255, 255, 255))
                truncated_title = (title[:36] + "...") if len(title) > 36 else title
                draw_composed.text((leg_x + 36, row_y + 1), f"[{sev}] {truncated_title}", fill=(32, 36, 42, 255))

        # Convert back to RGB PNG
        final_img = composed.convert("RGB")
        buf = io.BytesIO()
        final_img.save(buf, format="PNG", optimize=True)
        return buf.getvalue()

markup_generator = BlueprintMarkupGenerator()
