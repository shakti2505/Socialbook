import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { postRequest } from "../utilities/utilities";
import BASE_URL_API from "../utilities/baseURL";
import { apiVariables } from "../utilities/apiVariables";
import { useNavigate } from "react-router-dom";
import { ChatContext } from "./ChatContext";

export const AuthContext = createContext();
export const AuthContextProvider = ({ children, user }) => {
  const navigate = useNavigate();
  const [User, setUser] = useState(null);
  const [registerError, setRegisterError] = useState(null);
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [loginInfo, setLoginInfo] = useState({
    email: "",
    password: "",
  });

  const [registerInfo, setRegisterInfo] = useState({
    MobileOrEmail: "",
    Surname: "",
    fname: "",
    gender: "",
    password: "",
    days: "",
    months: "",
    years: "",
  });

  const updateRegisterinfo = useCallback((info) => {
    setRegisterInfo(info);
  }, []);

  const updateLogininfo = useCallback((info) => {
    setLoginInfo(info);
  }, []);

  const registerUser = useCallback(
    async (e) => {
      e.preventDefault();
      setIsRegisterLoading(true);
      setRegisterError(null);

      try {
        const response = await postRequest(
          `${BASE_URL_API}${apiVariables.signup.url}`,
          registerInfo
        );

        if (response.status === 201) {
          // User registered successfully
          localStorage.setItem("User", JSON.stringify(response.data.user));
          setRegisterInfo(null);
          setUser(response.data.user);
          setTimeout(() => {
            setIsRegisterLoading(true);
            navigate("/login");
          }, 2000);
        } else if (response.status === 500) {
          // Server error
          setRegisterError("Server error. Please try again later.");
        } else if (response.status === 200) {
          // User already registered
          setRegisterError(response.data.message);
        } else {
          // Unexpected status code
          setRegisterError(
            "Unexpected error occurred. Please try again later."
          );
        }
      } catch (error) {
        // Catch any network errors
        setRegisterError(
          "Network error. Please check your internet connection."
        );
      }
    },
    [registerInfo]
  );

  const logoutUser = useCallback(() => {
    setUser(null);
  }, []);

  const loginUser = useCallback(
    async (e) => {
      e.preventDefault();
      setIsLoginLoading(true);
      setLoginError(null);
      try {
        const response = await postRequest(
          `${BASE_URL_API}${apiVariables.signin.url}`,
          loginInfo
        );

        if (response.status === 200) {
          // User logged in successfully
          localStorage.setItem(
            "User",
            JSON.stringify(response.data.loggedInUser)
          );

          setUser(response.data.loggedInUser);
          setIsLoginLoading(false);
          navigate("/home");
        } else {
          setLoginError(response.data.message);
        }
      } catch (error) {
        // console.log(error.response.data.message, "login error message");
        setLoginError(error.response.data.message  );
        setIsLoginLoading(false);
        setLoginInfo({})

      }
    },
    [loginInfo]
  );

  useEffect(() => {
    const user = localStorage.getItem("user");
    setUser(JSON.stringify(user));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        registerInfo,
        updateRegisterinfo,
        registerUser,
        registerError,
        isRegisterLoading,
        logoutUser,
        updateLogininfo,
        loginError,
        loginUser,
        isLoginLoading,
        loginInfo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
