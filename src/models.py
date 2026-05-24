from typing import Optional
from sqlmodel import SQLModel, Field
from pydantic import BaseModel

# --- MODELOS DE BASE DE DATOS ---
class Deployment(SQLModel, table=True):
    __table_args__ = {"extend_existing": True}
    id: Optional[int] = Field(default=None, primary_key=True)
    admin_bot_token: str
    admin_bot_username: str
    user_bot_token: str
    user_bot_username: str
    n8n_admin_cred_id: str
    n8n_user_cred_id: str
    n8n_admin_workflow_id: str
    n8n_user_workflow_id: str
    openai_cred_id: str
    extra_prompt: str

# --- ESQUEMAS API (VALIDACIÓN) ---
class DeployRequest(BaseModel):
    admin_token: str
    user_token: str
    openai_api_key: str
    extra_prompt: Optional[str] = ""

class DeployResponse(BaseModel):
    message: str
    admin_bot_link: str
    user_bot_link: str
    deployment_id: int

class UpdatePromptRequest(BaseModel):
    extra_prompt: str
