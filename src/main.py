import os
import traceback
import httpx
from typing import Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends
from sqlmodel import SQLModel, Session, create_engine

# Import modular config, models, and workflows
from src.config import settings
from src.models import Deployment, DeployRequest, DeployResponse, UpdatePromptRequest
from src.credentials import get_or_create_credential, get_or_create_openai_credential
from src.admin_workflow import get_admin_workflow
from src.user_workflow import get_user_workflow

# --- CONFIGURACIÓN DE BASE DE DATOS LOCAL ---
engine = create_engine(settings.DATABASE_URL)

def get_session():
    with Session(engine) as session:
        yield session

# --- FUNCIONES AUXILIARES DE ORQUESTACIÓN ---
async def get_telegram_bot_info(token: str) -> str:
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"https://api.telegram.org/bot{token}/getMe")
            data = response.json()
            if not data.get("ok"):
                raise HTTPException(status_code=400, detail=f"Token inválido de Telegram: {data.get('description')}")
            return data["result"]["username"]
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"No se pudo conectar a Telegram: {str(e)}")

async def create_n8n_workflow(name: str, nodes: list, connections: dict, creds: dict) -> str:
    for node in nodes:
        t = node["type"]
        if t in ["n8n-nodes-base.telegramTrigger", "n8n-nodes-base.telegram"]:
            node["credentials"] = {"telegramApi": creds["telegram"]}
        elif t in ["@n8n/n8n-nodes-langchain.vectorStorePGVector", "n8n-nodes-base.postgres"]:
            node["credentials"] = {"postgres": creds["postgres"]}
        elif t in [
            "@n8n/n8n-nodes-langchain.embeddingsOpenAi",
            "@n8n/n8n-nodes-langchain.lmChatOpenAi",
            "@n8n/n8n-nodes-langchain.openAi",
            "n8n-nodes-base.openAi"
        ]:
            node["credentials"] = {"openAiApi": creds["openai"]}

    payload = {"name": name, "nodes": nodes, "connections": connections, "settings": {}}
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{settings.N8N_API_URL}/workflows", json=payload, headers=settings.n8n_headers)
        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=500, detail=f"Error creando flujo: {resp.text}")

        wf_id = resp.json()["id"]
        act = await client.post(f"{settings.N8N_API_URL}/workflows/{wf_id}/activate", headers=settings.n8n_headers)
        if act.status_code not in (200, 201):
            raise HTTPException(status_code=500, detail=f"Error activando flujo: {act.text}")
        return wf_id

async def update_n8n_workflow(wf_id: str, name: str, nodes: list, connections: dict, creds: dict):
    for node in nodes:
        t = node["type"]
        if t in ["n8n-nodes-base.telegramTrigger", "n8n-nodes-base.telegram"]:
            node["credentials"] = {"telegramApi": creds["telegram"]}
        elif t in ["@n8n/n8n-nodes-langchain.vectorStorePGVector", "n8n-nodes-base.postgres"]:
            node["credentials"] = {"postgres": creds["postgres"]}
        elif t in [
            "@n8n/n8n-nodes-langchain.embeddingsOpenAi",
            "@n8n/n8n-nodes-langchain.lmChatOpenAi",
            "@n8n/n8n-nodes-langchain.openAi",
            "n8n-nodes-base.openAi"
        ]:
            node["credentials"] = {"openAiApi": creds["openai"]}

    payload = {"name": name, "nodes": nodes, "connections": connections, "settings": {}}
    async with httpx.AsyncClient() as client:
        resp = await client.put(f"{settings.N8N_API_URL}/workflows/{wf_id}", json=payload, headers=settings.n8n_headers)
        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=500, detail=f"Error actualizando flujo: {resp.text}")

async def delete_n8n_entity(entity_type: str, entity_id: str):
    async with httpx.AsyncClient() as client:
        try:
            await client.delete(f"{settings.N8N_API_URL}/{entity_type}/{entity_id}", headers=settings.n8n_headers)
        except Exception:
            pass

# --- APLICACIÓN FASTAPI ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    SQLModel.metadata.create_all(engine)
    yield

app = FastAPI(title="N8N Automation API", lifespan=lifespan)

# --- DEPLOY ---
@app.post("/deploy", response_model=DeployResponse)
async def create_deployment(req: DeployRequest, db: Session = Depends(get_session)):
    try:
        admin_user = await get_telegram_bot_info(req.admin_token)
        user_user  = await get_telegram_bot_info(req.user_token)
        # 1. Crear registro en BD primero para obtener el ID de despliegue
        new_deployment = Deployment(
            admin_bot_token=req.admin_token, admin_bot_username=admin_user,
            user_bot_token=req.user_token,   user_bot_username=user_user,
            n8n_admin_cred_id="", n8n_user_cred_id="",
            n8n_admin_workflow_id="", n8n_user_workflow_id="",
            openai_cred_id="", extra_prompt=req.extra_prompt or ""
        )
        db.add(new_deployment)
        db.commit()
        db.refresh(new_deployment)

        deploy_id = new_deployment.id

        # 2. Crear credenciales (Postgres es global, las demás usan deploy_id)
        pg_cred_id = await get_or_create_credential("Global Postgres", "postgres", {
            "host": settings.POSTGRES_HOST, "database": settings.POSTGRES_DB, "user": settings.POSTGRES_USER,
            "password": settings.POSTGRES_PASSWORD, "port": 5432, "ssl": "disable", "sshTunnel": False
        })

        openai_cred_id, openai_cred_name = await get_or_create_openai_credential(
            req.openai_api_key, f"{admin_user} - {deploy_id}"
        )

        admin_cred_id = await get_or_create_credential(
            f"Admin Cred - {admin_user} - {deploy_id}", "telegramApi", {"accessToken": req.admin_token}
        )
        user_cred_id = await get_or_create_credential(
            f"User Cred - {user_user} - {deploy_id}", "telegramApi", {"accessToken": req.user_token}
        )

        shared = {"postgres": {"id": pg_cred_id, "name": "Global Postgres"},
                  "openai":   {"id": openai_cred_id, "name": openai_cred_name}}

        admin_creds = {**shared, "telegram": {"id": admin_cred_id, "name": f"Admin Cred - {admin_user} - {deploy_id}"}}
        user_creds  = {**shared, "telegram": {"id": user_cred_id,  "name": f"User Cred - {user_user} - {deploy_id}"}}

        safe_bot_id = f"{admin_user.replace('@', '').lower()}_{deploy_id}"
        
        # 3. Crear flujos usando el deploy_id en los nombres y metadata
        admin_n, admin_c = get_admin_workflow(bot_id=safe_bot_id)
        admin_wf_id = await create_n8n_workflow(f"Bot Admin: {admin_user} (Deploy #{deploy_id})", admin_n, admin_c, admin_creds)

        user_n, user_c = get_user_workflow(extra_prompt=req.extra_prompt, bot_id=safe_bot_id, openai_api_key=req.openai_api_key)
        user_wf_id = await create_n8n_workflow(f"Bot User: {user_user} (Deploy #{deploy_id})", user_n, user_c, user_creds)

        # 4. Actualizar el registro con los IDs reales de N8N
        new_deployment.n8n_admin_cred_id = admin_cred_id
        new_deployment.n8n_user_cred_id = user_cred_id
        new_deployment.n8n_admin_workflow_id = admin_wf_id
        new_deployment.n8n_user_workflow_id = user_wf_id
        new_deployment.openai_cred_id = openai_cred_id
        db.commit()

        return DeployResponse(
            message="Despliegue completado con éxito.",
            admin_bot_link=f"https://t.me/{admin_user}",
            user_bot_link=f"https://t.me/{user_user}",
            deployment_id=new_deployment.id
        )

    except HTTPException as he:
        raise he
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@app.get("/deploy")
async def list_deployments(db: Session = Depends(get_session)):
    from sqlmodel import select
    deployments = db.exec(select(Deployment)).all()
    return [
        {
            "deployment_id": d.id,
            "admin_bot": d.admin_bot_username,
            "user_bot": d.user_bot_username
        }
        for d in deployments
    ]

@app.put("/deploy/{deployment_id}/prompt")
async def update_deployment_prompt(deployment_id: int, req: UpdatePromptRequest, db: Session = Depends(get_session)):
    deployment = db.get(Deployment, deployment_id)
    if not deployment:
        raise HTTPException(status_code=404, detail="Despliegue no encontrado")

    try:
        safe_bot_id = f"{deployment.admin_bot_username.replace('@', '').lower()}_{deployment.id}"
        
        # Necesitamos el API key crudo para inyectarlo en el workflow crudo
        from sqlmodel import select
        from src.models import BotCredential
        openai_cred = db.exec(select(BotCredential).where(BotCredential.id == deployment.openai_cred_id)).first()
        raw_openai_key = openai_cred.credentials if openai_cred else "sk-unknown"

        user_n, user_c = get_user_workflow(extra_prompt=req.extra_prompt, bot_id=safe_bot_id, openai_api_key=raw_openai_key)

        # Restore the credential maps expected by N8N
        openai_cred_name = f"{deployment.admin_bot_username} - {deployment.id}"
        user_creds = {
            "telegram": {"id": deployment.n8n_user_cred_id, "name": f"User Cred - {deployment.user_bot_username}"},
            "postgres": {"id": "1", "name": "Global Postgres"}, # We just need the IDs to update node properly.
            "openai": {"id": deployment.openai_cred_id, "name": openai_cred_name}
        }
        # In this implementation, the Postgres credential ID is shared and could be fetched correctly.
        # But for robustness, we fetch it dynamically from N8N if needed. However, since the database
        # is recreated, N8N postgres ID is actually `pg_cred_id`. Let's fetch it using a helper if necessary.
        # For simplicity, we just look up the postgres ID using our existing helper.
        pg_cred_id = await get_or_create_credential("Global Postgres", "postgres", {
            "host": settings.POSTGRES_HOST, "database": settings.POSTGRES_DB, "user": settings.POSTGRES_USER,
            "password": settings.POSTGRES_PASSWORD, "port": 5432, "ssl": "disable", "sshTunnel": False
        })
        user_creds["postgres"]["id"] = pg_cred_id

        await update_n8n_workflow(deployment.n8n_user_workflow_id, f"Bot User: {deployment.user_bot_username}", user_n, user_c, user_creds)

        deployment.extra_prompt = req.extra_prompt
        db.commit()
        return {"message": "Prompt actualizado con éxito y sincronizado con N8N."}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error actualizando prompt: {str(e)}")

@app.delete("/deploy/{deployment_id}")
async def delete_deployment(deployment_id: int, db: Session = Depends(get_session)):
    deployment = db.get(Deployment, deployment_id)
    if not deployment:
        raise HTTPException(status_code=404, detail="Despliegue no encontrado")

    # 1. Eliminar de N8N
    await delete_n8n_entity("workflows",   deployment.n8n_admin_workflow_id)
    await delete_n8n_entity("workflows",   deployment.n8n_user_workflow_id)
    await delete_n8n_entity("credentials", deployment.n8n_admin_cred_id)
    await delete_n8n_entity("credentials", deployment.n8n_user_cred_id)
    if deployment.openai_cred_id:
        await delete_n8n_entity("credentials", deployment.openai_cred_id)

    # 2. Eliminar la tabla de vectores dedicada en la base de datos documental (PGVector)
    safe_bot_id = f"{deployment.admin_bot_username.replace('@', '').lower()}_{deployment.id}"
    try:
        from sqlalchemy import text
        table_name = f"n8n_vectors_{safe_bot_id}"
        db.execute(text(f'DROP TABLE IF EXISTS "{table_name}";'))
    except Exception as e:
        db.rollback() # Prevenir InFailedSqlTransaction
        print(f"Aviso: No se pudo eliminar la tabla de vectores {table_name}. Detalle: {e}")

    # 3. Eliminar el registro en la API (Deployment)
    db.delete(deployment)
    db.commit()
    return {"message": f"Despliegue {deployment_id} y sus vectores han sido eliminados correctamente."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)