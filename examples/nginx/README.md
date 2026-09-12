# Nginx Example

Use `scripts/install-https-proxy` as the single setup and launch command. Run it
as the ordinary user whose Codex login and conversations should be used; the
script invokes `sudo` only for its Nginx setup step. It installs Nginx when
needed, creates a self-signed certificate, prompts for the `codex` Basic Auth
password on first setup, and proxies browser traffic to `127.0.0.1:8214`.

The HTTPS listen address is required:

```bash
scripts/install-https-proxy --listen-address 192.0.2.10
```

Use `--listen-address 0.0.0.0` only when the host firewall and network are
configured for remote access. The command installs project dependencies when
needed, builds missing runtime files, configures and starts Nginx, then runs
codex-web in the foreground. Node.js, npm, curl, unzip, patch, sudo, and a
signed-in Codex CLI are host prerequisites. Press Ctrl-C to stop codex-web. Run
the same command again to redeploy the static files and restart it; the
certificate, Basic Auth credentials, trusted-device token, and app-server
socket are reused.

The installer precompresses eligible static assets and enables both Nginx gzip
and `gzip_static` delivery.

The example keeps HTTP Basic Auth as the first-login challenge, then issues a 30-day, `HttpOnly` trusted-device cookie after a successful response. `SameSite=Lax` allows the cookie on top-level launches from an Android home screen or external link.

Before installing it, replace `__CODEX_TRUST_TOKEN__` with one random value in both locations:

```bash
openssl rand -hex 32
```

Do not add the `always` parameter to the trusted `Set-Cookie` header. Doing so would also expose the bypass token on a failed Basic Auth response.

The exact `/` location prevents Nginx from selecting the document-root directory and returning 403 after a successful Basic Auth retry.
