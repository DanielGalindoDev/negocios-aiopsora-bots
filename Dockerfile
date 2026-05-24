FROM python:3.12-slim

WORKDIR /app

# Instalar dependencias de Python
RUN pip install --no-cache-dir fastapi uvicorn sqlmodel httpx psycopg2-binary python-dotenv pydantic-settings

# Copiar el código fuente
COPY src/ ./src/

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]