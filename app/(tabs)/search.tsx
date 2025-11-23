import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function SearchRedirect() {
  const router = useRouter();

  // Redirect legacy in-tab route to the modal `search-modal` route.
  useEffect(() => {
    router.replace('/search-modal');
  }, []);

  return null;
}
