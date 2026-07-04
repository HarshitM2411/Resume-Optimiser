FROM dxjoke/tectonic-docker:latest AS tectonic_bin

FROM python:3.12-slim-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 \
    libfontconfig1 \
    libgraphite2-3 \
    libharfbuzz0b \
    libicu72 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=tectonic_bin /usr/local/bin/tectonic /usr/local/bin/tectonic

COPY pyproject.toml README.md ./
COPY app ./app
RUN pip install --no-cache-dir .

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
