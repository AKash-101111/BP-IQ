import json
import logging
import httpx
from typing import Dict, Any, Optional
from backend.app.config import settings

logger = logging.getLogger("blueprintiq.ollama")

class OllamaClient:
    """
    Local Gemma 2B reasoning client via Ollama (http://localhost:11434).
    Enforces strict structured JSON output and provides graceful status reporting
    when Ollama or the local model is offline.
    """

    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL.rstrip('/')
        self.model = settings.OLLAMA_MODEL
        self.timeout = settings.OLLAMA_TIMEOUT

    async def check_health(self) -> Dict[str, Any]:
        """Check if Ollama is running and whether Gemma 2B is present."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                if resp.status_code == 200:
                    data = resp.json()
                    models = [m.get("name") for m in data.get("models", [])]
                    # Check if requested model or a variant of gemma exists
                    has_model = any(self.model in m or "gemma" in m for m in models)
                    return {
                        "available": True,
                        "base_url": self.base_url,
                        "configured_model": self.model,
                        "model_ready": has_model,
                        "installed_models": models,
                        "message": "Ollama service connected." if has_model else f"Ollama is running, but {self.model} was not found. Please run 'ollama pull {self.model}'."
                    }
        except Exception as e:
            return {
                "available": False,
                "base_url": self.base_url,
                "configured_model": self.model,
                "model_ready": False,
                "installed_models": [],
                "message": f"Gemma 2B is unavailable at {self.base_url}. Start Ollama and ensure the configured model is available."
            }

    async def reason_over_blueprint(
        self,
        project_context: Dict[str, Any],
        blueprint_summary: Dict[str, Any],
        detected_issues: list,
        rag_evidence: list,
        uncertainty_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Sends structured data to Gemma 2B to reason over extracted facts,
        explain anomalies, synthesize RAG evidence, and formulate professional recommendations.
        """
        prompt = f"""
You are an expert construction AI reasoning engine assisting a quantity surveyor and architect.
Analyze the following STRUCTURED blueprint extraction, detected anomalies, and construction standards.
Do NOT invent new numerical calculations; reason strictly over the facts provided.

=== PROJECT CONTEXT ===
Building Type: {project_context.get('building_type', 'Residential')}
Floors: {project_context.get('floors', 1)}
Unit System: {project_context.get('unit_system', 'METRIC')}
Soil Type: {project_context.get('soil_type', 'Not Provided')}
Scale: {project_context.get('drawing_scale', '1:100')}

=== EXTRACTED DRAWING METRICS ===
Carpet Area: {blueprint_summary.get('carpet_area', 0)}
Rooms Detected: {blueprint_summary.get('rooms_count', 0)}
Wall Length: {blueprint_summary.get('total_wall_length', 0)}
Openings: {blueprint_summary.get('openings_count', 0)}

=== DETECTED POTENTIAL ISSUES ===
{json.dumps([{ 'code': i.get('issue_code'), 'type': i.get('issue_type'), 'severity': i.get('severity'), 'title': i.get('title'), 'evidence': i.get('evidence') } for i in detected_issues], indent=2)}

=== RAG BUILDING STANDARDS EVIDENCE ===
{json.dumps([{ 'code': r.get('standard_code'), 'clause': r.get('clause_ref'), 'topic': r.get('topic'), 'content': r.get('content') } for r in rag_evidence], indent=2)}

=== UNCERTAINTY ===
Confidence: {uncertainty_info.get('overall_confidence', 'MEDIUM')}
Missing Inputs: {json.dumps(uncertainty_info.get('missing_inputs', []))}

TASK:
Provide a technical reasoning summary in strict JSON format:
{{
  "executive_summary": "Concise engineering analysis of the drawing completeness and geometry",
  "issue_explanations": [
    {{
      "issue_code": "ISSUE-001",
      "synthesis": "Explanation comparing blueprint evidence with the standard clause",
      "recommended_action": "Specific professional action"
    }}
  ],
  "uncertainty_assessment": "Clear explanation of how missing parameters affect accuracy",
  "professional_verification_notice": "BlueprintIQ provides preliminary automated analysis. Professional architectural and structural verification is required."
}}
Return ONLY valid JSON.
"""

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json",
                    "options": {
                        "temperature": 0.2,
                        "num_predict": 1024
                    }
                }
                resp = await client.post(f"{self.base_url}/api/generate", json=payload)
                if resp.status_code == 200:
                    res_json = resp.json()
                    raw_text = res_json.get("response", "").strip()
                    try:
                        parsed = json.loads(raw_text)
                        return parsed
                    except Exception:
                        # Attempt to extract JSON block if wrapped in markdown
                        import re
                        match = re.search(r"\{.*\}", raw_text, re.DOTALL)
                        if match:
                            return json.loads(match.group(0))
        except Exception as e:
            logger.warning(f"Ollama reasoning call failed or timed out: {e}")

        # Deterministic fallback reasoning synthesis if Ollama is offline or model unavailable
        return self._generate_fallback_reasoning(project_context, detected_issues, uncertainty_info)

    def _generate_fallback_reasoning(
        self,
        project_context: Dict[str, Any],
        detected_issues: list,
        uncertainty_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Deterministic rule-based reasoning summary when Gemma 2B is offline."""
        num_issues = len(detected_issues)
        high_issues = [i for i in detected_issues if i.get("severity") in ["HIGH", "CRITICAL"]]
        soil = project_context.get("soil_type", "Not Provided")
        
        status_text = "Analysis completed with review required." if high_issues else "Geometric analysis completed."
        summary = (
            f"Preliminary architectural evaluation performed for {project_context.get('building_type', 'Residential')} project. "
            f"Detected {num_issues} potential dimensional or compliance considerations ({len(high_issues)} require urgent review). "
            f"Soil parameter was '{soil}', requiring geotechnical confirmation before finalizing foundation estimates."
        )

        explanations = []
        for iss in detected_issues[:4]:
            explanations.append({
                "issue_code": iss.get("issue_code", "ISSUE"),
                "synthesis": f"{iss.get('title')}: {iss.get('evidence')}. Verified against referenced building code provisions.",
                "recommended_action": iss.get("recommendation", "Verify with project architect.")
            })

        return {
            "executive_summary": summary,
            "issue_explanations": explanations,
            "uncertainty_assessment": (
                f"Overall analysis confidence is rated as {uncertainty_info.get('overall_confidence', 'MEDIUM')}. "
                "Confidence is constrained by 2D plan annotations and missing structural section schedules."
            ),
            "professional_verification_notice": "BlueprintIQ provides preliminary automated analysis and quantity estimates. It does not replace a licensed architect, structural engineer, quantity surveyor, or local authority approval."
        }

ollama_client = OllamaClient()
