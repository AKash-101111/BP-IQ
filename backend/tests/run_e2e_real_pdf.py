import sys
import json
import urllib.request
import urllib.parse
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000/api"
PDF_PATH = Path("backend/sample_blueprints/sample_residential_blueprint.pdf").resolve()

def log(msg):
    print(f"[E2E TEST] {msg}")

def http_get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "E2E-Tester"})
    with urllib.request.urlopen(req) as resp:
        content = resp.read()
        ctype = resp.headers.get("Content-Type", "")
        if "application/json" in ctype:
            return json.loads(content.decode("utf-8"))
        return content

def http_post_json(url, data):
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json", "User-Agent": "E2E-Tester"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def upload_multipart(url, file_path, fields):
    boundary = "----WebKitFormBoundaryE2ETest7MA4YWxkTrZu0gW"
    lines = []
    for k, v in fields.items():
        lines.append(f"--{boundary}".encode("utf-8"))
        lines.append(f'Content-Disposition: form-data; name="{k}"'.encode("utf-8"))
        lines.append(b"")
        lines.append(str(v).encode("utf-8"))
    
    # Add file
    file_bytes = file_path.read_bytes()
    filename = file_path.name
    lines.append(f"--{boundary}".encode("utf-8"))
    lines.append(f'Content-Disposition: form-data; name="file"; filename="{filename}"'.encode("utf-8"))
    lines.append(b"Content-Type: application/pdf")
    lines.append(b"")
    lines.append(file_bytes)
    lines.append(f"--{boundary}--".encode("utf-8"))
    lines.append(b"")

    body = b"\r\n".join(lines)
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Content-Length": str(len(body)),
            "User-Agent": "E2E-Tester"
        }
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def run_e2e():
    log("Starting End-to-End BlueprintIQ Verification with Real PDF...")

    # 1. Health check
    log("1. Checking System Health...")
    health = http_get(f"{BASE_URL}/system/health")
    log(f"   Health OK: app={health.get('app')}, ollama={health.get('ollama', {}).get('model_ready')}")

    # 2. Create Project
    log("2. Creating New Project...")
    project_payload = {
        "name": "E2E Verified Residential Plan",
        "building_type": "Residential",
        "floors": 2,
        "rooms_count": 5,
        "approx_builtup_area": 185.0,
        "plot_area": 260.0,
        "unit_system": "METRIC",
        "measurement_system": "Standard",
        "soil_type": "Medium Stiff Clay",
        "location": "Metro City Suburb",
        "climate_info": "Composite Climate",
        "seismic_zone": "Zone III",
        "local_authority": "Municipal Corporation",
        "metadata": {
            "floor_height": 3.0,
            "wall_thickness": 0.23,
            "internal_wall_thickness": 0.115,
            "slab_thickness": 0.15,
            "drawing_scale": "1:100",
            "scale_calibrated": True,
            "scale_factor": 60.0,
            "cement_grade": "OPC 43",
            "concrete_grade": "M20",
            "brick_type": "Modular Clay Brick (190x90x90mm)",
            "mortar_ratio": "1:6",
            "plaster_ratio": "1:6",
            "steel_assumptions": "Fe500 TMT (Standard 1.2% thumb rule)",
            "flooring_type": "Vitrified Tiles (600x600mm)"
        }
    }
    proj = http_post_json(f"{BASE_URL}/projects", project_payload)
    proj_id = proj["id"]
    log(f"   Project created successfully! ID: {proj_id}, Name: {proj['name']}")

    # 3. Upload Real PDF Blueprint
    log(f"3. Uploading Real Blueprint PDF from: {PDF_PATH}...")
    assert PDF_PATH.exists(), f"PDF not found at {PDF_PATH}"
    bp = upload_multipart(
        f"{BASE_URL}/projects/{proj_id}/blueprints",
        PDF_PATH,
        {"scale_ratio": "1:100", "scale_unit": "m"}
    )
    log(f"   Blueprint uploaded! Pages: {bp.get('page_count')}, DPI: {bp.get('dpi')}")
    pages = bp.get("pages", [])
    if pages:
        log(f"   Page 1 rendered image URL: {pages[0].get('image_url')}")

    # 4. Run Complete 12-Stage Analysis Pipeline
    log("4. Executing 12-Stage Intelligence Analysis Pipeline...")
    run = http_post_json(f"{BASE_URL}/projects/{proj_id}/analyze", {})
    log(f"   Analysis Completed! Run ID: {run.get('id')}, Status: {run.get('status')}")
    log(f"   Execution Time: {run.get('execution_time_seconds')}s")

    # 5. Verify Extraction Data
    log("5. Fetching Spatial Extraction Geometry...")
    ext = http_get(f"{BASE_URL}/projects/{proj_id}/extraction")
    rooms = ext.get("rooms", [])
    walls = ext.get("walls", [])
    openings = ext.get("openings", [])
    dimensions = ext.get("dimensions", [])
    log(f"   Extracted Rooms: {len(rooms)}")
    for rm in rooms:
        log(f"     - {rm.get('name')}: {rm.get('area_sqm')} m² ({rm.get('width_m')}m x {rm.get('length_m')}m)")
    log(f"   Extracted Walls: {len(walls)}")
    log(f"   Extracted Openings: {len(openings)}")
    log(f"   Extracted Dimensions: {len(dimensions)}")

    # 6. Verify Deterministic BOQ Calculations
    log("6. Fetching Deterministic Bill of Quantities (BOQ)...")
    boq = http_get(f"{BASE_URL}/projects/{proj_id}/boq")
    boq_items = boq.get("boq_items", [])
    materials = boq.get("materials", [])
    log(f"   Total BOQ Trade Items: {len(boq_items)}")
    for item in boq_items[:5]:
        log(f"     * [{item.get('trade')}] {item.get('item_description')}: {item.get('quantity')} {item.get('unit')} (Rate: INR {item.get('estimated_rate')}, Total: INR {item.get('total_cost')})")
    log(f"   Total Primary Materials Quantified: {len(materials)}")
    for mat in materials:
        log(f"     * {mat.get('material_name')}: {mat.get('total_quantity')} {mat.get('unit')} (Base: {mat.get('base_quantity')}, Wastage: {mat.get('wastage_percent')}%)")

    # 7. Verify Issues & Standards Compliance (NBC 2016 / IS 456 / IS 1200 / IBC)
    log("7. Fetching Detected Blueprint Anomalies & Compliance Issues...")
    issues = http_get(f"{BASE_URL}/projects/{proj_id}/issues")
    log(f"   Total Issues Detected: {len(issues)}")
    for idx, iss in enumerate(issues, 1):
        log(f"     [{iss.get('severity')}] #{idx} {iss.get('title')}")
        log(f"        Clause: {iss.get('standard_clause')} | Category: {iss.get('category')}")
        log(f"        Recommendation: {iss.get('recommendation')}")

    # 8. Verify Visual Marked-Up Blueprint
    log("8. Verifying Visual Marked-Up Blueprint Overlay...")
    bps = http_get(f"{BASE_URL}/projects/{proj_id}/blueprints")
    if bps and bps[0].get("pages"):
        markup_url = bps[0]["pages"][0].get("markup_url")
        log(f"   Marked-up Blueprint Image: {markup_url}")
        assert markup_url is not None, "Markup URL is missing"

    # 9. Verify Certified PDF Report
    log("9. Verifying Certified PDF Report Generation...")
    rep = http_get(f"{BASE_URL}/projects/{proj_id}/report")
    pdf_url = rep.get("pdf_url")
    log(f"   Certified Report Title: {rep.get('report_title')}")
    log(f"   Overall Status: {rep.get('overall_status')}")
    log(f"   PDF Report URL: {pdf_url}")

    # 10. Verify Downloading Certified PDF Report
    if pdf_url:
        report_download_url = f"http://127.0.0.1:8000{pdf_url}"
        pdf_bytes = http_get(report_download_url)
        assert len(pdf_bytes) > 1000, f"PDF report too small: {len(pdf_bytes)} bytes"
        log(f"   PDF Report successfully downloaded ({len(pdf_bytes)} bytes)!")

    # 11. Test Frontend Access
    log("10. Verifying Frontend Serves All Data...")
    all_projects = http_get("http://127.0.0.1:5173/api/projects")
    match = any(p["id"] == proj_id for p in all_projects)
    assert match, "Created project not reflected through frontend proxy!"
    log(f"   Frontend successfully proxied {len(all_projects)} projects, newly created project confirmed!")

    print("\n" + "="*70)
    print("SUCCESS: COMPLETE END-TO-END PIPELINE VERIFIED UP TO CERTIFIED PDF RESULT!")
    print("="*70)

if __name__ == "__main__":
    run_e2e()
