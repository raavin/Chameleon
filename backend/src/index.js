import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from './auth/passport.js';

// Import routes
import manifestRoutes from './routes/manifestRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import submissionRoutes from './routes/submissionRoutes.js';
import artifactRoutes from './routes/artifactRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import authRoutes from './routes/authRoutes.js';
import geminiRoutes from './routes/geminiRoutes.js';
import consentRoutes from './routes/consentRoutes.js';
import twoKeyRoutes from './routes/twoKeyRoutes.js';
import securityRoutes from './routes/securityRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const isDev = process.env.NODE_ENV !== 'production';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chameleon';

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

app.use(session({
  name: 'chameleon.sid',
  secret: process.env.SESSION_SECRET || 'chameleon-dev-session-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGODB_URI,
    collectionName: 'sessions'
  }),
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));
app.use(passport.initialize());
app.use(passport.session());

if (isDev) {
  app.use((req, res, next) => {
    const start = Date.now();
    console.log('[REQ]', req.method, req.originalUrl, {
      headers: req.headers,
      query: req.query,
      body: req.body
    });

    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    res.json = (body) => {
      const ms = Date.now() - start;
      console.log('[RES]', req.method, req.originalUrl, {
        status: res.statusCode,
        duration_ms: ms,
        body
      });
      return originalJson(body);
    };

    res.send = (body) => {
      const ms = Date.now() - start;
      console.log('[RES]', req.method, req.originalUrl, {
        status: res.statusCode,
        duration_ms: ms,
        body
      });
      return originalSend(body);
    };

    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API Routes
app.use('/api/manifests', manifestRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/artifacts', artifactRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/two-key', twoKeyRoutes);
app.use('/api/security', securityRoutes);

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  
  // Serve static files
  app.use(express.static(frontendDist));
  
  // Serve protocols folder
  app.use('/protocols', express.static(path.join(__dirname, '../../frontend/protocols')));
  
  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendDist, 'index.html'));
    }
  });
  
  console.log('📦 Serving static frontend from:', frontendDist);
}

if (isDev) {
  mongoose.set('debug', (collectionName, method, query, doc, options) => {
    console.log('[MONGO]', collectionName, method, {
      query,
      doc,
      options
    });
  });
}

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err.message));

mongoose.connection.on('connected', () => {
  if (isDev) console.log('[MONGO] connected');
});
mongoose.connection.on('disconnected', () => {
  if (isDev) console.log('[MONGO] disconnected');
});
mongoose.connection.on('error', (err) => {
  if (isDev) console.log('[MONGO] error', err);
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🦎 Chameleon Protocol Backend running on port ${PORT}`);
});

export default app;
