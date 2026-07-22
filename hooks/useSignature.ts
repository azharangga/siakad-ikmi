import { useState, useEffect } from "react";
import { getSignatureBase64 } from "@/app/actions/getSignature";
import { Official } from "@/lib/types";

export function useSignature(
  initialType: "basah" | "digital" | "none" = "none",
  official?: Official | null
) {
  const [signatureType, setSignatureType] = useState<"basah" | "digital" | "none">(initialType);
  const [signaturePath, setSignaturePath] = useState<string | null>(null);
  const [secureImage, setSecureImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Sync signaturePath apabila signatureType atau official berubah
  useEffect(() => {
    if (official) {
      if (signatureType === "basah") {
        setSignaturePath(official.ttd_basah_url || null);
      } else if (signatureType === "digital") {
        setSignaturePath(official.ttd_digital_url || null);
      } else {
        setSignaturePath(null);
      }
    }
  }, [signatureType, official]);

  useEffect(() => {
    const fetchSignature = async () => {
      if (signatureType === "none") {
        setSecureImage(null);
        setIsLoading(false);
        return;
      }

      const target = signaturePath;
      if (!target || target === "none" || target === "basah" || target === "digital") {
        setSecureImage(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const base64Data = await getSignatureBase64(target);
        setSecureImage(base64Data);
      } catch (error) {
        console.error("Failed to load signature", error);
        setSecureImage(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSignature();
  }, [signatureType, signaturePath]);

  return { signatureType, setSignatureType, setSignaturePath, secureImage, isLoading };
}
