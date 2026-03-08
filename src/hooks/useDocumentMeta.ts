import { useEffect } from "react";

interface DocumentMeta {
  title: string;
  description?: string;
  ogImage?: string;
}

const useDocumentMeta = ({ title, description, ogImage }: DocumentMeta) => {
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

    if (ogImage) {
      let ogImg = document.querySelector('meta[property="og:image"]');
      if (ogImg) {
        ogImg.setAttribute("content", ogImage);
      }
      let twImg = document.querySelector('meta[name="twitter:image"]');
      if (twImg) {
        twImg.setAttribute("content", ogImage);
      }
    }
  }, [title, description, ogImage]);
};

export default useDocumentMeta;
