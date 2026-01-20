import Lightbox, { Slide } from "yet-another-react-lightbox";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

interface GlobalLightboxProps {
  open: boolean;
  close: () => void;
  slides: Slide[];
  index?: number;
  onIndexChange?: (index: number) => void;
  showThumbnails?: boolean;
}

export function GlobalLightbox({
  open,
  close,
  slides,
  index = 0,
  onIndexChange,
  showThumbnails = false,
}: GlobalLightboxProps) {
  const plugins = [Zoom, ...(showThumbnails && slides.length > 1 ? [Thumbnails] : [])];

  return (
    <Lightbox
      open={open}
      close={close}
      index={index}
      slides={slides}
      plugins={plugins}
      controller={{ closeOnBackdropClick: true }}
      animation={{ fade: 0, swipe: 0 }}
      zoom={{
        scrollToZoom: true,
        maxZoomPixelRatio: 5,
      }}
      carousel={{ finite: true }}
      render={{
        buttonPrev: slides.length <= 1 ? () => null : undefined,
        buttonNext: slides.length <= 1 ? () => null : undefined,
      }}
      on={{
        view: onIndexChange ? ({ index: newIndex }) => onIndexChange(newIndex) : undefined,
      }}
      styles={{
        root: { zIndex: 2147483647, pointerEvents: "auto" },
        container: { backgroundColor: "#000", zIndex: 2147483647 },
      }}
    />
  );
}
