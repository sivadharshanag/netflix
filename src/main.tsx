import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "@/context/AuthContext";
import { MediaProvider } from "@/context/MediaContext";
import { BackgroundAudioProvider } from "@/context/AudioContext";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <MediaProvider>
          <BackgroundAudioProvider>
            <App />
          </BackgroundAudioProvider> 
        </MediaProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
