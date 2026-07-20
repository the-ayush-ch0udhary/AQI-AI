"""JWT auth utilities."""
import os
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET = os.environ["JWT_SECRET"]
ALGO = os.environ.get("JWT_ALGORITHM", "HS256")

bearer = HTTPBearer(auto_error=False)


def create_token(email: str) -> str:
    payload = {
        "sub": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGO)


def require_admin(cred: HTTPAuthorizationCredentials = Depends(bearer)):
    if cred is None:
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = jwt.decode(cred.credentials, SECRET, algorithms=[ALGO])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload.get("sub")
