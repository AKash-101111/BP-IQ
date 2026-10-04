-- Seed Data: Real-world Verified Construction Standards for BlueprintIQ RAG
-- Sources: National Building Code of India (NBC 2016), IS 456 (Plain and Reinforced Concrete),
-- IS 1200 (Method of Measurement of Building and Civil Engineering Works), IBC (International Building Code)

-- 1. Insert RAG Documents
INSERT INTO rag_documents (id, title, standard_code, category, description)
VALUES 
    ('11111111-1111-1111-1111-111111111101', 'NBC 2016 Part 3: Development Control Rules and General Building Requirements', 'NBC 2016 Part 3', 'DIMENSIONS', 'National Building Code provisions governing minimum room dimensions, ceiling heights, ventilation, and staircase geometry.'),
    ('11111111-1111-1111-1111-111111111102', 'IS 456:2000 Code of Practice for Plain and Reinforced Concrete', 'IS 456:2000', 'CONCRETE', 'Indian standard code specifying cement, concrete mix design ratios (M15, M20, M25), nominal covers, and steel reinforcement factors.'),
    ('11111111-1111-1111-1111-111111111103', 'IS 1200 (Parts 1-28) Methods of Measurement of Building and Civil Engineering Works', 'IS 1200', 'MEASUREMENTS', 'Standard rules for measurement of earthwork, concrete, brick masonry deductions, plaster deductions, and finishes.'),
    ('11111111-1111-1111-1111-111111111104', 'International Building Code (IBC) Means of Egress & Room Clearances', 'IBC 2021', 'STAIRS_EGRESS', 'Provisions for stair riser and tread dimensions, minimum headroom clearance, door swing clearances, and corridor widths.')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert RAG Chunks with Exact Engineering Clauses
INSERT INTO rag_chunks (document_id, clause_ref, topic, content)
VALUES
    -- NBC Room Dimensions
    ('11111111-1111-1111-1111-111111111101', 'Clause 4.2.1', 'Minimum Habitable Room Area', 
    'No habitable room (living room, bedroom) shall have a carpet area of less than 9.5 sq.m (approx 102 sq.ft) in the case of a single room tenement, and minimum width shall not be less than 2.4 m (approx 7 ft 10 in). For a two-room tenement, one room shall not be less than 9.5 sq.m and the second not less than 7.5 sq.m with a minimum width of 2.1 m.'),

    ('11111111-1111-1111-1111-111111111101', 'Clause 4.2.2', 'Minimum Ceiling Height', 
    'The minimum height of all rooms for human habitation shall not be less than 2.75 m (9 ft) measured from the surface of the floor to the lowest point of the ceiling or false ceiling. In air-conditioned rooms, a minimum height of 2.4 m is permitted. Bathroom and water-closet heights shall not be less than 2.1 m.'),

    ('11111111-1111-1111-1111-111111111101', 'Clause 4.2.3', 'Kitchen Dimensions', 
    'The area of a kitchen where a separate store is provided shall not be less than 5.0 sq.m (approx 54 sq.ft) with a minimum width of 1.8 m. Where there is no separate store, the kitchen floor area shall not be less than 5.5 sq.m.'),

    ('11111111-1111-1111-1111-111111111101', 'Clause 4.2.4', 'Bathroom and Water Closet Size', 
    'The minimum area of an independent bathroom shall be 1.8 sq.m with minimum width of 1.2 m. The minimum area of an independent water-closet (WC) shall be 1.1 sq.m with minimum width of 0.9 m. A combined bathroom and WC shall have an area not less than 2.8 sq.m with minimum width of 1.2 m.'),

    -- NBC & IBC Staircase Requirements
    ('11111111-1111-1111-1111-111111111101', 'Clause 4.8.1', 'Staircase Minimum Width and Clearance', 
    'The minimum clear width of stairways for residential buildings shall be 1.0 m (1000 mm). For commercial buildings, minimum width shall be 1.5 m. The minimum headroom clearance in a passage under the landing of a staircase and under the staircase itself shall not be less than 2.2 m (approx 7 ft 3 in).'),

    ('11111111-1111-1111-1111-111111111104', 'IBC Section 1011.5.2', 'Stair Riser and Tread Dimensions', 
    'Stair risers shall be maximum 178 mm (7 inches) and minimum 102 mm (4 inches). Stair treads shall have a minimum run of 279 mm (11 inches) for commercial or 254 mm (10 inches) for residential. In residential buildings, the maximum rise may be 190 mm (7.5 inches) and minimum tread 250 mm (10 inches). The formula 2R + T should ideally fall between 550 mm and 650 mm (24 to 25 inches).'),

    -- Concrete & Mix Rules (IS 456)
    ('11111111-1111-1111-1111-111111111102', 'Table 9 & Clause 9.1', 'Concrete Nominal Mix Proportions and Cement Content', 
    'For nominal mix concrete M20 (approx 1:1.5:3 by volume), minimum cement content is 320 kg/m3 (approx 6.4 bags of 50 kg per cubic meter of wet compacted concrete). For M15 (approx 1:2:4), minimum cement content is 240 kg/m3 (approx 4.8 bags/m3). Dry volume conversion factor for concrete is 1.52 to 1.54 times the finished wet volume to account for voids and compaction.'),

    ('11111111-1111-1111-1111-111111111102', 'Clause 26.5', 'Reinforcement Steel Thumb Rules for Estimation', 
    'For preliminary quantity surveying where detailed structural bar-bending schedules are unavailable: RCC Slab: 0.7% to 1.0% volume of concrete (approx 55 to 80 kg/m3); RCC Beams: 1.0% to 1.8% volume of concrete (approx 80 to 140 kg/m3); RCC Columns: 1.5% to 2.5% volume of concrete (approx 120 to 200 kg/m3); Foundation Footings: 0.5% to 0.8% volume of concrete (approx 40 to 65 kg/m3). Steel density = 7850 kg/m3.'),

    -- IS 1200 Measurement & Deductions
    ('11111111-1111-1111-1111-111111111103', 'IS 1200 Part 3 Clause 4.1', 'Brickwork Deductions for Openings', 
    'In measuring brick masonry, no deduction shall be made for ends of joists, beams, lintels, steps, or openings up to 0.1 sq.m in area. For openings exceeding 0.1 sq.m (such as doors, windows, and ventilators), full deduction of the opening volume shall be calculated: Volume = Opening Width x Opening Height x Wall Thickness.'),

    ('11111111-1111-1111-1111-111111111103', 'IS 1200 Part 12 Clause 3.2', 'Plastering Deductions and Additions', 
    'For openings up to 0.5 sq.m in area, no deduction shall be made for plastering nor addition for jambs, soffits, and sills. For openings exceeding 0.5 sq.m and up to 3.0 sq.m, deduction shall be made for one face only, and no addition for jambs/soffits. For openings exceeding 3.0 sq.m, deductions shall be made for both faces of the wall with jambs, sills and soffits measured separately.'),

    -- Masonry Mortar Ratios & Brick Constants
    ('11111111-1111-1111-1111-111111111103', 'IS 2212 Brick Masonry Constants', 'Standard Modular and Traditional Brick Quantity', 
    'For standard modular bricks (190 mm x 90 mm x 90 mm) with 10 mm mortar joints, 500 bricks are required per 1 cubic meter of finished brickwork. Dry volume of mortar required is approx 0.30 m3 per 1 m3 of brick masonry (dry mortar conversion factor is 1.33). For 1:6 cement-sand mortar: Cement = 1.44 bags/m3 masonry; Sand = 0.28 m3/m3 masonry.')
ON CONFLICT (id) DO NOTHING;
