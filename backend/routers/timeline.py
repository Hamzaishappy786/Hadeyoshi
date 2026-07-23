import uuid
import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import SQLModel, Field, Session, create_engine, select

router = APIRouter()

DB_PATH = Path(__file__).parent.parent / "projects" / "projects.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
engine = create_engine(f"sqlite:///{DB_PATH}")


class ProjectRecord(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    path: str
    created_at: str
    updated_at: str
    data: str  # JSON blob


SQLModel.metadata.create_all(engine)


class CreateProjectRequest(BaseModel):
    name: str
    data: dict


class UpdateProjectRequest(BaseModel):
    data: dict


@router.post("/projects")
def create_project(req: CreateProjectRequest):
    project_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    record = ProjectRecord(
        id=project_id,
        name=req.name,
        path="",
        created_at=now,
        updated_at=now,
        data=json.dumps(req.data),
    )
    with Session(engine) as session:
        session.add(record)
        session.commit()
    return {"id": project_id, "created_at": now}


@router.get("/projects")
def list_projects():
    with Session(engine) as session:
        records = session.exec(select(ProjectRecord)).all()
        return [
            {
                "id": r.id,
                "name": r.name,
                "created_at": r.created_at,
                "updated_at": r.updated_at,
            }
            for r in records
        ]


@router.get("/projects/{project_id}")
def get_project(project_id: str):
    with Session(engine) as session:
        record = session.get(ProjectRecord, project_id)
        if not record:
            raise HTTPException(status_code=404, detail="Project not found")
        return {**json.loads(record.data), "id": record.id, "name": record.name}


@router.put("/projects/{project_id}")
def update_project(project_id: str, req: UpdateProjectRequest):
    with Session(engine) as session:
        record = session.get(ProjectRecord, project_id)
        if not record:
            raise HTTPException(status_code=404, detail="Project not found")
        record.data = json.dumps(req.data)
        record.updated_at = datetime.utcnow().isoformat()
        session.add(record)
        session.commit()
    return {"ok": True}


@router.delete("/projects/{project_id}")
def delete_project(project_id: str):
    with Session(engine) as session:
        record = session.get(ProjectRecord, project_id)
        if not record:
            raise HTTPException(status_code=404, detail="Project not found")
        session.delete(record)
        session.commit()
    return {"ok": True}
