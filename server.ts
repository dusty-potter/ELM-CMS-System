import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, getDoc, doc, query, where } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

import { toPublicProduct } from "./src/lib/utils";
import { Product } from "./src/types";

dotenv.config();

// Initialize Firebase for Server-side API
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Public API: List Published Products (Resolved)
  app.get("/api/products", async (req, res) => {
    try {
      const siteId = req.query.siteId as string | undefined;
      const q = query(collection(db, "products"), where("status", "==", "published"));
      const snap = await getDocs(q);
      const products = snap.docs.map(d => {
        const product = { id: d.id, ...d.data() } as Product;
        return toPublicProduct(product, siteId);
      }).filter(p => p.activeContent !== null); // Only return products with valid content
      
      res.json(products);
    } catch (error) {
      console.error("API Error:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Public API: Get Single Product (Resolved)
  app.get("/api/products/:id", async (req, res) => {
    try {
      const siteId = req.query.siteId as string | undefined;
      const snap = await getDoc(doc(db, "products", req.params.id));
      if (!snap.exists() || snap.data().status !== "published") {
        return res.status(404).json({ error: "Product not found or not published" });
      }
      
      const product = { id: snap.id, ...snap.data() } as Product;
      const resolved = toPublicProduct(product, siteId);
      
      if (!resolved.activeContent) {
        return res.status(404).json({ error: "No active content for this product" });
      }
      
      res.json(resolved);
    } catch (error) {
      console.error("API Error:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  // Admin API: Get Full Document (Internal use only)
  app.get("/api/admin/products/:id", async (req, res) => {
    try {
      const snap = await getDoc(doc(db, "products", req.params.id));
      if (!snap.exists()) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json({ id: snap.id, ...snap.data() });
    } catch (error) {
      console.error("API Error:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  // AI Rewrite Endpoint
  app.post("/api/ai/rewrite", async (req, res) => {
    const { content, manufacturer, product } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";
      
      const systemInstruction = `
        You are a specialized content rewriter for a hearing aid CMS.
        Your task is to rewrite product descriptions and feature summaries.
        
        STRICT CONSTRAINTS:
        1. PRESERVE FACTUAL ACCURACY: Do not add new claims or features.
        2. NO HALLUCINATION: Only use the provided information.
        3. EXACT TERMS: Technology names, platform names, and manufacturer names must be preserved EXACTLY as provided.
        4. TONE: Professional, informative, and accessible.
        5. OUTPUT: Return only the rewritten text.
        
        Manufacturer: ${manufacturer}
        Product: ${product}
      `;

      const prompt = `Rewrite the following content while following the strict constraints:\n\n${content}`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
        },
      });

      res.json({ rewritten: response.text });
    } catch (error) {
      console.error("AI Rewrite Error:", error);
      res.status(500).json({ error: "Failed to generate rewrite" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
