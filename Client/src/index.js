import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import App from "./App";
import "bootstrap/dist/css/bootstrap.min.css";
import swDev from "./serveiceWorkerDev.js";
import { AuthContextProvider } from "./Context/AuthContext.js";
import * as process from 'process';

window.global = window;
window.process = process;
window.Buffer = [];


 
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <AuthContextProvider>
      <App />
    </AuthContextProvider>
  </BrowserRouter>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
