# Vanilla Chat Client

A modern chat interface built with Next.js that connects to the RedBuilder API for AI-powered conversations, image generation, and more.

## Features

- 💬 Text-to-text chat with AI models
- 🖼️ Text-to-image generation
- 🎨 Image-to-image transformations
- 🖌️ Inpainting capabilities
- 🔄 Automatic model selection based on operation type
- 🌓 Light/dark mode toggle
- 📱 Responsive design for all devices

## Environment Setup

The application uses environment variables to configure API connections. You can set these up in different ways depending on your environment:

### Development Mode

Create a `.env.local` file in the project root with:

```
OPENAI_API_KEY=your-api-key-here
```

This will connect to the local development API at `http://localhost:8787`.

### Production Mode

Create a `.env.production` file in the project root with:

```
OPENAI_API_KEY=your-api-key-here
```

This will connect to the live API at `https://api.redbuilder.io`.

## Getting Started

### Development Mode

Run the development server with hot reloading:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Production Mode

There are several ways to run the application in production mode:

#### 1. Build and start with existing API key in .env.production

```bash
pnpm build
pnpm start
```

#### 2. Start with a specific API key (recommended)

```bash
pnpm start:with-key YOUR_API_KEY_HERE
```

Or use the script directly:

```bash
./start-with-key.sh YOUR_API_KEY_HERE
```

This will:
- Save your API key to `.env.production`
- Build the application
- Start the server in production mode

## API Integration

The application integrates with the RedBuilder API for various AI capabilities:

- **Text Chat**: Uses models like Llama 4 for natural language conversations
- **Image Generation**: Uses Stable Diffusion XL for creating images from text prompts
- **Inpainting**: Allows modifying specific parts of images
- **Image-to-Image**: Transforms existing images based on text prompts

## Model Selection

The application automatically selects the best model based on the operation type:

- Normal text input → Best text-to-text model
- Commands like `/img` or `/imagine` → Best text-to-image model
- Inpainting operations → Best inpainting model
- Image transformation operations → Best image-to-image model

You can also manually select any model from the dropdown menu.

## Architecture

The application uses a custom server setup to properly handle static assets and environment variables:

- **Next.js**: Core framework for rendering and routing
- **Custom Server**: Handles static assets and environment variables
- **Environment Loader**: Dynamically loads environment variables from appropriate files
- **Configuration System**: Provides environment-specific settings

## Scripts

- `pnpm dev`: Start development server
- `pnpm build`: Build the application
- `pnpm start`: Start production server
- `pnpm start:local`: Start server in development mode
- `pnpm start:prod`: Start server in production mode
- `pnpm start:with-key`: Start server with a specific API key
- `pnpm lint`: Run linting

## Deployment

The application is configured for deployment on Vercel or as a standalone Node.js application.

### Vercel Deployment

To deploy on Vercel, you need to set up an environment variable:

1. In your Vercel project settings, add an environment variable:
   - Name: `OPENAI_API_KEY`
   - Value: Your API key

2. The application will automatically use the special Vercel configuration that:
   - Always connects to the live API at `https://api.redbuilder.io`
   - Never uses mock data
   - Uses the API key from Vercel environment variables

3. Deploy using the Vercel CLI or GitHub integration:
   ```bash
   vercel --prod
   ```

### Standalone Deployment

The build process creates a standalone output in `.next/standalone` that can be deployed to any Node.js hosting environment.

```bash
pnpm build
node .next/standalone/server.js
```

Make sure to set up the `.env.production` file with your API key before building.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
