from __future__ import annotations

from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


class JWTAuthMiddleware:
    def __init__(self, inner):
        self.inner = inner
        self.jwt_auth = JWTAuthentication()

    async def __call__(self, scope, receive, send):
        scope["user"] = AnonymousUser()
        token = _extract_token(scope)
        if token:
            scope["user"] = await self._get_user(token)
        return await self.inner(scope, receive, send)

    @database_sync_to_async
    def _get_user(self, token: str):
        try:
            validated_token = self.jwt_auth.get_validated_token(token)
            return self.jwt_auth.get_user(validated_token)
        except (AuthenticationFailed, InvalidToken, TokenError):
            return AnonymousUser()


def _extract_token(scope) -> str | None:
    query_string = scope.get("query_string", b"").decode("utf-8")
    token = parse_qs(query_string).get("token", [None])[0]
    if token:
        return token

    for key, value in scope.get("headers", []):
        if key == b"authorization":
            auth_header = value.decode("utf-8")
            if auth_header.lower().startswith("bearer "):
                return auth_header.split(" ", 1)[1].strip()

    return None
