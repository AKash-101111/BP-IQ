import re
import logging
from typing import List, Dict, Any, Optional
from backend.app.services.db import db
from backend.app.config import settings

logger = logging.getLogger("blueprintiq.rag")

# Seed standard construction rules in memory for high-speed deterministic verification
CONSTRUCTION_KNOWLEDGE_BASE = [
    {
        "id": "rag-nbc-room-min",
        "standard_code": "NBC 2016 Part 3",
        "clause_ref": "Clause 4.2.1",
        "topic": "Habitable Room Minimum Area and Width",
        "category": "DIMENSIONS",
        "keywords": ["room", "bedroom", "living room", "habitable", "area", "dimension", "width", "carpet area"],
        "content": "No habitable room (living room, bedroom) shall have a carpet area of less than 9.5 sq.m (approx 102 sq.ft) in a single-room tenement, and minimum width shall not be less than 2.4 m (approx 7 ft 10 in). For a two-room tenement, one room shall not be less than 9.5 sq.m and the second not less than 7.5 sq.m with a minimum width of 2.1 m.",
        "min_habitable_area_sqm": 9.5,
        "min_habitable_width_m": 2.4
    },
    {
        "id": "rag-nbc-height",
        "standard_code": "NBC 2016 Part 3",
        "clause_ref": "Clause 4.2.2",
        "topic": "Minimum Ceiling Height",
        "category": "DIMENSIONS",
        "keywords": ["height", "ceiling", "clearance", "floor height", "headroom"],
        "content": "The minimum height of all rooms for human habitation shall not be less than 2.75 m (9 ft) measured from the surface of the floor to the lowest point of the ceiling or false ceiling. In air-conditioned rooms, a minimum height of 2.4 m is permitted. Bathroom and WC heights shall not be less than 2.1 m.",
        "min_ceiling_height_m": 2.75
    },
    {
        "id": "rag-nbc-kitchen",
        "standard_code": "NBC 2016 Part 3",
        "clause_ref": "Clause 4.2.3",
        "topic": "Kitchen Minimum Dimensions",
        "category": "DIMENSIONS",
        "keywords": ["kitchen", "cooking", "area", "width"],
        "content": "The area of a kitchen where a separate store is provided shall not be less than 5.0 sq.m (approx 54 sq.ft) with a minimum width of 1.8 m. Where there is no separate store, the kitchen floor area shall not be less than 5.5 sq.m.",
        "min_kitchen_area_sqm": 5.0,
        "min_kitchen_width_m": 1.8
    },
    {
        "id": "rag-nbc-toilet",
        "standard_code": "NBC 2016 Part 3",
        "clause_ref": "Clause 4.2.4",
        "topic": "Bathroom and Toilet Minimum Dimensions",
        "category": "DIMENSIONS",
        "keywords": ["bathroom", "toilet", "wc", "washroom", "bath", "water closet"],
        "content": "The minimum area of an independent bathroom shall be 1.8 sq.m with minimum width of 1.2 m. The minimum area of an independent water-closet (WC) shall be 1.1 sq.m with minimum width of 0.9 m. A combined bathroom and WC shall have an area not less than 2.8 sq.m with minimum width of 1.2 m.",
        "min_bath_area_sqm": 1.8,
        "min_wc_area_sqm": 1.1,
        "min_combined_toilet_sqm": 2.8
    },
    {
        "id": "rag-stair-geom",
        "standard_code": "NBC 2016 / IBC Section 1011",
        "clause_ref": "NBC 4.8.1 / IBC 1011.5.2",
        "topic": "Staircase Width, Riser, Tread, and Headroom Clearances",
        "category": "STAIRS",
        "keywords": ["stair", "staircase", "riser", "tread", "flight", "headroom", "landing", "flight width"],
        "content": "Residential stairways require minimum clear width of 1.0 m (1000 mm). Headroom clearance under stair flights and landings shall not be less than 2.2 m (7 ft 3 in). Maximum riser height is 190 mm (7.5 in), minimum tread depth is 250 mm (10 in). Standard comfort formula: 2R + T must equal 550 mm to 650 mm (24 - 25.5 in).",
        "min_stair_width_m": 1.0,
        "max_riser_mm": 190,
        "min_tread_mm": 250,
        "min_headroom_m": 2.2
    },
    {
        "id": "rag-doors-clearance",
        "standard_code": "IBC Section 1010 / NBC Part 3",
        "clause_ref": "IBC 1010.1.1 / NBC 4.7.1",
        "topic": "Door Clear Width and Egress Clearances",
        "category": "OPENINGS",
        "keywords": ["door", "clearance", "opening", "egress", "width", "circulation", "corridor"],
        "content": "Minimum clear door opening width for primary residential egress is 0.9 m (900 mm or 3 ft). Internal room doors should not be less than 0.8 m (800 mm). Bathroom and toilet doors may have a minimum clear width of 0.75 m (750 mm). Corridors shall maintain a minimum clear width of 1.0 m without obstruction from swing doors.",
        "min_entry_door_width_m": 0.9,
        "min_internal_door_width_m": 0.8,
        "min_bath_door_width_m": 0.75
    },
    {
        "id": "rag-concrete-is456",
        "standard_code": "IS 456:2000",
        "clause_ref": "Table 9 & Clause 9.1",
        "topic": "Concrete Mix Proportions and Cement Content",
        "category": "MATERIALS",
        "keywords": ["concrete", "cement", "m20", "m15", "m25", "mix ratio", "sand", "aggregate", "dry volume"],
        "content": "Nominal mix concrete M20 (approx 1:1.5:3 by volume) requires minimum 320 kg/m3 cement (approx 6.4 bags of 50 kg per m3 wet volume). M15 (1:2:4) requires 240 kg/m3 (approx 4.8 bags/m3). Dry volume conversion factor is 1.54 times wet compacted volume to account for voids and shrinkage. Sand density ~1600 kg/m3; Coarse aggregate ~1500 kg/m3.",
        "concrete_dry_factor": 1.54,
        "m20_cement_bags_per_m3": 6.4,
        "m15_cement_bags_per_m3": 4.8
    },
    {
        "id": "rag-brickwork-is2212",
        "standard_code": "IS 2212 / IS 1200 Part 3",
        "clause_ref": "Clause 4.1 & IS 2212 Sec 5",
        "topic": "Brick Masonry Constants and Mortar Ratios",
        "category": "MASONRY",
        "keywords": ["brick", "masonry", "bricks", "mortar", "cement", "sand", "modular brick", "wall volume"],
        "content": "For standard modular bricks (190 x 90 x 90 mm) with 10 mm mortar joints, exactly 500 bricks are required per cubic meter of finished brick masonry. Dry volume of mortar required is 30% to 33% of wall volume (dry mortar factor is 1.33). For 1:6 cement-sand mortar, cement requirement is 1.44 bags/m3 masonry and sand is 0.28 m3/m3. Openings > 0.1 sq.m are deducted from wall volume.",
        "bricks_per_m3": 500,
        "mortar_dry_factor": 1.33,
        "mortar_1_6_cement_bags_m3": 1.44,
        "mortar_1_6_sand_m3_m3": 0.28
    },
    {
        "id": "rag-plaster-is1200",
        "standard_code": "IS 1200 Part 12",
        "clause_ref": "Clause 3.2",
        "topic": "Plastering Thickness, Ratios, and Deduction Rules",
        "category": "PLASTER",
        "keywords": ["plaster", "plastering", "internal plaster", "external plaster", "deduction", "jambs"],
        "content": "Standard internal plaster thickness is 12 mm with 1:6 cement mortar. External plaster is 18 mm (or 2 coats 12mm + 6mm) with 1:4 cement mortar. Deductions for openings: No deduction for <= 0.5 sq.m; deduction for one face only for 0.5 to 3.0 sq.m; deductions for both faces for > 3.0 sq.m with additions for jambs/sills. Plaster dry mortar factor is 1.30.",
        "internal_plaster_thick_mm": 12,
        "external_plaster_thick_mm": 18
    },
    {
        "id": "rag-steel-is456",
        "standard_code": "IS 456:2000",
        "clause_ref": "Clause 26.5",
        "topic": "Reinforcement Steel Thumb Rules for Estimation",
        "category": "STRUCTURAL",
        "keywords": ["steel", "rebar", "reinforcement", "tmt", "structural", "kg", "tonnage"],
        "content": "For preliminary quantity estimation when detailed structural bar-bending schedules (BBS) are unavailable: RCC Slab requires 0.7% to 1.0% steel by concrete volume (approx 55 to 80 kg/m3); RCC Beams require 1.0% to 1.8% (approx 80 to 140 kg/m3); RCC Columns require 1.5% to 2.5% (approx 120 to 200 kg/m3); Footings require 0.5% to 0.8% (approx 40 to 65 kg/m3). Density of steel is 7850 kg/m3.",
        "steel_density_kg_m3": 7850
    },
    {
        "id": "rag-flooring-rules",
        "standard_code": "IS 1200 Part 11",
        "clause_ref": "Clause 2.1",
        "topic": "Flooring and Skirting Measurement",
        "category": "FLOORING",
        "keywords": ["flooring", "tiles", "skirting", "carpet area", "vitrified", "ceramic", "granite"],
        "content": "Flooring is measured as the net carpet area between finished wall faces. Standard tile wastage allowance is 5% to 8% for regular rectangular rooms and 10% for diagonal layouts or high-cut configurations. Skirting is calculated on room perimeter minus door openings, typically 100 mm to 150 mm height.",
        "tile_waste_factor": 1.08
    }
]

class RAGEngine:
    def __init__(self):
        self.rules = CONSTRUCTION_KNOWLEDGE_BASE

    def search(self, query: str, category: Optional[str] = None, limit: int = 4) -> List[Dict[str, Any]]:
        """Search knowledge base using keyword matching and relevance scoring."""
        query_tokens = set(re.findall(r"\w+", query.lower()))
        results = []
        for rule in self.rules:
            if category and rule.get("category") != category:
                continue
            
            score = 0.0
            # Check keywords match
            keywords = rule.get("keywords", [])
            for kw in keywords:
                for token in query_tokens:
                    if token in kw.lower() or kw.lower() in token:
                        score += 2.0
            
            # Check content match
            content = rule.get("content", "").lower()
            topic = rule.get("topic", "").lower()
            for token in query_tokens:
                if len(token) > 2:
                    if token in topic:
                        score += 3.0
                    elif token in content:
                        score += 1.0

            if score > 0:
                item = dict(rule)
                item["relevance_score"] = round(min(1.0, score / 10.0), 3)
                results.append(item)

        results.sort(key=lambda x: x["relevance_score"], reverse=True)
        return results[:limit]

    def get_rule_by_id(self, rule_id: str) -> Optional[Dict[str, Any]]:
        for r in self.rules:
            if r["id"] == rule_id:
                return r
        return None

rag_engine = RAGEngine()
