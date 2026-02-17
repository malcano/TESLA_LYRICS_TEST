import { useState, useEffect } from "react";
import axios from "axios";

const useAuth = () => {
  const [accessToken, setAccessToken] = useState();
  const [refreshToken, setRefreshToken] = useState();
  const [expiresIn, setExpiresIn] = useState();

  useEffect(() => {
    // 1. Try to get tokens from URL (Redirect from server)
    const params = new URLSearchParams(window.location.search);
    const access_token_param = params.get("access_token");
    const refresh_token_param = params.get("refresh_token");
    const expires_in_param = params.get("expires_in");

    if (access_token_param) {
      setAccessToken(access_token_param);
      setRefreshToken(refresh_token_param);
      setExpiresIn(expires_in_param);

      // Save to localStorage
      localStorage.setItem('spotify_access_token', access_token_param);
      localStorage.setItem('spotify_refresh_token', refresh_token_param);
      localStorage.setItem('spotify_expires_in', expires_in_param);

      // Clean URL
      window.history.pushState({}, null, "/");
    } else {
      // Load from localStorage if not in URL
      const storedAccessToken = localStorage.getItem('spotify_access_token');
      const storedRefreshToken = localStorage.getItem('spotify_refresh_token');
      const storedExpiresIn = localStorage.getItem('spotify_expires_in');

      if (storedAccessToken && storedRefreshToken && storedExpiresIn) {
        setAccessToken(storedAccessToken);
        setRefreshToken(storedRefreshToken);
        setExpiresIn(storedExpiresIn);
      }
    }
  }, []);

  useEffect(() => {
    if (!refreshToken || !expiresIn) return;

    // Refresh token logic
    // Refresh 1 minute before expiry
    const interval = setInterval(() => {
      axios
        .get("/refresh_token", {
          params: { refresh_token: refreshToken },
        })
        .then((res) => {
          setAccessToken(res.data.access_token);
          if (res.data.expires_in) {
            setExpiresIn(res.data.expires_in);
            localStorage.setItem('spotify_expires_in', res.data.expires_in);
          }
          localStorage.setItem('spotify_access_token', res.data.access_token);
        })
        .catch(() => {
          window.location = "/";
          localStorage.clear();
        });
    }, (expiresIn - 60) * 1000);

    return () => clearInterval(interval);
  }, [refreshToken, expiresIn]);

  return accessToken;
};

export default useAuth;
