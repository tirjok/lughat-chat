# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please:

1. **Do not open a public issue.**
2. Email your findings to the maintainers directly, or use GitHub's private vulnerability reporting feature.
3. Include as much detail as possible: steps to reproduce, affected components, and potential impact.

We will acknowledge receipt within 48 hours and aim to provide a fix or mitigation plan within 7 days.

## Sensitive Data in This Project

This project uses environment variables for configuration (`.env`). Never commit real `.env` files — use `.env.example` as a template. The following are excluded from version control:

- `.env`, `.env.*` (except `.env.example`)
- `backend/models/`, `backend/*.safetensors`, `backend/*.bin` (large model files)
- `backend/downloads/`, `backend/output_*.wav` (generated audio)

If you accidentally commit sensitive data, remove it immediately and rotate any exposed credentials.
