"""
Verifica Firebase ID tokens usando las claves públicas de Google.
No requiere service account — solo el project ID como env var FIREBASE_PROJECT_ID.
Cachea las claves públicas respetando el max-age del header Cache-Control.
"""
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


def verify_firebase_id_token(id_token: str) -> dict:
    """
    Verifica la firma, expiración, iss y aud del Firebase ID token.
    Devuelve los claims decodificados o lanza ValueError / jwt.PyJWTError.
    """
    project = _project_id()
    if not project:
        raise ValueError("FIREBASE_PROJECT_ID no configurado en el servidor")

    header = jwt.get_unverified_header(id_token)
    kid = header.get("kid", "")
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
