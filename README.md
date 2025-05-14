# 10xCards

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern web application for creating and managing educational flashcards, leveraging AI to automatically generate high-quality learning materials.

## 🔗 [Live Demo](https://10x-cards-70n.pages.dev/)

## Table of Contents
- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Deployment](#deployment)
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
- **Angular** - Modern web framework for building interactive components
- **TypeScript** - Adds static typing and improved developer experience
- **Tailwind CSS** - Utility-first CSS framework for styling
- **PrimeNG** - High-quality UI component library

### Backend
- **Supabase**
  - PostgreSQL database for data storage
  - Built-in authentication system with row-level security
  - Backend-as-a-Service capabilities
  - Edge functions for serverless backend logic

### AI Integration
- **OpenRouter API**
  - Access to multiple AI models (OpenAI, Anthropic, Google)
  - Built-in API cost control
  - Fallback options for model availability

### DevOps
- **GitHub Actions** - CI/CD pipeline automation
- **Cloudflare Pages** - Hosting and deployment platform

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

### Supabase Configuration

The application is configured to work without email verification. To ensure this works correctly, you need to disable email confirmation in Supabase:

1. Go to the Supabase dashboard
2. Navigate to Authentication > Providers
3. In the Email section, set "Confirm email" to "No"
4. Save changes

### How Environment Variables Work

The application uses a runtime configuration approach to access environment variables:

1. During the build process, a `runtime-config.js` file is generated with the environment variables
2. This file is included in the `index.html` and sets a global `window.RUNTIME_CONFIG` object
3. The `environments.ts` file uses getters to access these variables at runtime

This approach allows the application to access environment variables in the browser, which is not possible with traditional environment variables that are only available during the build process.

### Deployment Process
1. Push changes to the main branch
2. GitHub Actions will build and deploy the application
3. The application will be available at the configured Cloudflare Pages URL

### Environment Variables

The following environment variables must be set in Cloudflare Pages settings:

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase public API key
- `OPENROUTER_KEY` - OpenRouter API key

## Project Scope

### Core Features
- AI-powered flashcard generation
- Manual flashcard creation and management
- User authentication system
- Spaced repetition learning algorithm integration
- Flashcard generation statistics
- Secure data storage compliant with GDPR

### Out of MVP Scope
- Advanced custom repetition algorithms
- Gamification features
- Mobile applications
- Multiple document format imports (PDF, DOCX, etc.)
- Public API
- Flashcard sharing between users
- Advanced notification system
- Advanced keyword search for flashcards

## Project Status

🚧 **Under Development** 🚧

The project is currently in active development. Key metrics for success:
- 75% AI-generated flashcard acceptance rate target
- 75% of new flashcards created using AI (compared to manually created flashcards)
- Ongoing monitoring of generation quality and user engagement
- User satisfaction with the learning experience

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---