import React from "react";
import { parseDescription } from "../utils/descriptionLinks";

// Estilo en línea: la hoja Glass fuerza color heredado y sin subrayado en todos los enlaces de la ficha.
const linkStyle: React.CSSProperties = {
  color: "#1275df",
  fontWeight: 700,
  textDecoration: "underline",
  textUnderlineOffset: 2,
  overflowWrap: "anywhere",
};

/** Presenta la descripción comercial: el texto se conserva y las URL pasan a enlaces con etiqueta legible. */
export function BusinessDescription({ text, fallback }: { text?: unknown; fallback: string }) {
  const parts = parseDescription(text);
  if (parts.length === 0) return <>{fallback}</>;
  return (
    <>
      {parts.map((part, index) =>
        part.type === "text" ? (
          <React.Fragment key={index}>{part.text}</React.Fragment>
        ) : (
          <a
            key={index}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            style={linkStyle}
            aria-label={`${part.label} (se abre en una pestaña nueva)`}
          >
            {part.label}
          </a>
        ),
      )}
    </>
  );
}
