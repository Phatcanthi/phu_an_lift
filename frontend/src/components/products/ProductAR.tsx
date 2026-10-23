"use client";

import { useEffect, useState } from "react";

// <model-viewer> is a custom element, so React needs its attributes declared.
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        alt?: string;
        ar?: boolean;
        "ar-modes"?: string;
        "ar-scale"?: string;
        "camera-controls"?: boolean;
        "auto-rotate"?: boolean;
        "shadow-intensity"?: string;
        "touch-action"?: string;
        loading?: string;
      };
    }
  }
}

type Props = { src: string; alt: string };

/**
 * Interactive 3D view with a "view in your space" AR button (Scene Viewer on Android, Quick Look on iOS).
 * The model must be authored in metres; `ar-scale="fixed"` keeps it at that real-world size in AR.
 */
export function ProductAR({ src, alt }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // The prebuilt bundle ships its own copy of three.js, so it does not clash with the hero's version.
    import("@google/model-viewer/dist/model-viewer.min.js").then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="arview">
      {ready ? (
        <model-viewer
          className="arview__viewer"
          src={src}
          alt={alt}
          ar
          ar-modes="webxr scene-viewer quick-look"
          ar-scale="fixed"
          camera-controls
          auto-rotate
          shadow-intensity="1"
          touch-action="pan-y"
        >
          <button slot="ar-button" type="button" className="btn btn--solid arview__ar">
            Xem trong không gian của bạn
          </button>
        </model-viewer>
      ) : (
        <div className="arview__viewer arview__loading label">Đang tải mô hình 3D…</div>
      )}
    </div>
  );
}
