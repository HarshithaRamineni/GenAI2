"""API routes for workspace management."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.database import get_db
from app.models import Workspace, WorkspacePaper

router = APIRouter(prefix="/api/workspaces", tags=["workspaces"])


class CreateWorkspaceRequest(BaseModel):
    name: str


class AddPaperRequest(BaseModel):
    paper_id: str


@router.get("")
async def list_workspaces(db: AsyncSession = Depends(get_db)):
    """List all workspaces."""
    stmt = select(Workspace).order_by(Workspace.created_at.desc())
    result = await db.execute(stmt)
    workspaces = result.scalars().all()

    response = []
    for ws in workspaces:
        # Get paper IDs for this workspace
        paper_stmt = select(WorkspacePaper.paper_id).where(
            WorkspacePaper.workspace_id == ws.id
        )
        paper_result = await db.execute(paper_stmt)
        paper_ids = [row[0] for row in paper_result.fetchall()]

        response.append({
            "id": ws.id,
            "name": ws.name,
            "paper_ids": paper_ids,
            "created_at": ws.created_at.isoformat() if ws.created_at else None,
        })

    return response


@router.post("")
async def create_workspace(
    request: CreateWorkspaceRequest, db: AsyncSession = Depends(get_db)
):
    """Create a new workspace."""
    workspace = Workspace(name=request.name)
    db.add(workspace)
    await db.commit()
    await db.refresh(workspace)
    return {
        "id": workspace.id,
        "name": workspace.name,
        "paper_ids": [],
        "created_at": workspace.created_at.isoformat() if workspace.created_at else None,
    }


@router.delete("/{workspace_id}")
async def delete_workspace(workspace_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a workspace."""
    stmt = select(Workspace).where(Workspace.id == workspace_id)
    result = await db.execute(stmt)
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    await db.delete(workspace)
    await db.commit()
    return {"ok": True}


@router.post("/{workspace_id}/papers")
async def add_paper_to_workspace(
    workspace_id: str,
    request: AddPaperRequest,
    db: AsyncSession = Depends(get_db),
):
    """Add a paper to a workspace."""
    # Check workspace exists
    ws_stmt = select(Workspace).where(Workspace.id == workspace_id)
    ws_result = await db.execute(ws_stmt)
    if not ws_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Check not already added
    existing = await db.execute(
        select(WorkspacePaper).where(
            WorkspacePaper.workspace_id == workspace_id,
            WorkspacePaper.paper_id == request.paper_id,
        )
    )
    if existing.scalar_one_or_none():
        return {"ok": True, "detail": "Already added"}

    wp = WorkspacePaper(workspace_id=workspace_id, paper_id=request.paper_id)
    db.add(wp)
    await db.commit()
    return {"ok": True}


@router.delete("/{workspace_id}/papers/{paper_id}")
async def remove_paper_from_workspace(
    workspace_id: str, paper_id: str, db: AsyncSession = Depends(get_db)
):
    """Remove a paper from a workspace."""
    await db.execute(
        delete(WorkspacePaper).where(
            WorkspacePaper.workspace_id == workspace_id,
            WorkspacePaper.paper_id == paper_id,
        )
    )
    await db.commit()
    return {"ok": True}
