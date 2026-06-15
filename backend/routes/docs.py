from fastapi import APIRouter
from services.doc_service import DocService

router = APIRouter(
    prefix="/api/docs",
    tags=["Docs"]
)

@router.get("/")
def get_docs():
    return DocService.get_all_docs()

# ADD
@router.post("/")
def add_doc(doc: dict):
    return DocService.add_doc(doc)