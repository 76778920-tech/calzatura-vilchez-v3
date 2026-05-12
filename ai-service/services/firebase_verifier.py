"""
Verifica Firebase ID tokens usando las claves públicas de Google.
No requiere service account — solo el project ID como env var FIREBASE_PROJECT_ID.
Cachea las claves públicas respetando el max-age del header Cache-Control.
"""
import base64
import json
import os
import time

import jwt
import requests
from cryptography.x509 import load_pem_x509_certificate

_GOOGLE_CERTS_URL = (
    "https://www.googleapis.com/robot/v1/metadata/x509/"
    "securetoken@system.gserviceaccount.com"
)

_certs_cache: dict[str, str] = {}
_certs_expires_at: float = 0.0

_FIREBASE_PROJECT_ID: str | None = None
_SUPERADMIN_EMAILS: set[str] = set()


def _project_id() -> str:
    global _FIREBASE_PROJECT_ID
    if _FIREBASE_PROJECT_ID is None:
        _FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "").strip()
    return _FIREBASE_PROJECT_ID


def _admin_emails() -> set[str]:
    global _SUPERADMIN_EMAILS
    if not _SUPERADMIN_EMAILS:
        raw = os.getenv("SUPERADMIN_EMAILS", "").strip()
        _SUPERADMIN_EMAILS = {e.strip().lower() for e in raw.split(",") if e.strip()}
    return _SUPERADMIN_EMAILS


def _get_certs() -> dict[str, str]:
    global _certs_cache, _certs_expires_at
    if time.time() < _certs_expires_at and _certs_cache:
        return _certs_cache

    resp = requests.get(_GOOGLE_CERTS_URL, timeout=10)
    resp.raise_for_status()

    max_age = 3600
    for part in resp.headers.get("Cache-Control", "").split(","):
        part = part.strip()
        if part.startswith("max-age="):
            try:
                max_age = int(part[8:])
            except ValueError:
                pass

    _certs_cache = resp.json()
    _certs_expires_at = time.time() + max_age
    return _certs_cache


def _decode_jwt_header_for_kid(id_token: str) -> str:
    """
    Extrae el kid de la cabecera JWT (solo segmento 1, Base64URL + JSON).
    La firma y los claims se validan después con jwt.decode() y la clave pública de Google.
    """
    parts = id_token.split(".")
    if len(parts) < 2:
        raise ValueError("token JWT incompleto")
    header_b64 = parts[0]
    padding = "=" * ((4 - len(header_b64) % 4) % 4)
    try:
        raw = base64.urlsafe_b64decode(header_b64 + padding)
        header = json.loads(raw.decode("utf-8"))
    except (ValueError, UnicodeDecodeError) as exc:
        raise ValueError("cabecera JWT invalida") from exc
    if not isinstance(header, dict):
        raise ValueError("cabecera JWT invalida")
    kid = header.get("kid", "")
    return str(kid) if kid is not None else ""


def verify_firebase_id_token(id_token: str) -> dict:
    """
    Verifica la firma, expiración, iss y aud del Firebase ID token.
    Devuelve los claims decodificados o lanza ValueError / jwt.PyJWTError.
    """
    project = _project_id()
    if not project:
        raise ValueError("FIREBASE_PROJECT_ID no configurado en el servidor")

    kid = _decode_jwt_header_for_kid(id_token)
    certs = _get_certs()
    if kid not in certs:
        raise ValueError(f"kid desconocido: {kid}")

    cert = load_pem_x509_certificate(certs[kid].encode())
    public_key = cert.public_key()

    return jwt.decode(
        id_token,
        public_key,
        algorithms=["RS256"],
        audience=project,
        issuer=f"https://securetoken.google.com/{project}",
    )


def is_firebase_admin(id_token: str) -> bool:
    """
    Devuelve True si el token es válido y el email está en SUPERADMIN_EMAILS.
    Nunca lanza — errores de verificación devuelven False.
    """
    try:
        claims = verify_firebase_id_token(id_token)
        email = (claims.get("email") or "").lower()
        return bool(email) and email in _admin_emails()
    except Exception:
        return False
