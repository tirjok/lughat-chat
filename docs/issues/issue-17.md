## Parent

Lughat Chat PRD — Frontend Download Button

## What to build

A download button that allows users to save the generated audio as an MP3 file. It should create a temporary download link from the Blob URL and trigger the browser's save dialog.

The button should:
- Create a temporary `<a>` element with the Blob URL as href
- Set the download attribute to a filename (e.g., `tts_output_{timestamp}.mp3`)
- Trigger the download by programmatically clicking the link
- Clean up the temporary URL after a short delay to prevent memory leaks
- Display a download icon (e.g., lucide-download)

## Acceptance criteria

- [ ] Clicking the button triggers browser download dialog
- [ ] Downloaded file has correct MP3 extension and reasonable filename
- [ ] Blob URL is cleaned up after download (revokeObjectURL)
- [ ] Button displays a download icon
- [ ] Works correctly with Blob responses from the API composable

## Blocked by

- Issue 13 (Audio Player State Machine) — need the composable's blobRef and getDownloadUrl() method

---

## Triage: ready-for-agent
