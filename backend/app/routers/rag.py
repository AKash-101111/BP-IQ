import logging
from typing import List, Optional
from fastapi import APIRouter
from pydantic import BaseModel
from backend.app.services.rag_engine import rag_engine

router = APIRouter(prefix="/rag", tags=["rag"])

class RAGSearchRequest(BaseModel):
    query: str
    category: Optional[str] = None
    limit: int = 5

@router.post("/search")
def search_rag(req: RAGSearchRequest):
    return rag_engine.search(query=req.query, category=req.category, limit=req.limit)

@router.get("/standards")
def list_standards():
    return rag_engine.rules
