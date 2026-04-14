# PremiumApp - Barbershop Management System

**Premium Suite** for barber shop management with advanced features including AI integration, real-time scheduling, and comprehensive business analytics.

## Project Structure

```
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── admin/        # Admin dashboard & management
│   │   ├── tablet/       # Tablet interface
│   │   └── api/          # API routes
│   ├── components/       # Reusable React components
│   ├── context/          # React Context (Auth, etc.)
│   ├── hooks/            # Custom React hooks
│   └── lib/              # Utilities & types
├── supabase/            # Database migrations
├── public/              # Static assets
└── package.json         # Dependencies
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- 🎨 Modern admin dashboard
- 📅 Real-time appointment scheduling
- 👥 Client & staff management
- 💰 Financial tracking & reports
- 📊 Business analytics
- 🔐 Secure authentication
- 📱 Responsive design

## Technology Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **State Management**: React Context
- **UI Components**: Custom components + shadcn/ui

## Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Development

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run linting
```

## License

Proprietary - All rights reserved

## Support

For issues and support, contact the development team.
