# The Chameleon Protocol

<div align="center">
  <img src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" alt="Chameleon Protocol Banner" width="100%" />
</div>

## Inspiration
I had been thinking about technology that would help developing nations manage the vast array of health and human services programs since I saw a hackathon many years ago where a group developed open source hospital management software. More recently, I've been following an open-source MRI project. Having worked for 30 years in the Community Services Sector in Australia, I have had many experiences with substandard or non-existent software to help manage and monitor program efficacy. With recent developments in AI, this is the perfect time to solve this.

## What it does
The Chameleon Protocol scrapes information about local requirements and needs to generate a JSON file that is fed into the master app. This creates a bespoke data collection system for any country and any program automatically. 

The system acts as a bridge between high-level legislative requirements (WHO standards, Local Acts) and on-the-ground data collection, ensuring compliance without requiring expensive custom software development.

## How we built it
This project is built using **Google AI Studio** and is entirely "vibe coded". 
- **Frontend:** React 19 + Tailwind CSS
- **AI Engine:** Gemini 2.0 Flash / Gemini 3.0 Pro Preview (via Google GenAI SDK)
- **Persistence:** Local IndexedDB for offline-first capability
- **Tooling:** Vite

## Challenges we ran into
There are limitations to development in the AI Studio environment, but it was great to prototype the first ideas and be able to work on my phone if I wanted. We also faced challenges with:
- Handling massive context windows for legislative documents.
- Ensuring the "Deep Research" node could reliably extract full text rather than just summaries.
- Managing API rate limits while streaming complex research tasks.

## Accomplishments that we're proud of
As of **09/01/2026**, we have a working proof of concept. The system can successfully:
1. Research a topic (e.g., "Maternal Health in Nairobi").
2. Download and store full legislative text locally.
3. Generate a dynamic, schema-driven UI for data entry.
4. Save client records locally in an offline-ready database.

## What we learned
AI Studio is great for rapid ideation, though less suited for full stack development. **Gemini 3 Pro Preview** is working well for both development and API interactions, showing impressive reasoning capabilities for parsing complex legal text.

## What's next for Chameleon Protocol
A working multi-part project that can run on extremely old equipment, allowing people in the poorest nations to use the best of technology to solve difficult problems. Future roadmap includes:
- **Cloud Sync:** Optional upstream syncing for national reporting.
- **Multimodal Inputs:** Support for audio/voice notes for field workers with low literacy.
- **Hardware Optimization:** Ensuring the app runs smoothly on 5+ year old mobile devices.

---

## Run Locally

**Prerequisites:**  Node.js v18+

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   Set the `GEMINI_API_KEY` in `.env` to your Gemini API key.

3. **Run the app:**
   ```bash
   npm run dev
   ```