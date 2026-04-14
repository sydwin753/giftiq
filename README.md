# Giftiq

Giftiq is a React + Vite gift-planning app that helps you remember what people love, save ideas, track gift history, and generate suggestions with Gemini.

## Local development

1. Install dependencies with `npm install`
2. Create `.env.local` and set `GEMINI_API_KEY=your_key_here`
3. Run `npm run dev`

## Main features

- Rich signed-out landing experience
- Google sign-in with Firebase Auth
- People profiles with extracted interests and sizes
- Gift history, upcoming occasions, and saved ideas
- AI recommendations, receipt scanning, and email parsing helpers

## GitHub Pages

This repo includes a Pages workflow in `.github/workflows/pages.yml`.

To publish:

1. Add a repository secret named `GEMINI_API_KEY`
2. In GitHub, open `Settings -> Pages`
3. Set the source to `GitHub Actions`
4. Push your branch or merge to the branch you want to deploy from

## Notes

- Firebase auth domains must include your GitHub Pages URL if you want Google sign-in to work there
- AI-powered features need the `GEMINI_API_KEY` secret available at build time
