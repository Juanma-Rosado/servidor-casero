# App de gestión de reservas de Reserfy (Flask).
# Restauración de 2026-11: versión de Python fija, usuario sin privilegios y gunicorn
# en lugar del servidor de desarrollo de Flask.
FROM python:3.12.15-slim-trixie

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# La app no necesita ser root dentro del contenedor
RUN useradd --system --no-create-home gestion
USER gestion

EXPOSE 5000

# Dos procesos bastan para una demo; los registros salen por docker logs
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--access-logfile", "-", "app:app"]
