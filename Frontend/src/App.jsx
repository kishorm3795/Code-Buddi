import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import { BrowserRouter as Router } from "react-router-dom";
import { ThemeProvider, ThemeContext } from "./context/ThemeProvider";
import { AuthProvider } from "./context/AuthContext";
import { ProjectProvider } from "./context/ProjectContext";
import MainBody from "./components/MainBody";
import { RECAPTCHA_SITE_KEY } from "./utils/constants";

const App = () => {
  return (
    <GoogleReCaptchaProvider reCaptchaKey={RECAPTCHA_SITE_KEY}>
      <AuthProvider>
        <ThemeProvider>
          <ProjectProvider>
            <Router>
              <ThemeContext.Consumer>
                {({ isDarkMode, toggleTheme }) => (
                  <MainBody isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
                )}
              </ThemeContext.Consumer>
            </Router>
          </ProjectProvider>
        </ThemeProvider>
      </AuthProvider>
    </GoogleReCaptchaProvider>
  );
};

export default App;
