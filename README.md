# 10xCards

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI/CD Pipeline](https://github.com/yourusername/10xcards/actions/workflows/ci-cd-pipeline.yml/badge.svg)](https://github.com/yourusername/10xcards/actions/workflows/ci-cd-pipeline.yml)

A modern web application for creating and managing educational flashcards, leveraging AI to automatically generate high-quality learning materials.

## Table of Contents
- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Project Description

10xCards is an innovative educational tool that combines the power of AI with proven learning methodologies. The application enables users to:

- Automatically generate flashcards from any educational text using AI
- Manually create and manage custom flashcards
- Study effectively using spaced repetition algorithms
- Track learning progress and flashcard generation statistics

The project aims to solve the time-consuming process of creating high-quality study materials by leveraging AI to generate relevant questions and answers while maintaining user control over the final content.

## Tech Stack

### Frontend
- **Angular 19** - Modern web framework for building interactive components
- **TypeScript 5** - Adds static typing and improved developer experience
- **Tailwind 4** - Utility-first CSS framework for styling
- **Shadcn/ui** - High-quality UI component library

### Backend
- **Supabase**
  - PostgreSQL database for data storage
  - Built-in authentication system
  - Backend-as-a-Service capabilities
  - Self-hosting options available

### AI Integration
- **Openrouter.ai**
  - Access to multiple AI models (OpenAI, Anthropic, Google)
  - Built-in API cost control
  - Flexible model selection

### DevOps
- **Github Actions** - CI/CD pipeline automation
- **DigitalOcean** - Cloud hosting platform
- **Docker** - Containerization for consistent deployment

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- Docker (optional, for containerized deployment)

### Local Development Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/10xcards.git
   cd 10xcards
   ```

2. Install dependencies:
   ```bash
   cd app
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The application will be available at `http://localhost:4200`.

## Available Scripts

In the project directory, you can run:

- `npm start` - Starts the development server
- `npm run build` - Builds the app for production
- `npm run watch` - Builds the app in watch mode for development
- `npm test` - Runs the test suite
- `npm run lint` - Runs the linter
- `npm run serve:ssr:app` - Serves the server-side rendered application

## Deployment

The application is deployed on Cloudflare Pages. Deployment is automated via GitHub Actions.

### Environment Variables

The following environment variables need to be set in Cloudflare Pages:

- `supabaseUrl` - URL to your Supabase instance
- `supabaseKey` - API key for your Supabase instance
- `openRouterKey` - API key for OpenRouter

Optional variables for E2E tests:
- `E2E_USERNAME` - Username for E2E tests
- `E2E_PASSWORD` - Password for E2E tests
- `E2E_USERNAME_ID` - User ID for E2E tests

**IMPORTANT**: These variables contain sensitive information and should never be committed to the repository. They should be set in the Cloudflare Pages dashboard under Settings > Environment variables.

### Deployment Process
1. Push changes to the main branch
2. GitHub Actions will build and deploy the application
3. The application will be available at [https://10xcards.pages.dev](https://10xcards.pages.dev)

## Project Scope

### Core Features
- AI-powered flashcard generation
- Manual flashcard creation and management
- User authentication system
- Spaced repetition learning algorithm integration
- Flashcard generation statistics

### Out of MVP Scope
- Advanced custom repetition algorithms
- Gamification features
- Mobile applications
- Multiple document format imports
- Public API
- Flashcard sharing between users
- Advanced notification system
- Advanced keyword search

## Project Status

🚧 **Under Development** 🚧

The project is currently in active development. Key metrics for success:
- 75% AI-generated flashcard acceptance rate target
- 75% of new flashcards created using AI
- Ongoing monitoring of generation quality and user engagement

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---