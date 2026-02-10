# The Chameleon Protocol

<div align="center">
  <img src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" alt="Chameleon Protocol Banner" width="100%" />
</div>

## Inspiration
I had been thinking about technology that would help developing nations manage the vast array of health and human services programs since I saw a hackathon many years ago where a group developed open source hospital management software. More recently, I've been following an open-source MRI project. Having worked for 30 years in the Community Services Sector in Australia, I have had many experiences with substandard or non-existent software to help manage and monitor program efficacy. With recent developments in AI, this is the perfect time to solve this. While the idea was motivated by NGO type work, this could be applied across a wide range of NFP or commercial industries. 

## What it does
The Chameleon Protocol scrapes information about local requirements and needs to generate a JSON file that is fed into the master app. This creates a bespoke data collection system for any country and any program automatically. 

The system acts as a bridge between high-level legislative requirements (WHO standards, Local Acts) and on-the-ground data collection, ensuring compliance without requiring expensive custom software development.

There is still work to be done but is a mostly effective MVP of the idea. 

## How we built it
This project is built, initially using **Google AI Studio** and continued with gimini and claude for development and is entirely "vibe coded". 
- **Frontend:** React 19 + Tailwind CSS
- **AI Engine:** Gemini 2.0 Flash / Gemini 3.0 Pro Preview / Gemini Deep Research (via Google GenAI SDK)
- **Persistence:** Local IndexedDB for offline-first capability. This isn't entirely accurate at the moment as I've been concentrating on the generation rather than the deployment
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
AI Studio is great for rapid ideation, though less suited for full stack development. **Gemini 3 Pro Preview** is working well for both development and API interactions, showing impressive reasoning capabilities for parsing complex legal text. implemented the Gemini Deep Research Agent for the comprehensive mode which seems to work well but might need top be worked on more for this particular application. 

## What's next for Chameleon Protocol
A working multi-part project that can run on extremely old equipment, allowing people in the poorest nations to use the best of technology to solve difficult problems. Future roadmap includes:
- **Cloud Sync:** Optional upstream syncing for national reporting.
- **Multimodal Inputs:** Support for audio/voice notes for field workers with low literacy.
- **Hardware Optimization:** Ensuring the app runs smoothly on 5+ year old mobile devices.

---

## Run Locally

**Prerequisites:**  Node.js v18+, mongodb

1. **Install dependencies:**
   ```bash
   npm install

   mongosh
   use chameleon
   ```

2. **Configure Environment:**
   Set the `GEMINI_API_KEY` in `.env` to your Gemini API key.

   .env /backend

```   # Server Environment Configuration
PORT=3001
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/chameleon

# JWT Secret
JWT_SECRET=chameleon-dev-secret-change-in-production

# Gemini API Key
GEMINI_API_KEY=yourkeyhere

   .env /frontend

VITE_API_URL=http://localhost:3001/api

```

## Instructions:
When you start things up you will be taken to the main Chameleon webpage. This is just a placeholder. The info is lame to say the least :) The login is very basic and keeps your data entirely on your database. It was only really there as a rate limiter and to stop bots cranking up my AIU costs for early publishing. Log in and you should be fine.

click launch app, register and log in.

In the left panel, click 'Module Packs', then 'Create with AI research'

Complete the form. Make sure you complete all of the feilds. It's pretty flexible. Leave interview mode as self interview. The application will go through a virtual consultation process during the process. Choose comprehensive for deep research. 

Click 'Create and Generate'

It will go through several stages 

*Domain classification* - it will go through some initial ideation to set up some reasonable starting parameters based on your information. It will put together a card containing a range of domain areasand ontological development. 
*Expert Research* - Agents will attempt to pull information regarding local customs and laws and become and expert in the domain. 
*Ideation* - Interview questions are developed based on the research and ontology. There are interactive and self-interview consultation processes. Self interview is the one that currently works most effecvtively acting as consultant and customer in the consultation process. The interactive is not thoroughly tested yet. 
*Module Generation* - The JSON files are generated for the form builder. These modules can be accessed in the left panel. If a client is selected, you can enter data in the feilds and they will be assicated with the client file. 

The package should contain a client_profile type that allows you to enter client details so you can attache modueles to a client record. 

Create a client record to complete the rest of the forms.

**TODOS**

The modules are broader that are currently supported by the app. It has a tendency to try to cover staffing and other stakeholders using the same client strategy. this is intentioanl but stakeholder entity separation needs to be implemented. 

3. **Run the app:**
   ```bash
   cd Chameleon/backend
   npm run dev
   cd Chameleon/frontend
   npm run dev
   ```