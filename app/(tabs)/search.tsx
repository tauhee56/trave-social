import React, { useEffect } from "react";
import { useRouter } from "expo-router";

export default function SearchRedirect() {
  const router = useRouter();

  // Redirect legacy in-tab route to the modal `search-modal` route.
  useEffect(() => {
    router.replace('/search-modal');
  }, []);

  return null;
}
