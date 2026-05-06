# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | Yes       |
| < 1.0   | No        |

## Reporting a Vulnerability

Base MCP handles sensitive credentials including Coinbase API keys and wallet seed phrases.
If you discover a security vulnerability, please do NOT open a public GitHub issue.

**Report privately via GitHub:** Use the [Security Advisories](https://github.com/LOCUS764/base-mcp/security/advisories/new) feature to report vulnerabilities confidentially.

Or email directly: include `[SECURITY]` in the subject line.

## What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

## Security Best Practices for Users

- Never commit your `.env` file or share your `SEED_PHRASE`
- Use a dedicated Coinbase API key with only the permissions you need
- Rotate your API keys regularly
- Use a wallet with limited funds for testing
- Keep `base-mcp` updated to the latest version

## Response Timeline

We aim to acknowledge reports within 48 hours and provide a fix within 7 days for critical issues.
