import axios from "axios";
const apiURL=  process.env.REACT_APP_API_URL
const  APP_ENV=  process.env.REACT_APP_ENV
const url = APP_ENV === "PROD" ? apiURL : "http://localhost:7140";
axios.defaults.headers.post["Content-Type"] = "application/json";
axios.defaults.baseURL = url;
export const setAuthorization = (token) => {
  if (token) {
    sessionStorage.setItem("token", token);
    return (axios.defaults.headers.common["Authorization"] = "JWT " + token);
  }
  delete axios.defaults.headers.common["Authorization"];
};

export default axios;