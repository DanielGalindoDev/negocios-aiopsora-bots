import httpx
from fastapi import HTTPException
from config import settings

async def get_or_create_credential(name: str, cred_type: str, data: dict) -> str:
    """
    Checks if a credential already exists in N8N by name and type.
    Reuses it if found; otherwise, creates a new one.
    """
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{settings.N8N_API_URL}/credentials", headers=settings.n8n_headers)
            if resp.status_code == 200:
                existing = [
                    c for c in resp.json().get("data", [])
                    if c["name"] == name and c["type"] == cred_type
                ]
                if existing:
                    print(f"[n8n] Reutilizando credencial: {name}")
                    return existing[0]["id"]
        except Exception as e:
            print(f"[n8n] Warning checking credentials: {e}")

        payload = {"name": name, "type": cred_type, "data": data}
        resp = await client.post(f"{settings.N8N_API_URL}/credentials", json=payload, headers=settings.n8n_headers)
        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=500, detail=f"Error creando '{name}': {resp.text}")
        return resp.json()["id"]

async def get_or_create_openai_credential(api_key: str, identifier: str) -> tuple[str, str]:
    """
    Creates an OpenAI credential for a specific deployment.
    """
    name = f"OpenAI Cred - {identifier}"
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{settings.N8N_API_URL}/credentials", headers=settings.n8n_headers)
            if resp.status_code == 200:
                existing = [c for c in resp.json().get("data", []) if c["name"] == name and c["type"] == "openAiApi"]
                if existing:
                    print(f"[n8n] Reutilizando OpenAI existente: '{name}'")
                    return existing[0]["id"], name
        except Exception as e:
            print(f"[n8n] Warning checking OpenAI credentials: {e}")

        payload = {
            "name": name,
            "type": "openAiApi",
            "data": {
                "apiKey": api_key,
                "header": False,
                "allowedHttpRequestDomains": "all"
            }
        }
        resp = await client.post(f"{settings.N8N_API_URL}/credentials", json=payload, headers=settings.n8n_headers)
        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=500, detail=f"Error creando credencial OpenAI: {resp.text}")
        return resp.json()["id"], name
