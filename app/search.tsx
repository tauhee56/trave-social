

import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function SearchRedirect() {
  const router = useRouter();

  // Redirect navigation search to the modal search route.
  useEffect(() => {
    router.replace("/search-modal");
  }, []);

  return null;
}


