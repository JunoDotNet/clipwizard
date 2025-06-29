# 🎬 ClipWizard

**ClipWizard** is a desktop companion app that helps you turn long-form videos into short-form clips using transcript-driven editing, AI-assisted workflows, and precise waveform-based fine-tuning.

---

## ✨ Features

### 📥 Import & Transcription
- Load a video and get a full transcript using Whisper (`whisper.cpp`) locally.
- Audio is auto-extracted from `.mp4`, `.mov`, `.mkv`, or `.webm`.

### 🏷️ Transcript Highlighting
- Create reusable labels like `Intro`, `Hook`, or `Funny Moment`.
- Mark highlights directly from the transcript to tag key moments.

### ✂️ Editing Workflow
- Drag transcript lines into visual "cut tabs" to create clips.
- Each tab is a collection of clips with its own export options.
- Fine-tune start/end offsets with a visual waveform editor.

### 🤖 AI Integration
- Paste in AI-generated cut lists and instantly populate new clip tabs.
- Matches transcript segments by timestamp and content.

### 📤 Export Options
- Export selected clips as `.mp4` using ffmpeg.
- Export Adobe Premiere-compatible XML timelines.
- Save/load `.wizard` project files to continue later.

---

## 🧠 How It Works

- **React + Electron** UI for desktop-native performance.
- **FFmpeg** extracts audio and renders clips.
- **Whisper.cpp** runs offline to generate transcripts.
- **Drag-and-drop interface** powered by `@dnd-kit/core`.

---

## 🛠️ Roadmap
ClipWizard is growing into a full end-to-end platform for short-form content creation. Here's what's planned:

Phase	Feature	Scope Description
✅ Now	Transcript + Clip Tabs + Export	Import video, transcribe with Whisper, organize clips via transcript, export XML.
🟡 Next	Cropping UI + Vertical Export	Add per-clip crop boxes and export vertical clips using ffmpeg crop + scale.
🔜 Then	Caption Styling and Burn-In	Allow users to style captions and burn them directly into vertical clips.
🔁 Later	Crop Animation (Keyframing)	Add a timeline UI to animate crop regions (pan/zoom effects).
🧠 Future	Auto-Crop to Faces / Pan-Zoom	Use computer vision to auto-frame faces and generate smooth crop animations.

---

## 🗂 Folder Structure

src/
├── components/ # UI elements (video player, tab manager, etc.)
├── pages/ # ImportPage, EditPage, ExportPage
├── context/ # Global app state (AppContext)
├── hooks/ # Custom logic (transcription, clip playback)
├── utils/ # Highlight merging, export helpers
├── whisper/ # whisper.exe, ffmpeg.exe, model binaries

yaml
Copy
Edit

---

## 🚀 Getting Started

```bash
git clone https://github.com/yourusername/clipwizard.git
cd clipwizard
npm install


