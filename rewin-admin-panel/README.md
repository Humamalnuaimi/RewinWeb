# Rewin Admin Panel

A comprehensive admin control panel for the Rewin app, built with Node.js, Express, and React.

## 🚀 Features

- **Complete User Management**: View, manage, and control all user accounts
- **Customer Data Management**: Access and manage customer data across all users
- **Analytics Dashboard**: Comprehensive insights and reporting
- **System Monitoring**: Real-time system health and performance monitoring
- **Secure Authentication**: JWT-based admin authentication
- **Firebase Admin SDK**: Full database access with bypass security rules
- **Modern UI/UX**: Beautiful purple gradient theme with glass morphism effects
- **Responsive Design**: Works perfectly on desktop and mobile devices

## 🏗️ Architecture

### Backend (Node.js + Express)
- **Firebase Admin SDK**: Full database access
- **JWT Authentication**: Secure admin sessions
- **RESTful API**: Clean, documented endpoints
- **Rate Limiting**: Protection against abuse
- **CORS Support**: Cross-origin resource sharing
- **Error Handling**: Comprehensive error management

### Frontend (React + TypeScript)
- **Modern React**: Hooks, functional components
- **TypeScript**: Type safety and better development experience
- **React Router**: Client-side routing
- **Axios**: HTTP client for API communication
- **Lucide React**: Beautiful icons
- **Glass Morphism**: Modern UI design

## 📁 Project Structure

```
rewin-admin-panel/
├── server.js                 # Main server file
├── package.json              # Backend dependencies
├── env.example               # Environment variables template
├── routes/                   # API routes
│   ├── auth.js              # Authentication routes
│   ├── users.js             # User management routes
│   ├── customers.js         # Customer management routes
│   ├── analytics.js         # Analytics routes
│   └── system.js            # System management routes
└── client/                   # React frontend
    ├── package.json         # Frontend dependencies
    ├── public/              # Static files
    ├── src/
    │   ├── components/      # Reusable components
    │   ├── pages/           # Page components
    │   ├── hooks/           # Custom React hooks
    │   ├── services/        # API services
    │   ├── types/           # TypeScript types
    │   └── utils/           # Utility functions
    └── README.md
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Firebase project with Admin SDK credentials

### 1. Clone and Install Dependencies

```bash
# Navigate to the admin panel directory
cd rewin-admin-panel

# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### 2. Firebase Setup

1. Go to your Firebase Console
2. Navigate to Project Settings > Service Accounts
3. Click "Generate New Private Key"
4. Download the JSON file
5. Copy the contents to your environment variables

### 3. Environment Configuration

```bash
# Copy the example environment file
cp env.example .env

# Edit the .env file with your configuration
nano .env
```

Required environment variables:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Private Key Here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# Admin Configuration
ADMIN_EMAILS=alnuaimi.humam@gmail.com,admin@rewin.com

# Security
JWT_SECRET=your-super-secret-jwt-key-here
```

### 4. Start the Development Servers

```bash
# Terminal 1: Start the backend server
npm run dev

# Terminal 2: Start the frontend development server
cd client
npm start
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## 🔐 Authentication

### Default Admin Credentials
- **Email**: alnuaimi.humam@gmail.com
- **Password**: admin123

### Adding New Admins
1. Add the email to the `ADMIN_EMAILS` environment variable
2. The user can then log in with any password (for demo purposes)
3. In production, implement proper password authentication

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/verify` - Verify JWT token
- `POST /api/auth/logout` - Admin logout

### Users Management
- `GET /api/users` - Get all users with pagination
- `GET /api/users/:id` - Get specific user
- `DELETE /api/users/:id` - Delete user
- `PATCH /api/users/:id/status` - Update user status

### Customers Management
- `GET /api/customers` - Get all customers
- `GET /api/customers/:id` - Get specific customer
- `DELETE /api/customers/:id` - Delete customer
- `GET /api/customers/export/csv` - Export customers to CSV

### Analytics
- `GET /api/analytics/overview` - System overview
- `GET /api/analytics/user-activity` - User activity data
- `GET /api/analytics/revenue` - Revenue analytics
- `GET /api/analytics/customers` - Customer analytics

### System Management
- `GET /api/system/health` - System health check
- `GET /api/system/stats` - System statistics
- `GET /api/system/firebase-usage` - Firebase usage metrics

## 🎨 UI Components

The admin panel uses a custom CSS framework with:
- **Purple Gradient Background**: Beautiful gradient theme
- **Glass Morphism**: Translucent cards with blur effects
- **Responsive Design**: Mobile-first approach
- **Custom Animations**: Smooth transitions and hover effects
- **Icon Integration**: Lucide React icons throughout

## 🔧 Development

### Backend Development
```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start
```

### Frontend Development
```bash
cd client

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

### Code Structure
- **Components**: Reusable UI components in `client/src/components/`
- **Pages**: Main page components in `client/src/pages/`
- **Hooks**: Custom React hooks in `client/src/hooks/`
- **Services**: API communication in `client/src/services/`

## 🚀 Deployment

### Backend Deployment
1. Set up your production environment variables
2. Install dependencies: `npm install --production`
3. Start the server: `npm start`

### Frontend Deployment
1. Build the production version: `cd client && npm run build`
2. Serve the `build` folder with your web server
3. Configure the API URL in production

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Protection against brute force attacks
- **CORS Configuration**: Controlled cross-origin access
- **Input Validation**: Server-side validation for all inputs
- **Error Handling**: Secure error responses
- **Firebase Admin SDK**: Bypass security rules for admin access

## 📈 Monitoring

The admin panel includes comprehensive monitoring:
- **System Health**: Real-time health checks
- **Performance Metrics**: Response times and throughput
- **Firebase Usage**: Database and storage usage
- **Error Tracking**: Comprehensive error logging
- **User Activity**: Admin action tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is proprietary software for the Rewin app.

## 🆘 Support

For support and questions:
- Check the documentation
- Review the code comments
- Contact the development team

---

**Built with ❤️ for the Rewin Admin Team** 