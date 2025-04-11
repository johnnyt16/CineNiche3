import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { StytchProvider } from "@stytch/react";
import { StytchUIClient } from "@stytch/vanilla-js";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { initializeApp } from "firebase/app";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

// TEMPORARY: Set to false to bypass Stytch during development/testing
const useStytch = true;

// Define stytchConfig before using it
const stytchConfig = {
  publicToken: "public-token-test-4c9995d7-789a-4d6a-a767-0bdeb5610bfc",
  loginURL: "http://localhost:3000/login",
  signupURL: "http://localhost:3000/register",
  sessionDurationMinutes: 60 // Add session duration
};

// Initialize the Stytch client with error handling
let stytchClient;
try {
  if (useStytch) {
    stytchClient = new StytchUIClient(stytchConfig.publicToken);
    console.log("Stytch client initialized successfully");
  } else {
    console.log("Stytch client initialization bypassed for development");
  }
} catch (error) {
  console.error("Failed to initialize Stytch client:", error);
  // We'll render without StytchProvider in this case
}

// Conditional rendering based on whether Stytch initialized correctly
if (stytchClient && useStytch) {
  root.render(
    <React.StrictMode>
      <StytchProvider stytch={stytchClient} config={stytchConfig}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StytchProvider>
    </React.StrictMode>
  );
} else {
  // Fallback rendering without Stytch
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
