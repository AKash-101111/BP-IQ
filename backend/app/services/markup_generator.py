import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import io
import logging
from typing import List, Dict, Any, Tuple, Optional

logger = logging.getLogger("blueprintiq.markup")

class BlueprintMarkupGenerator:
    """
    Renders visual marked-up blueprints with high-contrast bounding boxes,
    real YOLO object detections (walls, doors, windows), anomaly badges,
    translucent region highlights, and legend.
    Preserves full visual fidelity and coordinate accuracy of the underlying architectural drawing.
    """

    @staticmethod
    def generate_marked_blueprint(
        raw_image_bytes: bytes,
        issues: Optional[List[Dict[str, Any]]] = None,
        walls: Optional[List[Dict[str, Any]]] = None,
        openings: Optional[List[Dict[str, Any]]] = None,
        rooms: Optional[List[Dict[str, Any]]] = None,
        page_number: int = 1
    ) -> bytes:
        issues = issues or []
        walls = walls or []
        openings = openings or []
        rooms = rooms or []

        # Load raw image into PIL Image for clean alpha blending and vector drawing
        base_img = Image.open(io.BytesIO(raw_image_bytes)).convert("RGBA")
        width, height = base_img.size

        # Overlay for translucent highlights
        overlay = Image.new("RGBA", (width, height), (255, 255, 255, 0))
        draw_overlay = ImageDraw.Draw(overlay)
        draw_solid = ImageDraw.Draw(base_img)

        # 1. Draw YOLO Detected Objects (Doors, Windows, Walls)
        # Class styling
        detection_styles = {
            "wall": {"fill": (46, 139, 87, 30), "border": (46, 139, 87, 220), "label_bg": (46, 139, 87, 230)},
            "door": {"fill": (30, 144, 255, 40), "border": (30, 144, 255, 230), "label_bg": (30, 144, 255, 240)},
            "window": {"fill": (230, 126, 34, 40), "border": (230, 126, 34, 230), "label_bg": (230, 126, 34, 240)},
            "room": {"fill": (155, 89, 182, 25), "border": (155, 89, 182, 180), "label_bg": (155, 89, 182, 220)}
        }

        # Draw detected walls
        for w in walls:
            if w.get("page_number", 1) == page_number and w.get("bbox"):
                bb = w["bbox"]
                bx, by, bw, bh = float(bb.get("x", 0)), float(bb.get("y", 0)), float(bb.get("width", 1)), float(bb.get("height", 1))
                st = detection_styles["wall"]
                draw_overlay.rectangle([bx, by, bx + bw, by + bh], fill=st["fill"])
                draw_solid.rectangle([bx, by, bx + bw, by + bh], outline=st["border"], width=2)
                conf = w.get("confidence")
                conf_str = f" {int(conf*100)}%" if conf else ""
                label = f"Wall{conf_str}"
                # Small label badge
                draw_solid.rectangle([bx, max(0, by - 14), bx + 55, by], fill=st["label_bg"])
                draw_solid.text((bx + 3, max(0, by - 13)), label, fill=(255, 255, 255, 255))

        # Draw detected openings (doors and windows)
        for op in openings:
            if op.get("page_number", 1) == page_number and op.get("bbox"):
                bb = op["bbox"]
                bx, by, bw, bh = float(bb.get("x", 0)), float(bb.get("y", 0)), float(bb.get("width", 1)), float(bb.get("height", 1))
                op_type = op.get("opening_type", "DOOR").lower()
                st = detection_styles.get(op_type, detection_styles["door"])
                draw_overlay.rectangle([bx, by, bx + bw, by + bh], fill=st["fill"])
                draw_solid.rectangle([bx, by, bx + bw, by + bh], outline=st["border"], width=2)
                conf = op.get("confidence")
                conf_str = f" {int(conf*100)}%" if conf else ""
                label = f"{op_type.capitalize()}{conf_str}"
                badge_w = 60 if conf else 45
                draw_solid.rectangle([bx, max(0, by - 14), bx + badge_w, by], fill=st["label_bg"])
                draw_solid.text((bx + 3, max(0, by - 13)), label, fill=(255, 255, 255, 255))

        # Draw detected rooms (if any)
        for rm in rooms:
            if rm.get("page_number", 1) == page_number and rm.get("bbox"):
                bb = rm["bbox"]
                bx, by, bw, bh = float(bb.get("x", 0)), float(bb.get("y", 0)), float(bb.get("width", 1)), float(bb.get("height", 1))
                st = detection_styles["room"]
                draw_overlay.rectangle([bx, by, bx + bw, by + bh], fill=st["fill"])
                draw_solid.rectangle([bx, by, bx + bw, by + bh], outline=st["border"], width=1)
                rname = rm.get("name", "Room")[:18]
                draw_solid.rectangle([bx, max(0, by - 14), bx + (len(rname) * 7) + 6, by], fill=st["label_bg"])
                draw_solid.text((bx + 3, max(0, by - 13)), rname, fill=(255, 255, 255, 255))

        # 2. Draw Audit Issues
        issue_colors = {
            "CRITICAL": {"fill": (196, 61, 61, 70), "border": (196, 61, 61, 255), "badge": (196, 61, 61, 255)},
            "HIGH": {"fill": (196, 61, 61, 60), "border": (196, 61, 61, 255), "badge": (196, 61, 61, 255)},
            "MEDIUM": {"fill": (183, 121, 31, 55), "border": (183, 121, 31, 255), "badge": (183, 121, 31, 255)},
            "LOW": {"fill": (49, 94, 155, 45), "border": (49, 94, 155, 255), "badge": (49, 94, 155, 255)},
            "INFO": {"fill": (47, 107, 79, 45), "border": (47, 107, 79, 255), "badge": (47, 107, 79, 255)},
        }

        page_issues = [i for i in issues if i.get("page_number", 1) == page_number and i.get("bbox")]
        badge_positions = []

        for idx, issue in enumerate(page_issues):
            code_num = f"{idx + 1:02d}"
            severity = issue.get("severity", "MEDIUM")
            c = issue_colors.get(severity, issue_colors["MEDIUM"])

            bb = issue["bbox"]
            bx = float(bb.get("x", 100))
            by = float(bb.get("y", 100))
            bw = float(bb.get("width", 100))
            bh = float(bb.get("height", 80))

            x0, y0 = bx, by
            x1, y1 = bx + bw, by + bh

            draw_overlay.rectangle([x0, y0, x1, y1], fill=c["fill"])
            border_w = 3 if severity in ["HIGH", "CRITICAL"] else 2
            draw_solid.rectangle([x0, y0, x1, y1], outline=c["border"], width=border_w)

            badge_r = 14
            cx = max(badge_r, x0 - 6)
            cy = max(badge_r, y0 - 6)
            draw_solid.ellipse([cx - badge_r, cy - badge_r, cx + badge_r, cy + badge_r], fill=c["badge"], outline=(255, 255, 255, 255), width=2)
            draw_solid.text((cx - 7, cy - 6), code_num, fill=(255, 255, 255, 255))
            badge_positions.append((code_num, issue.get("title", ""), severity))

        # Composite translucent overlay onto base image
        composed = Image.alpha_composite(base_img, overlay)
        draw_composed = ImageDraw.Draw(composed)

        # 3. Draw Legend Box
        total_doors = len([op for op in openings if op.get("opening_type") == "DOOR"])
        total_windows = len([op for op in openings if op.get("opening_type") == "WINDOW"])
        total_walls = len(walls)

        leg_lines = [
            f"YOLO11n Detections: {total_walls} Walls | {total_doors} Doors | {total_windows} Windows"
        ]
        for num, title, sev in badge_positions[:6]:
            t = (title[:34] + "...") if len(title) > 34 else title
            leg_lines.append(f"[{num}] {sev}: {t}")

        leg_w = min(480, width - 40)
        leg_h = 24 + (len(leg_lines) * 20)
        leg_x = 20
        leg_y = height - leg_h - 20

        # Background panel
        draw_composed.rectangle([leg_x, leg_y, leg_x + leg_w, leg_y + leg_h], fill=(255, 255, 255, 240), outline=(180, 185, 195, 255), width=2)
        draw_composed.text((leg_x + 10, leg_y + 5), "BLUEPRINTIQ MARKED-UP ANALYSIS", fill=(20, 24, 30, 255))

        for idx, line in enumerate(leg_lines):
            row_y = leg_y + 24 + (idx * 18)
            draw_composed.text((leg_x + 10, row_y), line, fill=(40, 44, 52, 255))

        # Convert back to RGB PNG
        final_img = composed.convert("RGB")
        buf = io.BytesIO()
        final_img.save(buf, format="PNG", optimize=True)
        return buf.getvalue()

markup_generator = BlueprintMarkupGenerator()
