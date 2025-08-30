# Backend Email Service Setup

This guide will help you set up the backend email service for automatic email sending via Gmail SMTP.

## 🚀 Quick Setup

### Step 1: Install Backend Dependencies
```bash
cd api
npm install
```

### Step 2: Start the Backend Server
```bash
npm start
# or for development with auto-restart:
npm run dev
```

The server will start on `http://localhost:3001`

### Step 3: Configure Gmail in Admin Panel
1. Go to your admin panel → Users page
2. Click Settings ⚙️ next to "Add User"
3. Enter your Gmail credentials:
   - **Gmail Address**: Your Gmail email
   - **From Name**: "Rewin Admin Panel"
   - **App Password**: `evce trju prtv faxj`
4. Test and save configuration

## 📧 How It Works

### Backend Email Flow:
1. **Frontend** → Calls Gmail SMTP service
2. **Gmail SMTP Service** → Sends request to `/api/send-email`
3. **Backend API** → Uses Nodemailer + Gmail SMTP
4. **Gmail SMTP** → Delivers email to recipient

### Fallback System:
- **Primary**: Backend API with Nodemailer
- **Fallback**: Client-side SMTP.js library
- **No Email Client**: Everything happens in the background

## 🔧 Technical Details

### Backend Dependencies:
- **nodemailer**: SMTP email sending
- **express**: Web server framework
- **cors**: Cross-origin resource sharing

### API Endpoints:
- `POST /api/send-email` - Send email via SMTP
- `GET /api/health` - Health check

### Security Features:
- CORS protection
- Input validation
- Error handling
- Secure SMTP connection

## 🎯 Benefits

✅ **True Backend Sending**: No email client popups  
✅ **Reliable Delivery**: Nodemailer + Gmail SMTP  
✅ **Beautiful Templates**: Your existing HTML templates  
✅ **Automatic Fallback**: Client-side SMTP if backend fails  
✅ **Production Ready**: Proper error handling and logging  
✅ **Easy Deployment**: Simple Node.js server  

## 🚨 Troubleshooting

### Backend Server Not Starting:
```bash
cd api
npm install
npm start
```

### Port Already in Use:
```bash
# Change port in api/server.js or kill existing process
lsof -ti:3001 | xargs kill -9
```

### CORS Issues:
- Backend server must be running on `localhost:3001`
- Frontend should be on `localhost:5173` or `localhost:3000`

### Gmail Authentication Issues:
- Ensure 2FA is enabled on your Gmail
- Use the correct app password: `evce trju prtv faxj`
- Check Gmail SMTP settings are correct

## 📝 Production Deployment

For production, you can deploy the backend API to:
- **Vercel**: Serverless functions
- **Netlify**: Netlify functions  
- **Railway**: Full Node.js hosting
- **Heroku**: Container deployment
- **Your own server**: PM2 + Nginx

The frontend will automatically detect and use the backend API when available.

## 🔍 Testing

### Test Backend API:
```bash
curl -X POST http://localhost:3001/api/health
```

### Test Email Sending:
Use the admin panel's "Test Configuration" button after setting up Gmail credentials.

---

**Your backend email service is now ready to send beautiful invitation emails automatically!** 🎉
