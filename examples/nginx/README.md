# Nginx Example

The example keeps HTTP Basic Auth as the first-login challenge, then issues a 30-day, `HttpOnly` trusted-device cookie after a successful response. `SameSite=Lax` allows the cookie on top-level launches from an Android home screen or external link.

Before installing it, replace `__CODEX_TRUST_TOKEN__` with one random value in both locations:

```bash
openssl rand -hex 32
```

Do not add the `always` parameter to the trusted `Set-Cookie` header. Doing so would also expose the bypass token on a failed Basic Auth response.

The exact `/` location prevents Nginx from selecting the document-root directory and returning 403 after a successful Basic Auth retry.
