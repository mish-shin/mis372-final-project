import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from "@asgardeo/auth-react";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider
        config={ {
            signInRedirectURL: "https://mis372-final-project-final-submission-fe.onrender.com/",
            signOutRedirectURL: "https://mis372-final-project-final-submission-fe.onrender.com/",
            clientID: "tcnir27KlgOoBuMMgqZOgIpAJbca",
            baseUrl: "https://api.asgardeo.io/t/orgpe2w7",
            scope: [ "openid","profile" ]
        } }
    >
      <App />
    </AuthProvider>
  </StrictMode>,
)
