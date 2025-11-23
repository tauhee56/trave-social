
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";

export default function SearchRedirect() {
  const router = useRouter();
  const [hasError, setHasError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    try {
      console.log("[Search Tab] Redirecting to /search-modal");
      router.replace('/search-modal');
    } catch (err) {
      setHasError(true);
      setErrorMsg(err?.message || String(err));
      console.error("[Search Tab] Redirect error:", err);
    }
  }, []);

  if (hasError) {
    return (
      <>
        <Text style={{ color: 'red', padding: 20 }}>Search tab crash: {errorMsg}</Text>
      </>
    );
  }
  return null;
}
