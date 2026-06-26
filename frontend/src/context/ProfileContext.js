import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import keycloak from "../keycloak";

const ProfileContext = createContext({
  avatarUrl: null,
  setAvatarFromFile: async () => {},
  removeAvatar: () => {},
});

function avatarStorageKey() {
  const sub = keycloak.tokenParsed?.sub || "default";
  return `tv_profile_avatar_${sub}`;
}

export function ProfileProvider({ children }) {
  const userId = keycloak.tokenParsed?.sub || "default";
  const [avatarUrl, setAvatarUrl] = useState(
    () => localStorage.getItem(avatarStorageKey()) || null
  );

  useEffect(() => {
    setAvatarUrl(localStorage.getItem(avatarStorageKey()) || null);
  }, [userId]);

  const persistAvatar = useCallback(
    (dataUrl) => {
      const key = avatarStorageKey();
      if (dataUrl) {
        localStorage.setItem(key, dataUrl);
      } else {
        localStorage.removeItem(key);
      }
      setAvatarUrl(dataUrl);
    },
    []
  );

  const setAvatarFromFile = useCallback(
    (file) =>
      new Promise((resolve, reject) => {
        if (!file) {
          reject(new Error("No file selected."));
          return;
        }

        if (!file.type.startsWith("image/")) {
          reject(new Error("Please choose an image file."));
          return;
        }

        if (file.size > 2 * 1024 * 1024) {
          reject(new Error("Image must be 2 MB or smaller."));
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          persistAvatar(reader.result);
          resolve(reader.result);
        };
        reader.onerror = () => reject(new Error("Could not read the image file."));
        reader.readAsDataURL(file);
      }),
    [persistAvatar]
  );

  const removeAvatar = useCallback(() => {
    persistAvatar(null);
  }, [persistAvatar]);

  const value = useMemo(
    () => ({
      avatarUrl,
      setAvatarFromFile,
      removeAvatar,
    }),
    [avatarUrl, setAvatarFromFile, removeAvatar]
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
