"use client";

import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ImageIcon,
  Loader2,
  Monitor,
  RotateCcw,
  Save,
  Search,
  Smartphone,
  Tablet,
  Upload,
} from "lucide-react";

import Link from "next/link";

import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/* =========================================================
   TYPES
========================================================= */

type DesignEditorProps = {
  variantId:
    string;

  leadId:
    string;

  generationIndex:
    number;

  companyName:
    string;

  initialHtml:
    string;

  initialAllowedImages:
    string[];
};

type DeviceMode =
  | "desktop"
  | "tablet"
  | "mobile";

type EditableImageKind =
  | "img"
  | "background";

type SaveResponse = {
  ok?:
    boolean;

  error?:
    string;

  html?:
    string;

  allowedImages?:
    string[];
};

type UploadResponse = {
  ok?:
    boolean;

  error?:
    string;

  url?:
    string;
};

type PexelsPhoto = {
  id:
    number;

  width:
    number
    | null;

  height:
    number
    | null;

  imageUrl:
    string;

  thumbnailUrl:
    string;

  alt:
    string;

  photographer:
    string;

  photographerUrl:
    string
    | null;

  pexelsUrl:
    string
    | null;
};

type PexelsSearchResponse = {
  ok?:
    boolean;

  error?:
    string;

  query?:
    string;

  page?:
    number;

  totalResults?:
    number;

  hasNext?:
    boolean;

  hasPrevious?:
    boolean;

  photos?:
    PexelsPhoto[];
};

type RegisteredTarget = {
  id:
    string;

  kind:
    EditableImageKind;

  element:
    Element;

  handleClick:
    (
      event:
        Event
    ) => void;

  handleMouseEnter:
    () => void;

  handleMouseLeave:
    () => void;
};

/* =========================================================
   DEVICE WIDTHS
========================================================= */

const deviceWidths:
  Record<
    DeviceMode,
    number
  > = {
  desktop:
    1440,

  tablet:
    820,

  mobile:
    390,
};

/* =========================================================
   URL
========================================================= */

function isRemoteUrl(
  value:
    string
) {
  try {
    const url =
      new URL(
        value
      );

    return (
      url.protocol ===
        "https:" ||
      url.protocol ===
        "http:"
    );
  } catch {
    return false;
  }
}

/* =========================================================
   BACKGROUND IMAGE
========================================================= */

function extractBackgroundImageUrl(
  value:
    string
) {
  const matches =
    value.matchAll(
      /url\(\s*(?:"([^"]+)"|'([^']+)'|([^)'"\s]+))\s*\)/gi
    );

  for (
    const match of
      matches
  ) {
    const url =
      match[1] ??
      match[2] ??
      match[3] ??
      "";

    if (
      isRemoteUrl(
        url
      )
    ) {
      return url;
    }
  }

  return null;
}

function replaceFirstBackgroundUrl({
  backgroundImage,
  nextUrl,
}: {
  backgroundImage:
    string;

  nextUrl:
    string;
}) {
  const escaped =
    nextUrl
      .replace(
        /\\/g,
        "\\\\"
      )
      .replace(
        /"/g,
        '\\"'
      );

  return backgroundImage.replace(
    /url\(\s*(?:"[^"]+"|'[^']+'|[^)'"\s]+)\s*\)/i,
    `url("${escaped}")`
  );
}

/* =========================================================
   COMPONENT
========================================================= */

export function DesignEditor({
  variantId,
  leadId,
  generationIndex,
  companyName,
  initialHtml,
  initialAllowedImages,
}: DesignEditorProps) {
  const iframeRef =
    useRef<
      HTMLIFrameElement | null
    >(
      null
    );

  const cleanupRef =
    useRef<
      (() => void) | null
    >(
      null
    );

  const fileInputRef =
    useRef<
      HTMLInputElement | null
    >(
      null
    );

  /* =======================================================
     DESIGN
  ======================================================= */

  const [
    savedHtml,
    setSavedHtml,
  ] =
    useState(
      initialHtml
    );

  const [
    frameVersion,
    setFrameVersion,
  ] =
    useState(
      0
    );

  const [
    device,
    setDevice,
  ] =
    useState<DeviceMode>(
      "desktop"
    );

  const [
    selectedTargetId,
    setSelectedTargetId,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    selectedImageKind,
    setSelectedImageKind,
  ] =
    useState<
      EditableImageKind | null
    >(
      null
    );

  const [
    selectedImageUrl,
    setSelectedImageUrl,
  ] =
    useState(
      ""
    );

  const [
    customUrl,
    setCustomUrl,
  ] =
    useState(
      ""
    );

  const [
    allowedImages,
    setAllowedImages,
  ] =
    useState(
      initialAllowedImages
    );

  const [
    dirty,
    setDirty,
  ] =
    useState(
      false
    );

  const [
    saving,
    setSaving,
  ] =
    useState(
      false
    );

  const [
    saved,
    setSaved,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    uploading,
    setUploading,
  ] =
    useState(
      false
    );

  /* =======================================================
     PEXELS
  ======================================================= */

  const [
    stockQuery,
    setStockQuery,
  ] =
    useState(
      ""
    );

  const [
    stockPhotos,
    setStockPhotos,
  ] =
    useState<
      PexelsPhoto[]
    >(
      []
    );

  const [
    stockPage,
    setStockPage,
  ] =
    useState(
      1
    );

  const [
    stockSearching,
    setStockSearching,
  ] =
    useState(
      false
    );

  const [
    stockHasNext,
    setStockHasNext,
  ] =
    useState(
      false
    );

  const [
    stockHasPrevious,
    setStockHasPrevious,
  ] =
    useState(
      false
    );

  const [
    stockTotal,
    setStockTotal,
  ] =
    useState(
      0
    );

  const [
    stockError,
    setStockError,
  ] =
    useState<
      string | null
    >(
      null
    );

  /* =======================================================
     DERIVED
  ======================================================= */

  const deviceWidth =
    deviceWidths[
      device
    ];

  const uniqueAllowedImages =
    useMemo(
      () =>
        Array.from(
          new Set(
            allowedImages.filter(
              (
                value
              ) =>
                isRemoteUrl(
                  value
                )
            )
          )
        ),
      [
        allowedImages,
      ]
    );

  /* =======================================================
     GET SELECTED ELEMENT
  ======================================================= */

  const getSelectedElement =
    useCallback(
      () => {
        if (
          !selectedTargetId
        ) {
          return null;
        }

        const frameDocument =
          iframeRef.current
            ?.contentDocument;

        if (
          !frameDocument
        ) {
          return null;
        }

        return frameDocument.querySelector(
          `[data-leadbase-editor-target-id="${selectedTargetId}"]`
        );
      },
      [
        selectedTargetId,
      ]
    );

  /* =======================================================
     CLEAR SELECTION
  ======================================================= */

  const clearSelection =
    useCallback(
      () => {
        const frameDocument =
          iframeRef.current
            ?.contentDocument;

        if (
          frameDocument
        ) {
          frameDocument
            .querySelectorAll(
              "[data-leadbase-editor-selected]"
            )
            .forEach(
              (
                element
              ) => {
                element.removeAttribute(
                  "data-leadbase-editor-selected"
                );
              }
            );
        }

        setSelectedTargetId(
          null
        );

        setSelectedImageKind(
          null
        );

        setSelectedImageUrl(
          ""
        );

        setCustomUrl(
          ""
        );
      },
      []
    );

  /* =======================================================
     FRESH AFTER NAVIGATION
  ======================================================= */

  useEffect(
    () => {
      cleanupRef.current?.();

      cleanupRef.current =
        null;

      setSavedHtml(
        initialHtml
      );

      setAllowedImages(
        initialAllowedImages
      );

      setSelectedTargetId(
        null
      );

      setSelectedImageKind(
        null
      );

      setSelectedImageUrl(
        ""
      );

      setCustomUrl(
        ""
      );

      setDirty(
        false
      );

      setSaved(
        false
      );

      setError(
        null
      );

      setUploading(
        false
      );

      setStockQuery(
        ""
      );

      setStockPhotos(
        []
      );

      setStockPage(
        1
      );

      setStockHasNext(
        false
      );

      setStockHasPrevious(
        false
      );

      setStockTotal(
        0
      );

      setStockError(
        null
      );

      setFrameVersion(
        (
          current
        ) =>
          current +
          1
      );
    },
    [
      variantId,
      initialHtml,
      initialAllowedImages,
    ]
  );

  /* =======================================================
     INSTALL EDITOR
  ======================================================= */

  const installFrameEditor =
    useCallback(
      () => {
        cleanupRef.current?.();

        cleanupRef.current =
          null;

        const iframe =
          iframeRef.current;

        const frameDocument =
          iframe
            ?.contentDocument;

        const frameWindow =
          iframe
            ?.contentWindow;

        if (
          !iframe ||
          !frameDocument ||
          !frameWindow ||
          !frameDocument.body
        ) {
          return false;
        }

        /*
         * TypeScript narrows the values above, but that
         * narrowing is not preserved inside the nested
         * callbacks below.
         */
        const activeDocument:
          Document =
          frameDocument;

        const activeWindow:
          Window =
          frameWindow;

        activeDocument
          .getElementById(
            "leadbase-editor-style"
          )
          ?.remove();

        activeDocument
          .getElementById(
            "leadbase-editor-hover-label"
          )
          ?.remove();

        activeDocument
          .querySelectorAll(
            "[data-leadbase-editor-target-id]"
          )
          .forEach(
            (
              element
            ) => {
              element.removeAttribute(
                "data-leadbase-editor-target-id"
              );

              element.removeAttribute(
                "data-leadbase-editor-kind"
              );

              element.removeAttribute(
                "data-leadbase-editor-url"
              );

              element.removeAttribute(
                "data-leadbase-editor-selected"
              );
            }
          );

        const style =
          activeDocument.createElement(
            "style"
          );

        style.id =
          "leadbase-editor-style";

        style.textContent =
          `
[data-leadbase-editor-target-id] {
  cursor: pointer !important;
  outline: 3px solid transparent;
  outline-offset: -3px;
  transition:
    outline-color 120ms ease,
    box-shadow 120ms ease,
    filter 120ms ease;
}

[data-leadbase-editor-target-id]:hover {
  outline-color: #2563eb !important;
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,.45),
    0 0 0 1px rgba(37,99,235,.2);
}

[data-leadbase-editor-target-id][data-leadbase-editor-selected="true"] {
  outline: 4px solid #2563eb !important;
  outline-offset: -4px;
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,.55),
    0 0 0 2px rgba(37,99,235,.28);
}

#leadbase-editor-hover-label {
  position: absolute;
  z-index: 2147483646;
  display: none;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  background: #2563eb;
  color: #ffffff;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  pointer-events: none;
  box-shadow: 0 8px 28px rgba(0,0,0,.28);
}
          `.trim();

        (
          activeDocument.head ??
          activeDocument.documentElement
        ).appendChild(
          style
        );

        const hoverLabel =
          activeDocument.createElement(
            "div"
          );

        hoverLabel.id =
          "leadbase-editor-hover-label";

        hoverLabel.textContent =
          "Bild ändern";

        activeDocument.body.appendChild(
          hoverLabel
        );

        const registered =
          new Map<
            Element,
            RegisteredTarget
          >();

        let counter =
          0;

        function positionHoverLabel(
          element:
            Element
        ) {
          const rect =
            element.getBoundingClientRect();

          if (
            rect.width <=
              0 ||
            rect.height <=
              0
          ) {
            hoverLabel.style.display =
              "none";

            return;
          }

          hoverLabel.style.display =
            "flex";

          const left =
            rect.left +
            activeWindow.scrollX +
            10;

          const top =
            rect.top +
            activeWindow.scrollY +
            10;

          hoverLabel.style.left =
            `${Math.max(
              4,
              left
            )}px`;

          hoverLabel.style.top =
            `${Math.max(
              4,
              top
            )}px`;
        }

        function clearSelectedVisuals() {
          activeDocument
            .querySelectorAll(
              "[data-leadbase-editor-selected]"
            )
            .forEach(
              (
                element
              ) => {
                element.removeAttribute(
                  "data-leadbase-editor-selected"
                );
              }
            );
        }

        function registerTarget({
          element,
          kind,
          url,
        }: {
          element:
            Element;

          kind:
            EditableImageKind;

          url:
            string;
        }) {
          if (
            registered.has(
              element
            ) ||
            !isRemoteUrl(
              url
            )
          ) {
            return;
          }

          if (
            kind ===
            "background"
          ) {
            const rect =
              element.getBoundingClientRect();

            if (
              rect.width <
                32 ||
              rect.height <
                32
            ) {
              return;
            }
          }

          counter +=
            1;

          const id =
            `image-${counter}`;

          element.setAttribute(
            "data-leadbase-editor-target-id",
            id
          );

          element.setAttribute(
            "data-leadbase-editor-kind",
            kind
          );

          element.setAttribute(
            "data-leadbase-editor-url",
            url
          );

          const handleMouseEnter =
            () => {
              hoverLabel.textContent =
                element.getAttribute(
                  "data-leadbase-editor-selected"
                ) ===
                "true"
                  ? "Ausgewählt"
                  : "Bild ändern";

              positionHoverLabel(
                element
              );
            };

          const handleMouseLeave =
            () => {
              hoverLabel.style.display =
                "none";
            };

          const handleClick =
            (
              event:
                Event
            ) => {
              event.preventDefault();

              event.stopPropagation();

              clearSelectedVisuals();

              element.setAttribute(
                "data-leadbase-editor-selected",
                "true"
              );

              const currentUrl =
                element.getAttribute(
                  "data-leadbase-editor-url"
                ) ??
                url;

              setSelectedTargetId(
                id
              );

              setSelectedImageKind(
                kind
              );

              setSelectedImageUrl(
                currentUrl
              );

              setCustomUrl(
                currentUrl
              );

              setSaved(
                false
              );

              setError(
                null
              );

              hoverLabel.textContent =
                "Ausgewählt";

              positionHoverLabel(
                element
              );
            };

          element.addEventListener(
            "click",
            handleClick,
            true
          );

          element.addEventListener(
            "mouseenter",
            handleMouseEnter
          );

          element.addEventListener(
            "mouseleave",
            handleMouseLeave
          );

          registered.set(
            element,
            {
              id,

              kind,

              element,

              handleClick,

              handleMouseEnter,

              handleMouseLeave,
            }
          );
        }

        function scanDocument() {
          const images =
            Array.from(
              activeDocument.querySelectorAll<HTMLImageElement>(
                "img"
              )
            );

          for (
            const image of
              images
          ) {
            if (
              registered.has(
                image
              )
            ) {
              continue;
            }

            const url =
              image.currentSrc ||
              image.getAttribute(
                "src"
              ) ||
              image.getAttribute(
                "data-src"
              ) ||
              image.getAttribute(
                "data-lazy-src"
              ) ||
              "";

            if (
              !isRemoteUrl(
                url
              )
            ) {
              continue;
            }

            registerTarget({
              element:
                image,

              kind:
                "img",

              url,
            });
          }

          const elements =
            Array.from(
              activeDocument.querySelectorAll<HTMLElement>(
                "body *"
              )
            );

          for (
            const element of
              elements
          ) {
            if (
              registered.has(
                element
              )
            ) {
              continue;
            }

            let backgroundImage =
              "";

            try {
              backgroundImage =
                activeWindow
                  .getComputedStyle(
                    element
                  )
                  .backgroundImage;
            } catch {
              continue;
            }

            const url =
              extractBackgroundImageUrl(
                backgroundImage
              );

            if (
              !url
            ) {
              continue;
            }

            registerTarget({
              element,

              kind:
                "background",

              url,
            });
          }
        }

        scanDocument();

        const retry1 =
          activeWindow.setTimeout(
            scanDocument,
            250
          );

        const retry2 =
          activeWindow.setTimeout(
            scanDocument,
            700
          );

        const retry3 =
          activeWindow.setTimeout(
            scanDocument,
            1500
          );

        const retry4 =
          activeWindow.setTimeout(
            scanDocument,
            3000
          );

        const handleDocumentLoad =
          (
            event:
              Event
          ) => {
            const target =
              event.target;

            if (
              target &&
              (
                target as
                  Element
              ).tagName?.toLowerCase() ===
                "img"
            ) {
              scanDocument();
            }
          };

        activeDocument.addEventListener(
          "load",
          handleDocumentLoad,
          true
        );

        const handleScroll =
          () => {
            const selected =
              activeDocument.querySelector(
                '[data-leadbase-editor-selected="true"]'
              );

            if (
              selected &&
              hoverLabel.style.display !==
                "none"
            ) {
              positionHoverLabel(
                selected
              );
            }
          };

        activeDocument.addEventListener(
          "scroll",
          handleScroll,
          true
        );

        activeWindow.addEventListener(
          "resize",
          handleScroll
        );

        cleanupRef.current =
          () => {
            activeWindow.clearTimeout(
              retry1
            );

            activeWindow.clearTimeout(
              retry2
            );

            activeWindow.clearTimeout(
              retry3
            );

            activeWindow.clearTimeout(
              retry4
            );

            activeDocument.removeEventListener(
              "load",
              handleDocumentLoad,
              true
            );

            activeDocument.removeEventListener(
              "scroll",
              handleScroll,
              true
            );

            activeWindow.removeEventListener(
              "resize",
              handleScroll
            );

            for (
              const target of
                registered.values()
            ) {
              target.element.removeEventListener(
                "click",
                target.handleClick,
                true
              );

              target.element.removeEventListener(
                "mouseenter",
                target.handleMouseEnter
              );

              target.element.removeEventListener(
                "mouseleave",
                target.handleMouseLeave
              );
            }
          };

        return (
          registered.size >
          0
        );
      },
      []
    );

  /* =======================================================
     FRAME LOAD
  ======================================================= */

  const handleFrameLoad =
    useCallback(
      () => {
        const installed =
          installFrameEditor();

        if (
          !installed
        ) {
          window.setTimeout(
            () => {
              installFrameEditor();
            },
            100
          );
        }
      },
      [
        installFrameEditor,
      ]
    );

  /* =======================================================
     REPLACE IMAGE
  ======================================================= */

  const replaceImage =
    useCallback(
      (
        nextUrl:
          string
      ) => {
        const cleaned =
          nextUrl.trim();

        if (
          !isRemoteUrl(
            cleaned
          )
        ) {
          setError(
            "Bitte eine gültige http- oder https-Bild-URL verwenden."
          );

          return;
        }

        const frameWindow =
          iframeRef.current
            ?.contentWindow;

        if (
          !frameWindow ||
          !selectedTargetId ||
          !selectedImageKind
        ) {
          setError(
            "Bitte zuerst ein Bild im Design auswählen."
          );

          return;
        }

        const target =
          getSelectedElement();

        if (
          !target
        ) {
          setError(
            "Das ausgewählte Bild wurde nicht mehr gefunden."
          );

          return;
        }

        if (
          selectedImageKind ===
            "img"
        ) {
          if (
            target.tagName.toLowerCase() !==
            "img"
          ) {
            setError(
              "Das ausgewählte Bild konnte nicht ersetzt werden."
            );

            return;
          }

          const image =
            target as
              HTMLImageElement;

          image.removeAttribute(
            "srcset"
          );

          image.removeAttribute(
            "sizes"
          );

          image.removeAttribute(
            "data-src"
          );

          image.removeAttribute(
            "data-srcset"
          );

          image.removeAttribute(
            "data-lazy-src"
          );

          image.removeAttribute(
            "data-original"
          );

          image.removeAttribute(
            "loading"
          );

          const picture =
            image.closest(
              "picture"
            );

          if (
            picture
          ) {
            picture
              .querySelectorAll(
                "source"
              )
              .forEach(
                (
                  source
                ) => {
                  source.removeAttribute(
                    "src"
                  );

                  source.removeAttribute(
                    "srcset"
                  );

                  source.removeAttribute(
                    "sizes"
                  );

                  source.removeAttribute(
                    "data-src"
                  );

                  source.removeAttribute(
                    "data-srcset"
                  );
                }
              );
          }

          image.setAttribute(
            "src",
            cleaned
          );
        }

        if (
          selectedImageKind ===
            "background"
        ) {
          let currentBackground =
            "";

          try {
            currentBackground =
              frameWindow
                .getComputedStyle(
                  target
                )
                .backgroundImage;
          } catch {
            setError(
              "Das Hintergrundbild konnte nicht gelesen werden."
            );

            return;
          }

          if (
            !currentBackground ||
            currentBackground ===
              "none"
          ) {
            setError(
              "Das Hintergrundbild konnte nicht gelesen werden."
            );

            return;
          }

          const nextBackground =
            replaceFirstBackgroundUrl({
              backgroundImage:
                currentBackground,

              nextUrl:
                cleaned,
            });

          (
            target as
              HTMLElement
          ).style.backgroundImage =
            nextBackground;
        }

        target.setAttribute(
          "data-leadbase-editor-url",
          cleaned
        );

        setSelectedImageUrl(
          cleaned
        );

        setCustomUrl(
          cleaned
        );

        setAllowedImages(
          (
            current
          ) =>
            current.includes(
              cleaned
            )
              ? current
              : [
                  cleaned,
                  ...current,
                ]
        );

        setDirty(
          true
        );

        setSaved(
          false
        );

        setError(
          null
        );
      },
      [
        getSelectedElement,
        selectedImageKind,
        selectedTargetId,
      ]
    );

  /* =======================================================
     UPLOAD OWN IMAGE
  ======================================================= */

  async function uploadOwnImage(
    file:
      File
  ) {
    if (
      uploading
    ) {
      return;
    }

    const allowedTypes =
      new Set([
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ]);

    if (
      !allowedTypes.has(
        file.type
      )
    ) {
      setError(
        "Bitte JPG, PNG, WebP oder GIF hochladen."
      );

      return;
    }

    if (
      file.size <=
      0
    ) {
      setError(
        "Die ausgewählte Datei ist leer."
      );

      return;
    }

    if (
      file.size >
      10 *
        1024 *
        1024
    ) {
      setError(
        "Das Bild darf maximal 10 MB groß sein."
      );

      return;
    }

    if (
      !selectedTargetId ||
      !selectedImageKind
    ) {
      setError(
        "Bitte zuerst ein Bild im Design auswählen."
      );

      return;
    }

    setUploading(
      true
    );

    setError(
      null
    );

    setSaved(
      false
    );

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          `/api/design-preview/${encodeURIComponent(
            variantId
          )}`,
          {
            method:
              "POST",

            body:
              formData,
          }
        );

      const contentType =
        response.headers.get(
          "content-type"
        ) ??
        "";

      if (
        !contentType.includes(
          "application/json"
        )
      ) {
        throw new Error(
          "Der Server hat keine gültige Antwort zurückgegeben."
        );
      }

      const result =
        (await response.json()) as
          UploadResponse;

      if (
        !response.ok ||
        !result.ok ||
        !result.url
      ) {
        throw new Error(
          result.error ??
          "Das Bild konnte nicht hochgeladen werden."
        );
      }

      const uploadedUrl =
        result.url;

      setAllowedImages(
        (
          current
        ) =>
          current.includes(
            uploadedUrl
          )
            ? current
            : [
                uploadedUrl,
                ...current,
              ]
      );

      replaceImage(
        uploadedUrl
      );
    } catch (
      uploadError
    ) {
      console.error(
        "Could not upload custom design image:",
        uploadError
      );

      setError(
        uploadError instanceof
          Error
          ? uploadError.message
          : "Das Bild konnte nicht hochgeladen werden."
      );
    } finally {
      setUploading(
        false
      );
    }
  }

  /* =======================================================
     PEXELS SEARCH
  ======================================================= */

  const searchPexels =
    useCallback(
      async ({
        query,
        page,
      }: {
        query:
          string;

        page:
          number;
      }) => {
        const cleaned =
          query.trim();

        if (
          cleaned.length <
          2
        ) {
          setStockError(
            "Bitte mindestens zwei Zeichen eingeben."
          );

          return;
        }

        setStockSearching(
          true
        );

        setStockError(
          null
        );

        try {
          const params =
            new URLSearchParams();

          params.set(
            "q",
            cleaned
          );

          params.set(
            "page",
            String(
              page
            )
          );

          const response =
            await fetch(
              `/api/pexels/search?${params.toString()}`,
              {
                cache:
                  "no-store",
              }
            );

          const contentType =
            response.headers.get(
              "content-type"
            ) ??
            "";

          if (
            !contentType.includes(
              "application/json"
            )
          ) {
            throw new Error(
              "Pexels hat keine gültige Antwort geliefert."
            );
          }

          const result =
            (await response.json()) as
              PexelsSearchResponse;

          if (
            !response.ok ||
            !result.ok
          ) {
            throw new Error(
              result.error ??
              "Pexels konnte nicht durchsucht werden."
            );
          }

          setStockPhotos(
            result.photos ??
            []
          );

          setStockPage(
            result.page ??
            page
          );

          setStockHasNext(
            result.hasNext ??
            false
          );

          setStockHasPrevious(
            result.hasPrevious ??
            false
          );

          setStockTotal(
            result.totalResults ??
            0
          );
        } catch (
          searchError
        ) {
          console.error(
            "Could not search Pexels:",
            searchError
          );

          setStockError(
            searchError instanceof
              Error
              ? searchError.message
              : "Pexels konnte nicht durchsucht werden."
          );
        } finally {
          setStockSearching(
            false
          );
        }
      },
      []
    );

  function handleStockSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    void searchPexels({
      query:
        stockQuery,

      page:
        1,
    });
  }

  /* =======================================================
     SERIALIZE
  ======================================================= */

  function serializeCurrentDocument() {
    const frameDocument =
      iframeRef.current
        ?.contentDocument;

    if (
      !frameDocument
    ) {
      return null;
    }

    const clone =
      frameDocument.documentElement.cloneNode(
        true
      ) as
        HTMLElement;

    clone
      .querySelector(
        "#leadbase-editor-style"
      )
      ?.remove();

    clone
      .querySelector(
        "#leadbase-editor-hover-label"
      )
      ?.remove();

    clone
      .querySelector(
        "#leadbase-editor-overlay-root"
      )
      ?.remove();

    clone
      .querySelector(
        "#leadbase-editor-overlay-style"
      )
      ?.remove();

    clone
      .querySelectorAll(
        "*"
      )
      .forEach(
        (
          element
        ) => {
          Array.from(
            element.attributes
          ).forEach(
            (
              attribute
            ) => {
              if (
                attribute.name.startsWith(
                  "data-leadbase-editor-"
                )
              ) {
                element.removeAttribute(
                  attribute.name
                );
              }
            }
          );
        }
      );

    return `<!DOCTYPE html>
${clone.outerHTML}`;
  }

  /* =======================================================
     SAVE
  ======================================================= */

  async function saveDesign() {
    if (
      saving
    ) {
      return;
    }

    const html =
      serializeCurrentDocument();

    if (
      !html
    ) {
      setError(
        "Das Design konnte nicht gelesen werden."
      );

      return;
    }

    setSaving(
      true
    );

    setSaved(
      false
    );

    setError(
      null
    );

    try {
      const response =
        await fetch(
          `/api/design-preview/${encodeURIComponent(
            variantId
          )}`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                html,
              }),
          }
        );

      const contentType =
        response.headers.get(
          "content-type"
        ) ??
        "";

      if (
        !contentType.includes(
          "application/json"
        )
      ) {
        throw new Error(
          "Der Server hat keine gültige Antwort zurückgegeben."
        );
      }

      const result =
        (await response.json()) as
          SaveResponse;

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ??
          "Das Design konnte nicht gespeichert werden."
        );
      }

      const nextHtml =
        result.html ??
        html;

      setSavedHtml(
        nextHtml
      );

      if (
        result.allowedImages
      ) {
        setAllowedImages(
          result.allowedImages
        );
      }

      setDirty(
        false
      );

      setSaved(
        true
      );

      window.setTimeout(
        () => {
          setSaved(
            false
          );
        },
        2200
      );
    } catch (
      saveError
    ) {
      console.error(
        "Could not save design editor changes:",
        saveError
      );

      setError(
        saveError instanceof
          Error
          ? saveError.message
          : "Das Design konnte nicht gespeichert werden."
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  /* =======================================================
     RESET
  ======================================================= */

  function resetChanges() {
    cleanupRef.current?.();

    cleanupRef.current =
      null;

    clearSelection();

    setDirty(
      false
    );

    setSaved(
      false
    );

    setError(
      null
    );

    setFrameVersion(
      (
        current
      ) =>
        current +
        1
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="flex min-h-dvh flex-col bg-[#111] text-white">
      <header className="sticky top-0 z-50 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#151515]/95 px-4 py-2 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/leads/${encodeURIComponent(
              leadId
            )}`}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition-colors hover:bg-white/10"
            title="Zurück zum Lead"
          >
            <ArrowLeft className="size-4" />
          </Link>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {
                companyName
              }
            </p>

            <p className="text-[11px] text-white/45">
              Variante{" "}
              {
                generationIndex
              }
            </p>
          </div>
        </div>

        <div className="flex rounded-lg border border-white/10 bg-black/20 p-1">
          <DeviceButton
            active={
              device ===
              "desktop"
            }
            label="Desktop"
            onClick={() =>
              setDevice(
                "desktop"
              )
            }
          >
            <Monitor className="size-4" />
          </DeviceButton>

          <DeviceButton
            active={
              device ===
              "tablet"
            }
            label="Tablet"
            onClick={() =>
              setDevice(
                "tablet"
              )
            }
          >
            <Tablet className="size-4" />
          </DeviceButton>

          <DeviceButton
            active={
              device ===
              "mobile"
            }
            label="Mobile"
            onClick={() =>
              setDevice(
                "mobile"
              )
            }
          >
            <Smartphone className="size-4" />
          </DeviceButton>
        </div>

        <div className="flex items-center gap-2">
          {dirty ? (
            <button
              type="button"
              onClick={
                resetChanges
              }
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="size-3.5" />

              Zurücksetzen
            </button>
          ) : null}

          <a
            href={`/design-preview/${encodeURIComponent(
              variantId
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-9 items-center justify-center rounded-lg border border-white/10 transition-colors hover:bg-white/10"
            title="Vorschau öffnen"
          >
            <ExternalLink className="size-4" />
          </a>

          <button
            type="button"
            disabled={
              saving ||
              !dirty
            }
            onClick={() =>
              void saveDesign()
            }
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : saved ? (
              <Check className="size-4" />
            ) : (
              <Save className="size-4" />
            )}

            {saving
              ? "Speichert..."
              : saved
                ? "Gespeichert"
                : "Speichern"}
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-h-0 overflow-auto bg-[#202124] p-5 lg:p-8">
          <div
            className="mx-auto overflow-hidden bg-white shadow-2xl transition-[width] duration-300 ease-out"
            style={{
              width:
                `${deviceWidth}px`,

              maxWidth:
                device ===
                "desktop"
                  ? "100%"
                  : "none",
            }}
          >
            <iframe
              key={
                frameVersion
              }
              ref={
                iframeRef
              }
              title={`Editor · ${companyName}`}
              srcDoc={
                savedHtml
              }
              sandbox="allow-same-origin"
              referrerPolicy="no-referrer"
              onLoad={
                handleFrameLoad
              }
              className="block h-[calc(100dvh-110px)] min-h-[720px] w-full border-0 bg-white"
            />
          </div>
        </div>

        <aside className="border-l border-white/10 bg-[#151515]">
          <div className="sticky top-16 max-h-[calc(100dvh-64px)] overflow-y-auto p-4">
            <div className="mb-5">
              <p className="text-sm font-semibold">
                Bild bearbeiten
              </p>

              <p className="mt-1 text-xs leading-5 text-white/45">
                Bewege die Maus direkt über ein Bild im Design.
                Es bekommt einen blauen Rahmen und kann direkt
                angeklickt werden.
              </p>
            </div>

            {selectedTargetId ===
            null ? (
              <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-white/15 px-6 text-center">
                <ImageIcon className="size-6 text-white/30" />

                <p className="mt-3 text-sm font-medium text-white/70">
                  Kein Bild ausgewählt
                </p>

                <p className="mt-1 text-xs leading-5 text-white/35">
                  Fahre über ein Bild. Sobald der blaue Rahmen
                  erscheint, kannst du es anklicken.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-300">
                      Ausgewähltes Bild
                    </p>

                    <span className="rounded-md bg-black/20 px-1.5 py-0.5 text-[9px] font-medium uppercase text-white/45">
                      {selectedImageKind ===
                      "background"
                        ? "Background"
                        : "Image"}
                    </span>
                  </div>

                  <p className="mt-2 break-all text-[11px] leading-5 text-white/55">
                    {
                      selectedImageUrl
                    }
                  </p>
                </div>

                <div className="mt-5">
                  <label
                    htmlFor="custom-image-url"
                    className="text-xs font-medium text-white/70"
                  >
                    Eigene Bild-URL
                  </label>

                  <input
                    id="custom-image-url"
                    type="url"
                    value={
                      customUrl
                    }
                    onChange={
                      (
                        event
                      ) =>
                        setCustomUrl(
                          event.target.value
                        )
                    }
                    placeholder="https://..."
                    className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-xs text-white outline-none transition-colors placeholder:text-white/25 focus:border-blue-500"
                  />

                  <button
                    type="button"
                    disabled={
                      !isRemoteUrl(
                        customUrl
                      )
                    }
                    onClick={() =>
                      replaceImage(
                        customUrl
                      )
                    }
                    className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-lg border border-white/10 text-xs font-semibold transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    Dieses Bild verwenden
                  </button>
                </div>

                <div className="mt-5">
                  <input
                    ref={
                      fileInputRef
                    }
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={
                      (
                        event
                      ) => {
                        const file =
                          event.target
                            .files?.[0];

                        event.target.value =
                          "";

                        if (
                          file
                        ) {
                          void uploadOwnImage(
                            file
                          );
                        }
                      }
                    }
                  />

                  <button
                    type="button"
                    disabled={
                      uploading
                    }
                    onClick={() =>
                      fileInputRef.current
                        ?.click()
                    }
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}

                    {uploading
                      ? "Bild wird hochgeladen..."
                      : "Eigenes Bild hochladen"}
                  </button>

                  <p className="mt-2 text-[10px] leading-4 text-white/30">
                    JPG, PNG, WebP oder GIF · maximal 10 MB.
                    Nach dem Upload wird das ausgewählte Bild
                    direkt ersetzt.
                  </p>
                </div>

                <div className="mt-6 border-t border-white/10 pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-white/80">
                        Stock-Fotos
                      </p>

                      <p className="mt-0.5 text-[10px] text-white/35">
                        Durchsuche Pexels direkt im Editor
                      </p>
                    </div>

                    <a
                      href="https://www.pexels.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-white/40 transition-colors hover:text-white"
                    >
                      Pexels

                      <ExternalLink className="size-3" />
                    </a>
                  </div>

                  <form
                    onSubmit={
                      handleStockSubmit
                    }
                    className="mt-3 flex gap-2"
                  >
                    <div className="relative min-w-0 flex-1">
                      <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/30" />

                      <input
                        type="search"
                        value={
                          stockQuery
                        }
                        onChange={
                          (
                            event
                          ) =>
                            setStockQuery(
                              event.target.value
                            )
                        }
                        placeholder="z. B. Dachdecker Baustelle"
                        className="h-10 w-full rounded-lg border border-white/10 bg-black/20 pl-9 pr-3 text-xs text-white outline-none transition-colors placeholder:text-white/25 focus:border-blue-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={
                        stockSearching ||
                        stockQuery.trim()
                          .length <
                          2
                      }
                      className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                      title="Pexels durchsuchen"
                    >
                      {stockSearching ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Search className="size-4" />
                      )}
                    </button>
                  </form>

                  {stockError ? (
                    <p className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] leading-5 text-red-300">
                      {
                        stockError
                      }
                    </p>
                  ) : null}

                  {stockPhotos.length >
                  0 ? (
                    <>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {stockPhotos.map(
                          (
                            photo
                          ) => (
                            <div
                              key={
                                photo.id
                              }
                              className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-black/20"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  replaceImage(
                                    photo.imageUrl
                                  )
                                }
                                className="group relative block aspect-[4/3] w-full overflow-hidden bg-black/30"
                                title="Dieses Pexels-Foto verwenden"
                              >
                                <img
                                  src={
                                    photo.thumbnailUrl
                                  }
                                  alt={
                                    photo.alt
                                  }
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                                />

                                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6 text-left text-[9px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                                  Bild verwenden
                                </span>
                              </button>

                              <div className="min-w-0 px-2 py-1.5">
                                {photo.pexelsUrl ? (
                                  <a
                                    href={
                                      photo.pexelsUrl
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block truncate text-[9px] text-white/40 transition-colors hover:text-white"
                                    title={`Foto von ${photo.photographer} auf Pexels`}
                                  >
                                    Foto:{" "}
                                    {
                                      photo.photographer
                                    }
                                  </a>
                                ) : (
                                  <p className="truncate text-[9px] text-white/40">
                                    Foto:{" "}
                                    {
                                      photo.photographer
                                    }
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          disabled={
                            stockSearching ||
                            !stockHasPrevious
                          }
                          onClick={() =>
                            void searchPexels({
                              query:
                                stockQuery,

                              page:
                                Math.max(
                                  1,
                                  stockPage -
                                    1
                                ),
                            })
                          }
                          className="flex size-8 items-center justify-center rounded-lg border border-white/10 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-25"
                          title="Vorherige Seite"
                        >
                          <ChevronLeft className="size-4" />
                        </button>

                        <p className="text-[10px] text-white/35">
                          Seite{" "}
                          {
                            stockPage
                          }

                          {stockTotal >
                          0
                            ? ` · ${stockTotal.toLocaleString(
                                "de-DE"
                              )} Ergebnisse`
                            : ""}
                        </p>

                        <button
                          type="button"
                          disabled={
                            stockSearching ||
                            !stockHasNext
                          }
                          onClick={() =>
                            void searchPexels({
                              query:
                                stockQuery,

                              page:
                                stockPage +
                                1,
                            })
                          }
                          className="flex size-8 items-center justify-center rounded-lg border border-white/10 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-25"
                          title="Nächste Seite"
                        >
                          <ChevronRight className="size-4" />
                        </button>
                      </div>

                      <p className="mt-3 text-center text-[9px] text-white/25">
                        Photos provided by{" "}
                        <a
                          href="https://www.pexels.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline decoration-white/20 underline-offset-2 transition-colors hover:text-white"
                        >
                          Pexels
                        </a>
                      </p>
                    </>
                  ) : null}
                </div>

                <div className="mt-6 border-t border-white/10 pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-white/70">
                      Firmenbilder
                    </p>

                    <span className="text-[10px] text-white/30">
                      {
                        uniqueAllowedImages.length
                      }{" "}
                      Bilder
                    </span>
                  </div>

                  {uniqueAllowedImages.length >
                  0 ? (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {uniqueAllowedImages.map(
                        (
                          imageUrl
                        ) => {
                          const active =
                            selectedImageUrl ===
                            imageUrl;

                          return (
                            <button
                              key={
                                imageUrl
                              }
                              type="button"
                              onClick={() =>
                                replaceImage(
                                  imageUrl
                                )
                              }
                              className={`group relative aspect-[4/3] overflow-hidden rounded-lg border transition-all ${
                                active
                                  ? "border-blue-500 ring-2 ring-blue-500/30"
                                  : "border-white/10 hover:border-white/30"
                              }`}
                              title="Bild verwenden"
                            >
                              <img
                                src={
                                  imageUrl
                                }
                                alt=""
                                referrerPolicy="no-referrer"
                                loading="lazy"
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                              />

                              {active ? (
                                <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-blue-600 text-white">
                                  <Check className="size-3" />
                                </span>
                              ) : null}
                            </button>
                          );
                        }
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs leading-5 text-white/35">
                      Für diese Variante wurden keine weiteren
                      Firmenbilder gespeichert.
                    </p>
                  )}
                </div>
              </>
            )}

            {error ? (
              <p className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs leading-5 text-red-300">
                {
                  error
                }
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

/* =========================================================
   DEVICE BUTTON
========================================================= */

function DeviceButton({
  active,
  label,
  onClick,
  children,
}: {
  active:
    boolean;

  label:
    string;

  onClick:
    () => void;

  children:
    ReactNode;
}) {
  return (
    <button
      type="button"
      title={
        label
      }
      aria-label={
        label
      }
      onClick={
        onClick
      }
      className={`flex size-8 items-center justify-center rounded-md transition-colors ${
        active
          ? "bg-white text-black"
          : "text-white/50 hover:bg-white/10 hover:text-white"
      }`}
    >
      {
        children
      }
    </button>
  );
}