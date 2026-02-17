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

      const expiresInSeconds = parseInt(expires_in_param);
      const expiresAt = Date.now() + (expiresInSeconds * 1000);
      setExpiresIn(expiresInSeconds); // Keep state for interval duration calculation if needed

      // Save to localStorage
      localStorage.setItem('spotify_access_token', access_token_param);
      localStorage.setItem('spotify_refresh_token', refresh_token_param);
      localStorage.setItem('spotify_expires_at', expiresAt.toString());

      // Clean URL
      window.history.pushState({}, null, "/");
    } else {
      // Load from localStorage if not in URL
      const storedAccessToken = localStorage.getItem('spotify_access_token');
      const storedRefreshToken = localStorage.getItem('spotify_refresh_token');
      const storedExpiresAt = localStorage.getItem('spotify_expires_at');

      if (storedAccessToken && storedRefreshToken && storedExpiresAt) {
        const expiresAt = parseInt(storedExpiresAt);
        const now = Date.now();

        if (now >= expiresAt) {
          // Token expired, refresh immediately
          console.log("Token expired on load, refreshing...");
          setRefreshToken(storedRefreshToken); // This triggers the useEffect below
          setExpiresIn(0); // Trigger immediate refresh
        } else {
          setAccessToken(storedAccessToken);
          setRefreshToken(storedRefreshToken);
          setExpiresIn((expiresAt - now) / 1000);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!refreshToken) return;
    // If expiresIn is undefined (initial load before calculation) wait, unless it is 0 (immediate refresh needed)
    if (expiresIn === undefined) return;

    // Refresh token logic
    // Refresh 1 minute before expiry. If expiresIn is small/negative, refresh immediately (max 0).
    const delay = Math.max(0, (expiresIn - 60) * 1000);

    const interval = setTimeout(() => {
      axios
        .get("/refresh_token", {
          params: { refresh_token: refreshToken },
        })
        .then((res) => {
          setAccessToken(res.data.access_token);

          const newExpiresIn = res.data.expires_in;
          const newExpiresAt = Date.now() + (newExpiresIn * 1000);

          setExpiresIn(newExpiresIn);
          localStorage.setItem('spotify_access_token', res.data.access_token);
          localStorage.setItem('spotify_expires_at', newExpiresAt.toString());
        })
        .catch((err) => {
          console.error("Refresh failed", err);
          window.location = "/";
          localStorage.clear();
        });
    }, delay);

    return () => clearTimeout(interval);
  }, [refreshToken, expiresIn]);

  return accessToken;
};

export default useAuth;
