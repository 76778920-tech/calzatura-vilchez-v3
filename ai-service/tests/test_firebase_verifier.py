"""Tests for Firebase ID token header parsing (sin jwt.get_unverified_header)."""
import base64
import json

import pytest

from services.firebase_verifier import _decode_jwt_header_for_kid


def _b64url(obj: dict) -> str:
    raw = json.dumps(obj, separators=(",", ":")).encode()
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def test_decode_jwt_header_for_kid_extracts_kid() -> None:
    header = {"alg": "RS256", "kid": "key-123"}
    token = f"{_b64url(header)}.e30.x"
    assert _decode_jwt_header_for_kid(token) == "key-123"


def test_decode_jwt_header_for_kid_missing_kid_returns_empty() -> None:
    header = {"alg": "RS256"}
    token = f"{_b64url(header)}.e30.x"
    assert _decode_jwt_header_for_kid(token) == ""


def test_decode_jwt_header_for_kid_incomplete_raises() -> None:
    with pytest.raises(ValueError, match="incompleto"):
        _decode_jwt_header_for_kid("not-a-jwt")
