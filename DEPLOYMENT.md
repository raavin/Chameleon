# Chameleon Protocol - Deployment Guide

## Prerequisites

- **Node.js** v18 or higher
- **MongoDB** (local or cloud instance like MongoDB Atlas)
- **Gemini API Key** from Google AI Studio

## Environment Variables

Create `.env` files in both root and backend directories:

### Root `.env` (Frontend)
```bash
VITE_API_URL=http://localhost:3001/api
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### `backend/.env`
```bash
PORT=3001
MONGODB_URI=mongodb://localhost:27017/chameleon
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chameleon

GEMINI_API_KEY=your_gemini_api_key_here
SESSION_SECRET=your_random_secret_key_here
NODE_ENV=development
```

## Local Development

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Start MongoDB

If running MongoDB locally:
```bash
mongod --dbpath /path/to/your/data/directory
```

Or use MongoDB Atlas (cloud) - just update the `MONGODB_URI` in `backend/.env`

### 3. Start the Backend

```bash
cd backend
npm run dev
```

The backend will start on `http://localhost:3001`

### 4. Start the Frontend

In a new terminal:
```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:5173`

### 5. Access the Application

Open your browser to `http://localhost:5173`

## Production Deployment

### Option 1: Deploy to Render (Recommended for Hackathons)

#### Backend Deployment

1. Push your code to GitHub
2. Go to [Render.com](https://render.com) and create a new Web Service
3. Connect your GitHub repository
4. Configure:
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Environment Variables**: Add all variables from `backend/.env`

#### Frontend Deployment

1. In Render, create a new Static Site
2. Connect your GitHub repository
3. Configure:
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/dist`
   - **Environment Variables**: Add `VITE_API_URL` pointing to your backend URL

### Option 2: Deploy to Vercel + Railway

#### Backend (Railway)

1. Go to [Railway.app](https://railway.app)
2. Create new project from GitHub repo
3. Add MongoDB service
4. Set environment variables
5. Deploy

#### Frontend (Vercel)

1. Go to [Vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Set root directory to `frontend`
4. Add environment variable `VITE_API_URL`
5. Deploy

### Option 3: Docker Deployment

Create `docker-compose.yml` in root:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/chameleon
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - SESSION_SECRET=${SESSION_SECRET}
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    environment:
      - VITE_API_URL=http://localhost:3001/api
    depends_on:
      - backend

volumes:
  mongo-data:
```

Then run:
```bash
docker-compose up -d
```

## Environment-Specific Configuration

### Development
- Frontend runs on `localhost:5173`
- Backend runs on `localhost:3001`
- Hot reload enabled
- Detailed error messages

### Production
- Use environment variables for all secrets
- Enable CORS only for your frontend domain
- Use HTTPS
- Set `NODE_ENV=production`
- Minify frontend assets

## Troubleshooting

### "Cannot connect to MongoDB"
- Check MongoDB is running: `mongosh` or check MongoDB Atlas dashboard
- Verify `MONGODB_URI` in `backend/.env`
- Check firewall settings

### "Gemini API Error"
- Verify your API key is correct
- Check you have API quota remaining
- Ensure the key has proper permissions

### "CORS Error"
- Update `backend/src/index.js` CORS configuration
- Add your frontend URL to allowed origins

### "Module not found"
- Run `npm install` in both root, frontend, and backend directories
- Delete `node_modules` and reinstall if issues persist

## Performance Optimization

### Frontend
- Build with `npm run build` for production
- Serve static files with CDN
- Enable gzip compression

### Backend
- Use MongoDB indexes for frequently queried fields
- Implement rate limiting for API endpoints
- Cache manifest generation results

## Security Checklist

- [ ] Change default `SESSION_SECRET`
- [ ] Use HTTPS in production
- [ ] Restrict CORS to your domain only
- [ ] Keep dependencies updated
- [ ] Don't commit `.env` files to git
- [ ] Use environment variables for all secrets
- [ ] Implement rate limiting on API endpoints
- [ ] Validate all user inputs

## Monitoring

### Logs
- Backend logs: Check console output or use logging service
- Frontend errors: Check browser console
- MongoDB logs: Check MongoDB logs directory

### Health Checks
- Backend: `GET /api/health`
- MongoDB: Use `mongosh` to connect and run `db.stats()`

## Backup

### MongoDB Backup
```bash
mongodump --uri="mongodb://localhost:27017/chameleon" --out=/path/to/backup
```

### MongoDB Restore
```bash
mongorestore --uri="mongodb://localhost:27017/chameleon" /path/to/backup/chameleon
```

## Scaling

### Horizontal Scaling
- Deploy multiple backend instances behind a load balancer
- Use MongoDB replica sets for high availability
- Implement Redis for session storage across instances

### Vertical Scaling
- Increase server resources (CPU, RAM)
- Optimize MongoDB queries with indexes
- Use CDN for static assets

## Support

For issues or questions:
- Check the [GitHub Issues](https://github.com/yourusername/chameleon/issues)
- Review the documentation in `/docs`
- Contact: your-email@example.com

## License

Open source under MIT License. See LICENSE file for details.
