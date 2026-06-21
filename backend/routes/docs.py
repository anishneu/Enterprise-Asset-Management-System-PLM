from fastapi import APIRouter, Depends, HTTPException

from schemas.document import DocumentCreate, DocumentUpdate
from services.doc_service import DocService
from routes.auth import get_current_user

router = APIRouter(
    prefix="/api/docs",
    tags=["Docs"],
    dependencies=[Depends(get_current_user)],
)


def _actor_name(current_user: dict) -> str:
    return current_user.get("preferred_username") or current_user.get("sub", "unknown")


@router.get("/")
def get_docs(current_user: dict = Depends(get_current_user)):
    return DocService.get_all_docs()


@router.post("/")
def add_doc(doc: DocumentCreate, current_user: dict = Depends(get_current_user)):
    actor = _actor_name(current_user)
    print(f"Creating document '{doc.dname}' requested by '{actor}'")

    result = DocService.add_doc(doc.model_dump())
    return {
        **result,
        "created_by": actor,
    }


@router.put("/{doc_id}")
def update_doc(doc_id: int, doc: DocumentUpdate, current_user: dict = Depends(get_current_user)):
    actor = _actor_name(current_user)
    print(f"Updating document {doc_id} requested by '{actor}'")

    payload = doc.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")

    existing = next((d for d in DocService.get_all_docs() if d["id"] == doc_id), None)
    if not existing:
        raise HTTPException(status_code=404, detail="Document not found")

    merged = {
        "dname": payload.get("dname", existing["dname"]),
        "ddesc": payload.get("ddesc", existing["ddesc"]),
        "doctype": payload.get("doctype", existing["doctype"]),
        "fmat": payload.get("fmat", existing["fmat"]),
    }

    result = DocService.update_doc(doc_id, merged)
    return {
        **result,
        "updated_by": actor,
    }


@router.delete("/{doc_id}")
def delete_doc(doc_id: int, current_user: dict = Depends(get_current_user)):
    actor = _actor_name(current_user)
    print(f"Deleting document {doc_id} requested by '{actor}'")

    existing = next((d for d in DocService.get_all_docs() if d["id"] == doc_id), None)
    if not existing:
        raise HTTPException(status_code=404, detail="Document not found")

    result = DocService.delete_doc(doc_id)
    return {
        **result,
        "deleted_by": actor,
    }
