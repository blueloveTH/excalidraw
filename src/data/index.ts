import {
  copyBlobToClipboardAsPng,
  copyTextToSystemClipboard,
} from "../clipboard";
import { DEFAULT_EXPORT_PADDING, MIME_TYPES } from "../constants";
import { NonDeletedExcalidrawElement } from "../element/types";
import { t } from "../i18n";
import { exportToCanvas, exportToSvg } from "../scene/export";
import { ExportType } from "../scene/types";
import { AppState, BinaryFiles } from "../types";
import { canvasToBlob } from "./blob";
import { fileSave, FileSystemHandle } from "./filesystem";
import { serializeAsJSON } from "./json";

export { loadFromBlob } from "./blob";
export { loadFromJSON, saveAsJSON } from "./json";

export const exportCanvas = async (
  type: ExportType,
  elements: readonly NonDeletedExcalidrawElement[],
  appState: AppState,
  files: BinaryFiles,
  {
    exportBackground,
    exportPadding = DEFAULT_EXPORT_PADDING,
    viewBackgroundColor,
    name,
    fileHandle = null,
  }: {
    exportBackground: boolean;
    exportPadding?: number;
    viewBackgroundColor: string;
    name: string;
    fileHandle?: FileSystemHandle | null;
  },
) => {
  if (elements.length === 0) {
    throw new Error(t("alerts.cannotExportEmptyCanvas"));
  }
  if (type === "svg") {
    const tempSvg = await exportToSvg(
      elements,
      {
        exportBackground,
        exportWithDarkMode: appState.exportWithDarkMode,
        viewBackgroundColor,
        exportPadding,
        exportScale: appState.exportScale,
        exportEmbedScene: appState.exportEmbedScene && type === "svg",
      },
      files,
    );

    let blob = new Blob([tempSvg.outerHTML], { type: MIME_TYPES.svg });

    fetch(
      'http://localhost:2345/api/savefile',
      {"method": "POST", "body": await blob.arrayBuffer(), "mode": "no-cors", headers: {
        "filename": name + '.svg'
      }}
    )

    return;
  }

  const tempCanvas = await exportToCanvas(elements, appState, files, {
    exportBackground,
    viewBackgroundColor,
    exportPadding,
  });
  tempCanvas.style.display = "none";
  document.body.appendChild(tempCanvas);
  let blob = await canvasToBlob(tempCanvas);
  tempCanvas.remove();

  if (type === "png") {
    if (appState.exportEmbedScene) {
      blob = await (
        await import(/* webpackChunkName: "image" */ "./image")
      ).encodePngMetadata({
        blob,
        metadata: serializeAsJSON(elements, appState, files, "local"),
      });
    }

    fetch(
      'http://localhost:2345/api/savefile',
      {"method": "POST", "body": await blob.arrayBuffer(), "mode": "no-cors", headers: {
        "filename": name + '.png'
      }}
    )

    return;
  }
};
