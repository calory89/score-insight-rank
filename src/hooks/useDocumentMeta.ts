import { useEffect } from "react";

interface DocumentMeta {
  title: string;
  description?: string;
}

const useDocumentMeta = ({ title, description }: DocumentMeta) => {
  useEffect(() => {
    document.title = title;

    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (meta) {
        meta.setAttribute("content", description);
      }

      let ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) {
        ogDesc.setAttribute("content", description);
      }

      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute("content", title);
      }
    }
  }, [title, description]);
};

export default useDocumentMeta;
