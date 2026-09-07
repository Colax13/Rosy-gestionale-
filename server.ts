import express from "express";
import path from "path";
import * as admin from 'firebase-admin';
import assistantRoutes from "./salone-app/backend/src/routes/assistant";
import assistantBookingRoutes from "./salone-app/backend/src/routes/assistantBooking";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  // Try to initialize. In AI studio, application default credentials might not be present
  // but it's enough to verify tokens if we pass the project ID.
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    const firebaseConfig = require(configPath);
    admin.initializeApp({
      projectId: firebaseConfig.projectId
    });
  } catch (e) {
    admin.initializeApp();
  }
}

const app = express();
app.use(express.json({ limit: '100kb' })); // Abbassato da 50mb a 100kb


// Set up routes (Vercel routes them to this app instance via api/index.ts)
app.get("/api/health", (req, res) => { res.json({ status: "ok" }); });
app.use("/api/assistant", assistantRoutes);
app.use("/api/assistant-booking", assistantBookingRoutes);

// Helper to start the server locally or in non-Vercel environments (Google Cloud Run / Docker)
async function startServer() {
  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Only serve static files locally, Vercel handles static files automatically
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Only auto-start if not running in a Vercel serverless environment
if (!process.env.VERCEL) {
  startServer();
}

export default app;
