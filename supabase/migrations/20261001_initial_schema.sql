-- BlueprintIQ PostgreSQL + pgvector Schema
-- Extension for vector embeddings
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    building_type VARCHAR(100) NOT NULL DEFAULT 'Residential', -- Residential, Commercial, Industrial, Infrastructure, Other
    floors INT NOT NULL DEFAULT 1,
    rooms_count INT DEFAULT NULL,
    approx_builtup_area NUMERIC(12, 2) DEFAULT NULL,
    plot_area NUMERIC(12, 2) DEFAULT NULL,
    unit_system VARCHAR(20) NOT NULL DEFAULT 'METRIC', -- METRIC (m, m2), IMPERIAL (ft, sq.ft)
    measurement_system VARCHAR(50) DEFAULT 'Standard',
    soil_type VARCHAR(100) DEFAULT 'Not Provided',
    location VARCHAR(255) DEFAULT 'Not Provided',
    climate_info TEXT DEFAULT 'Not Provided',
    seismic_zone VARCHAR(50) DEFAULT 'Not Provided',
    local_authority VARCHAR(255) DEFAULT 'Not Provided',
    status VARCHAR(50) NOT NULL DEFAULT 'CREATED', -- CREATED, PROCESSING, COMPLETED, REVIEW_REQUIRED, INSUFFICIENT_INFORMATION
    overall_confidence VARCHAR(20) DEFAULT 'UNKNOWN', -- HIGH, MEDIUM, LOW, UNKNOWN
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Project Metadata (Engineering & Construction Parameters)
CREATE TABLE IF NOT EXISTS project_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    floor_height NUMERIC(8, 2) DEFAULT 3.0, -- in meters or feet depending on unit_system
    wall_thickness NUMERIC(8, 2) DEFAULT 0.23, -- standard external wall (e.g. 230mm or 9")
    internal_wall_thickness NUMERIC(8, 2) DEFAULT 0.115, -- standard partition wall (e.g. 115mm or 4.5")
    slab_thickness NUMERIC(8, 2) DEFAULT 0.15, -- standard RCC slab (e.g. 150mm or 6")
    drawing_scale VARCHAR(50) DEFAULT '1:100',
    scale_calibrated BOOLEAN DEFAULT FALSE,
    scale_factor NUMERIC(10, 4) DEFAULT 1.0, -- pixels to real-world units
    cement_grade VARCHAR(50) DEFAULT 'OPC 43', -- OPC 43, OPC 53, PPC, Not Provided
    concrete_grade VARCHAR(50) DEFAULT 'M20', -- M15, M20, M25, M30, Not Provided
    brick_type VARCHAR(100) DEFAULT 'Clay Brick (Modular 190x90x90mm)', -- Fly ash brick, AAC Block, Concrete block
    mortar_ratio VARCHAR(50) DEFAULT '1:6', -- 1:4, 1:6, Not Provided
    plaster_ratio VARCHAR(50) DEFAULT '1:6', -- 1:4 internal, 1:6 external
    steel_assumptions VARCHAR(100) DEFAULT 'Fe500 TMT (Standard 1.2% thumb rule)',
    flooring_type VARCHAR(100) DEFAULT 'Vitrified Tiles (600x600mm)',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_project_metadata UNIQUE (project_id)
);

-- 3. Blueprints
CREATE TABLE IF NOT EXISTS blueprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    page_count INT NOT NULL DEFAULT 1,
    scale_ratio VARCHAR(50) DEFAULT '1:100',
    scale_unit VARCHAR(20) DEFAULT 'm',
    is_calibrated BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'UPLOADED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Blueprint Pages
CREATE TABLE IF NOT EXISTS blueprint_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blueprint_id UUID NOT NULL REFERENCES blueprints(id) ON DELETE CASCADE,
    page_number INT NOT NULL,
    image_path TEXT NOT NULL,
    marked_image_path TEXT,
    width INT NOT NULL,
    height INT NOT NULL,
    dpi INT DEFAULT 150,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_page_per_blueprint UNIQUE (blueprint_id, page_number)
);

-- 5. Extracted Objects (Rooms, Walls, Openings, Stairs, Dimensions)
CREATE TABLE IF NOT EXISTS extracted_objects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES blueprint_pages(id) ON DELETE CASCADE,
    object_type VARCHAR(50) NOT NULL, -- room, wall, door, window, staircase, dimension_callout, column, grid_line
    label VARCHAR(255),
    bbox JSONB NOT NULL, -- { "x": 0, "y": 0, "width": 100, "height": 100 }
    confidence NUMERIC(5, 4) NOT NULL DEFAULT 0.85,
    attributes JSONB DEFAULT '{}'::jsonb, -- custom properties (area, length, angle, orientation)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Rooms
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES blueprint_pages(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    stated_area NUMERIC(10, 2), -- area text read from blueprint
    measured_area NUMERIC(10, 2) NOT NULL, -- area calculated from polygon geometry
    width NUMERIC(10, 2),
    length NUMERIC(10, 2),
    perimeter NUMERIC(10, 2),
    height NUMERIC(10, 2) DEFAULT 3.0,
    bbox JSONB NOT NULL,
    confidence NUMERIC(5, 4) NOT NULL DEFAULT 0.85,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Walls
CREATE TABLE IF NOT EXISTS walls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES blueprint_pages(id) ON DELETE CASCADE,
    wall_type VARCHAR(50) DEFAULT 'EXTERNAL', -- EXTERNAL, INTERNAL, PARTITION
    length NUMERIC(10, 2) NOT NULL,
    thickness NUMERIC(8, 2) NOT NULL,
    height NUMERIC(8, 2) NOT NULL,
    volume NUMERIC(10, 3) NOT NULL, -- length * thickness * height
    start_point JSONB NOT NULL, -- { "x": 10, "y": 20 }
    end_point JSONB NOT NULL,
    bbox JSONB NOT NULL,
    confidence NUMERIC(5, 4) DEFAULT 0.85,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Openings (Doors & Windows)
CREATE TABLE IF NOT EXISTS openings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES blueprint_pages(id) ON DELETE CASCADE,
    opening_type VARCHAR(50) NOT NULL, -- DOOR, WINDOW, VENTILATOR
    label VARCHAR(100),
    width NUMERIC(8, 2) NOT NULL,
    height NUMERIC(8, 2) NOT NULL,
    area NUMERIC(8, 2) NOT NULL,
    volume NUMERIC(8, 3) NOT NULL,
    wall_ref UUID REFERENCES walls(id) ON DELETE SET NULL,
    bbox JSONB NOT NULL,
    confidence NUMERIC(5, 4) DEFAULT 0.85,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Extracted Dimensions
CREATE TABLE IF NOT EXISTS extracted_dimensions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES blueprint_pages(id) ON DELETE CASCADE,
    text_value VARCHAR(100) NOT NULL,
    numeric_value NUMERIC(10, 3),
    unit VARCHAR(20) DEFAULT 'm',
    orientation VARCHAR(20) DEFAULT 'HORIZONTAL', -- HORIZONTAL, VERTICAL, ALIGNED
    bbox JSONB NOT NULL,
    confidence NUMERIC(5, 4) DEFAULT 0.85,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. BOQ Items (Bill of Quantities)
CREATE TABLE IF NOT EXISTS boq_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL, -- CIVIL_WORKS, MASONRY, CONCRETE, PLASTER, FLOORING, PAINTING, STRUCTURAL
    item_code VARCHAR(50) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    estimated_quantity NUMERIC(12, 3) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    range_min NUMERIC(12, 3) NOT NULL,
    range_max NUMERIC(12, 3) NOT NULL,
    confidence VARCHAR(20) NOT NULL DEFAULT 'MEDIUM', -- HIGH, MEDIUM, LOW
    calculation_basis TEXT NOT NULL,
    assumptions TEXT NOT NULL,
    uncertainty_reasons JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Material Estimates
CREATE TABLE IF NOT EXISTS material_estimates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    material_name VARCHAR(100) NOT NULL, -- Cement, Sand, Aggregate, Bricks, Steel, Tiles, Paint, Plaster
    estimated_quantity NUMERIC(12, 3) NOT NULL,
    unit VARCHAR(50) NOT NULL, -- bags, m3, nos, kg, sq.m, litres
    range_min NUMERIC(12, 3) NOT NULL,
    range_max NUMERIC(12, 3) NOT NULL,
    confidence VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    calculation_basis TEXT NOT NULL,
    formula_ref VARCHAR(100),
    assumptions TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Issues (Anomalies, Mismatches, Code Considerations)
CREATE TABLE IF NOT EXISTS issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    blueprint_id UUID REFERENCES blueprints(id) ON DELETE SET NULL,
    page_number INT NOT NULL DEFAULT 1,
    issue_code VARCHAR(50) NOT NULL, -- ISSUE-001, ISSUE-002...
    issue_type VARCHAR(100) NOT NULL, -- DIMENSION_INCONSISTENCY, MISSING_INFORMATION, CLEARANCE_CONCERN, GEOMETRY_ANOMALY, CODE_CONSIDERATION
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM', -- INFO, LOW, MEDIUM, HIGH, CRITICAL
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    evidence TEXT NOT NULL,
    detected_value TEXT,
    expected_value TEXT,
    difference_pct NUMERIC(6, 2),
    bbox JSONB, -- Coordinates on drawing { "x": 100, "y": 200, "width": 80, "height": 60 }
    confidence VARCHAR(20) DEFAULT 'MEDIUM',
    source VARCHAR(255) DEFAULT 'Geometric & Rule Inspection',
    rag_reference TEXT,
    recommendation TEXT NOT NULL,
    verification_required BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Analysis Runs (Pipeline Execution Tracking)
CREATE TABLE IF NOT EXISTS analysis_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    blueprint_id UUID REFERENCES blueprints(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, FAILED
    current_stage VARCHAR(50) NOT NULL DEFAULT 'UPLOAD',
    progress_pct INT NOT NULL DEFAULT 0,
    model_used VARCHAR(50) DEFAULT 'Gemma 2B (Ollama)',
    overall_confidence VARCHAR(20) DEFAULT 'MEDIUM',
    missing_inputs JSONB DEFAULT '[]'::jsonb,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 14. RAG Documents & Chunks (Construction Standards)
CREATE TABLE IF NOT EXISTS rag_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    standard_code VARCHAR(100) NOT NULL, -- NBC 2016, IS 456, IS 1200, IBC 2021
    category VARCHAR(100) NOT NULL, -- DIMENSIONS, STAIRS, MATERIALS, STRUCTURAL, MASONRY
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rag_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
    clause_ref VARCHAR(100) NOT NULL, -- e.g. Clause 4.2.1, Section 1011.2
    topic VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768), -- pgvector for standard embeddings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. User Assumptions & Analysis Reports
CREATE TABLE IF NOT EXISTS user_assumptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    assumption_key VARCHAR(100) NOT NULL,
    applied_value TEXT NOT NULL,
    rationale TEXT NOT NULL,
    impact_level VARCHAR(20) DEFAULT 'MEDIUM',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analysis_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    blueprint_id UUID REFERENCES blueprints(id) ON DELETE SET NULL,
    summary_text TEXT NOT NULL,
    approval_status VARCHAR(50) NOT NULL DEFAULT 'ANALYSIS COMPLETE', -- ANALYSIS COMPLETE, REVIEW REQUIRED, INSUFFICIENT INFORMATION
    report_json JSONB NOT NULL,
    pdf_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_extracted_objects_page ON extracted_objects(page_id);
CREATE INDEX IF NOT EXISTS idx_rooms_page ON rooms(page_id);
CREATE INDEX IF NOT EXISTS idx_walls_page ON walls(page_id);
CREATE INDEX IF NOT EXISTS idx_boq_items_project ON boq_items(project_id);
CREATE INDEX IF NOT EXISTS idx_material_estimates_project ON material_estimates(project_id);
CREATE INDEX IF NOT EXISTS idx_issues_project ON issues(project_id);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_clause ON rag_chunks(clause_ref);

-- RLS Policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Allow access on projects') THEN
        CREATE POLICY "Allow access on projects" ON projects FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

ALTER TABLE analysis_reports ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analysis_reports' AND policyname = 'Allow access on analysis_reports') THEN
        CREATE POLICY "Allow access on analysis_reports" ON analysis_reports FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

ALTER TABLE analysis_runs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analysis_runs' AND policyname = 'Allow access on analysis_runs') THEN
        CREATE POLICY "Allow access on analysis_runs" ON analysis_runs FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

ALTER TABLE boq_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'boq_items' AND policyname = 'Allow access on boq_items') THEN
        CREATE POLICY "Allow access on boq_items" ON boq_items FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

ALTER TABLE material_estimates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'material_estimates' AND policyname = 'Allow access on material_estimates') THEN
        CREATE POLICY "Allow access on material_estimates" ON material_estimates FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'issues' AND policyname = 'Allow access on issues') THEN
        CREATE POLICY "Allow access on issues" ON issues FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

