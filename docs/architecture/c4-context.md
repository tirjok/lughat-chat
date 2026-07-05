# C4 Context Diagram — Lughat Chat

> **System:** Lughat Chat — Arabic Text-to-Speech Studio
> **Generated:** 2026-07-05
> **Level:** 1 — System Context (Who interacts with the system and what external systems it depends on)

---

## Diagram

```mermaid
C4Context
  title System Context - Lughat Chat

  Person(user, "User", "Speaks Arabic or English; inputs text and receives synthesized speech")

  System(lughat, "Lughat Chat", "Web-based TTS Studio — text-to-speech for Arabic dialects with voice cloning", "Nuxt 4 + Vue 3 + UnoCSS + Nginx")

  System_Ext(browser, "Web Browser", "Modern browser with <audio> support; loads SPA client")
  System_Ext(tts_engine, "Coqui XTTS-v2", "Multilingual TTS engine (CPU inference); voice cloning from reference WAV", "Python / PyTorch / Coqui TTS")
  System_Ext(google_fonts, "Google Fonts", "Serves Inter (UI) and Cairo (Arabic) web fonts", "CDN")
  System_Ext(phosphor_icons, "Phosphor Icons", "Icon library loaded via CDN script", "CDN")

  Rel(user, browser, "Opens", "HTTPS")
  Rel(browser, lughat, "Loads SPA and sends text for synthesis", "HTTP/HTTPS")
  Rel(lughat, tts_engine, "Sends text + speaker reference for speech synthesis", "HTTP / MP3")
  Rel(lughat, google_fonts, "Requests font files", "HTTPS")
  Rel(lughat, phosphor_icons, "Loads icon script", "HTTPS")

  Rel_R(browser, lughat, "Serves UI", "Static assets")
```

## Legend

| Element | Description |
|---------|-------------|
| **User** | End user who types Arabic/English text and listens to the synthesized speech |
| **Lughat Chat** | The web application — a two-panel TTS studio (Control Deck + Waveform Canvas) |
| **Web Browser** | User's browser running the Nuxt SPA; handles `<audio>` playback |
| **Coqui XTTS-v2** | Backend TTS inference engine; clones voices from reference WAV files |
| **Google Fonts** | CDN serving "Inter" (UI labels) and "Cairo" (Arabic text) fonts |
| **Phosphor Icons** | CDN-hosted icon library loaded via `<script>` tag |

## Key Relationships

| From | To | Protocol | Description |
|------|----|----------|-------------|
| User → Browser | — | — | User opens the application in a browser |
| Browser → Lughat Chat | HTTP/HTTPS | Loads the Nuxt SPA, sends synthesis requests |
| Lughat Chat → Coqui XTTS-v2 | HTTP (internal) | POSTs text + voice parameters; receives MP3 binary |
| Lughat Chat → Google Fonts | HTTPS | Preconnect + stylesheet fetch for Inter + Cairo fonts |
| Lughat Chat → Phosphor Icons | HTTPS | Loads icon script from unpkg CDN |

## Notes

- The browser communicates with Lughat Chat through Nginx (reverse proxy) in production. In local development, Nitro's devProxy handles routing.
- The TTS engine runs inside a Docker container and is not directly accessible from the browser.
- Google Fonts and Phosphor Icons are external CDN dependencies loaded by the browser, not the backend.
