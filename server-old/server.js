import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import cors from "cors";
import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret123",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// ✅ Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(path.join(__dirname, "firebase-key.json")),
});

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// ✅ Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:4000/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = {
          id: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName,
        };
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// ✅ Google Login
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// ✅ OAuth Callback
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  async (req, res) => {
    try {
      const { id, email } = req.user;
      const firebaseToken = await admin.auth().createCustomToken(id, { email });

      res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage(
                { token: "${firebaseToken}", user_id: "${id}" },
                "http://localhost:5173"
              );
              window.close();
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error creating Firebase token:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);

app.get("/", (req, res) => res.send("✅ Cloud Password Vault Backend Running"));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
