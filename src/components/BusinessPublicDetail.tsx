import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  Share2,
  X,
  ChevronLeft,
  ChevronRight,
  Phone,
  MessageCircle,
  QrCode,
  ExternalLink,
  MapPin,
  Clock,
  CreditCard,
  Truck,
  FileText,
  LockKeyhole,
  Star,
  Images,
} from "lucide-react";
import { Business } from "./BusinessCard";
import { StarRatingWidget } from "./StarRatingWidget";
import { getBusinessPublicUrl } from "../utils/businessUrl";
import { BusinessDescription } from "./BusinessDescription";
import "./BusinessPublicDetail.css";

interface Props {
  business: Business;
  modal?: boolean;
  onBack: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onOpenDigitalCard?: (b: Business) => void;
  onOpenClientPage?: (b: Business) => void;
  activePromotion?: any;
  onOpenPromotion?: (p: any) => void;
}
function safeUrl(value?: string): string | undefined {
  if (!value) return;
  try {
    const u = new URL(value, window.location.origin);
    if (["http:", "https:"].includes(u.protocol)) return u.href;
  } catch {
    /* Unusable registered URL. */
  }
}
function phone(value?: string) {
  const n = (value || "").replace(/\D/g, "");
  if (/^\d{10}$/.test(n)) return `52${n}`;
  if (/^52\d{10}$/.test(n)) return n;
  if (/^521\d{10}$/.test(n)) return `52${n.slice(3)}`;
}
// Only known Google Maps origins can become links/frames; no address/name geocoding.
export function businessMapPresentation(b: {
  mapsUrl?: unknown;
  latitude?: unknown;
  longitude?: unknown;
}) {
  const coordinate = (v: unknown, max: number) => {
    if (
      typeof v !== "number" &&
      (typeof v !== "string" ||
        !v.trim() ||
        !/^[-+]?\d+(?:\.\d+)?$/.test(v.trim()))
    )
      return undefined;
    const n = Number(v);
    return Number.isFinite(n) && Math.abs(n) <= max ? n : undefined;
  };
  const lat = coordinate(b.latitude, 90),
    lon = coordinate(b.longitude, 180);
  const coordinateLink =
    lat !== undefined && lon !== undefined
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
      : undefined;
  let link: string | undefined, embed: string | undefined;
  if (typeof b.mapsUrl === "string" && b.mapsUrl.length <= 7000)
    try {
      const u = new URL(b.mapsUrl);
      const google = [
        "www.google.com",
        "google.com",
        "maps.google.com",
      ].includes(u.hostname);
      if (
        u.protocol === "https:" &&
        !u.username &&
        !u.password &&
        !u.port &&
        !u.searchParams.has("key")
      ) {
        if (
          google &&
          (u.pathname === "/maps" ||
            u.pathname.startsWith("/maps/") ||
            (u.hostname === "maps.google.com" && u.pathname === "/"))
        )
          link = u.href;
        else if (u.hostname === "maps.app.goo.gl" && u.pathname.length > 1)
          link = u.href;
        const pb = u.searchParams.get("pb");
        if (
          google &&
          u.pathname === "/maps/embed" &&
          pb &&
          pb.startsWith("!") &&
          pb.length <= 6000 &&
          !/[<>`"\p{Cc}\p{Cf}]/u.test(pb)
        ) {
          const canonical = new URL("https://www.google.com/maps/embed");
          canonical.searchParams.set("pb", pb);
          embed = canonical.href;
        }
      }
    } catch {
      /* Invalid registered map is not a frame. */
    }
  return { link: coordinateLink || link, embed };
}
function companyLogo(value: unknown) {
  if (typeof value !== "string" || !value || value.length > 2048)
    return undefined;
  try {
    const u = new URL(value, window.location.origin);
    return ["https:", "http:"].includes(u.protocol) &&
      !u.username &&
      !u.password
      ? u.href
      : undefined;
  } catch {
    return undefined;
  }
}
function Photo({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return src && !failed ? (
    <img src={src} alt={alt} onError={() => setFailed(true)} />
  ) : (
    <div className="bpd-empty">
      <Images aria-hidden="true" />
      <span>Imagen no disponible</span>
    </div>
  );
}
/** Public presentation only. Administrative callbacks intentionally never enter this component. */
export function BusinessPublicDetail({
  business: b,
  modal,
  onBack,
  isFavorite,
  onToggleFavorite,
  onOpenDigitalCard,
  onOpenClientPage,
  activePromotion,
  onOpenPromotion,
}: Props) {
  const extra = b as Business & { cover_url?: string; logo_url?: string };
  const photos = [
    ...new Set(
      [
        extra.cover_url,
        ...(Array.isArray(b.gallery) ? b.gallery : []),
        b.image || b.imageUrl,
      ]
        .map(safeUrl)
        .filter(Boolean),
    ),
  ] as string[];
  const [index, setIndex] = useState(0),
    [gallery, setGallery] = useState(false),
    [admin, setAdmin] = useState(false),
    [notice, setNotice] = useState("");
  const root = useRef<HTMLDivElement>(null),
    galleryButton = useRef<HTMLButtonElement>(null),
    adminButton = useRef<HTMLButtonElement>(null);
  const [logoFailed, setLogoFailed] = useState(false),
    [mapConsent, setMapConsent] = useState(false),
    [mapFailed, setMapFailed] = useState(false),
    [mapWide, setMapWide] = useState(false);
  const mapBox = useRef<HTMLDivElement>(null);
  const mapPresentation = businessMapPresentation(b),
    registeredLogo = companyLogo(b.logo_url);
  useEffect(() => setLogoFailed(false), [b.id, b.logo_url]);
  useEffect(() => {
    setMapConsent(false);
    setMapFailed(false);
  }, [b.id, b.mapsUrl, b.latitude, b.longitude]);
  useEffect(() => {
    const node = mapBox.current;
    if (!node) return;
    const update = () => setMapWide(node.clientWidth >= 200);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [b.id]);
  useEffect(() => {
    const blocked = (event: SecurityPolicyViolationEvent) => {
      if (
        mapConsent &&
        ["frame-src", "child-src"].includes(event.effectiveDirective) &&
        event.blockedURI.startsWith("https://www.google.com")
      )
        setMapFailed(true);
    };
    document.addEventListener("securitypolicyviolation", blocked);
    return () =>
      document.removeEventListener("securitypolicyviolation", blocked);
  }, [mapConsent]);
  const overlay = gallery || admin;
  const hadOverlay = useRef(false);
  useEffect(() => {
    if (!modal && !overlay) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const container = root.current;
    const selector = overlay ? "[data-bpd-dialog]" : "[data-bpd-content]";
    const area = container?.querySelector<HTMLElement>(selector);
    const focusable = () =>
      Array.from(
        area?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input,[tabindex="0"]',
        ) || [],
      ).filter((el) => el.getClientRects().length > 0);
    if (!hadOverlay.current || overlay) focusable()[0]?.focus();
    hadOverlay.current = overlay;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (gallery) setGallery(false);
        else if (admin) setAdmin(false);
        else onBack();
      }
      if (
        gallery &&
        photos.length > 1 &&
        ["ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        e.preventDefault();
        setIndex(
          (i) =>
            (i + (e.key === "ArrowRight" ? 1 : -1) + photos.length) %
            photos.length,
        );
      }
      if (e.key === "Tab") {
        const items = focusable();
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key, true);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key, true);
      if (overlay)
        (gallery ? galleryButton.current : adminButton.current)?.focus();
      else previous?.focus();
    };
  }, [modal, gallery, admin, onBack, photos.length]);
  const share = async () => {
    setNotice("");
    try {
      if (navigator.share)
        await navigator.share({ title: b.name, url: getBusinessPublicUrl(b) });
      else {
        await navigator.clipboard.writeText(getBusinessPublicUrl(b));
        setNotice("Enlace copiado.");
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setNotice(
          "No se pudo compartir. Puedes copiar la dirección de la ficha.",
        );
    }
  };
  const tel = phone(b.phone),
    wa = phone(b.whatsapp);
  const map = mapPresentation.link;
  const payments = Array.isArray(b.paymentMethods)
    ? b.paymentMethods.filter(Boolean).join(" · ")
    : b.payment;
  const hours = b.openingHours || b.schedule;
  const delivery =
    b.deliveryOption ||
    b.delivery ||
    (b.hasDelivery === true ? "Entrega a domicilio" : "");
  const turn = (n: number) =>
    setIndex((i) => (i + n + photos.length) % photos.length);
  return (
    <div ref={root} className={`bpd-shell ${modal ? "bpd-modal" : ""}`}>
      <div
        className="bpd-content"
        data-bpd-content
        role={modal ? "dialog" : undefined}
        aria-modal={modal ? true : undefined}
        aria-label={`Ficha de ${b.name}`}
      >
        <nav className="bpd-toolbar" aria-label="Navegación de la ficha">
          <button onClick={onBack}>
            <ArrowLeft size={16} /> Negocios
          </button>
          <span className="bpd-crumb">
            / {b.category || b.categories?.[0] || "Directorio"} /{" "}
            <strong>{b.name}</strong>
          </span>
          <div className="bpd-tools">
            <button
              onClick={onToggleFavorite}
              disabled={!onToggleFavorite}
              aria-pressed={Boolean(isFavorite)}
            >
              <Bookmark size={15} fill={isFavorite ? "currentColor" : "none"} />{" "}
              {isFavorite ? "Guardado" : "Guardar"}
            </button>
            <button onClick={share}>
              <Share2 size={15} /> Compartir
            </button>
            {modal && (
              <button onClick={onBack} aria-label="Cerrar ficha">
                <X size={18} />
              </button>
            )}
          </div>
        </nav>
        {notice && (
          <p role="status" className="bpd-notice">
            {notice}
          </p>
        )}
        <div className="bpd-grid">
          <aside className="bpd-media">
            <div className="bpd-hero">
              <Photo src={photos[index]} alt={`${b.name}, foto ${index + 1}`} />
              {photos.length > 1 && (
                <>
                  <button
                    className="bpd-prev"
                    aria-label="Foto anterior"
                    onClick={() => turn(-1)}
                  >
                    <ChevronLeft />
                  </button>
                  <button
                    className="bpd-next"
                    aria-label="Foto siguiente"
                    onClick={() => turn(1)}
                  >
                    <ChevronRight />
                  </button>
                </>
              )}
              {photos.length > 0 && (
                <button
                  ref={galleryButton}
                  className="bpd-allphotos"
                  onClick={() => setGallery(true)}
                >
                  <Images size={15} /> Ver todas las fotos ({photos.length})
                </button>
              )}
            </div>
            {photos.length > 1 && (
              <div className="bpd-thumbnails">
                {photos.slice(0, 5).map((src, i) => (
                  <button
                    key={src}
                    aria-label={`Ver foto ${i + 1}${i === 4 && photos.length > 5 ? ` y ${photos.length - 5} más` : ""}`}
                    aria-pressed={index === i}
                    onClick={() => {
                      setIndex(i);
                      if (i === 4 && photos.length > 5) setGallery(true);
                    }}
                  >
                    <Photo src={src} alt="" />
                    {i === 4 && photos.length > 5 && (
                      <span>+{photos.length - 5}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {wa ? (
              <a
                className="bpd-action bpd-wa"
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle /> Enviar WhatsApp
              </a>
            ) : (
              <button className="bpd-action" disabled>
                WhatsApp no registrado
              </button>
            )}
            {tel ? (
              <a className="bpd-action bpd-call" href={`tel:+${tel}`}>
                <Phone /> Llamar al {b.phone}
              </a>
            ) : (
              <button className="bpd-action" disabled>
                Teléfono no registrado
              </button>
            )}
            <div className="bpd-pair">
              <button
                onClick={() => onOpenDigitalCard?.(b)}
                disabled={!onOpenDigitalCard}
              >
                <QrCode /> Tarjeta QR
              </button>
              <button onClick={share}>
                <Share2 /> Compartir negocio
              </button>
            </div>
            <a
              className="bpd-card bpd-landing"
              href={getBusinessPublicUrl(b)}
              onClick={
                onOpenClientPage
                  ? (e) => {
                      e.preventDefault();
                      onOpenClientPage(b);
                    }
                  : undefined
              }
            >
              <ExternalLink />
              <span>
                <strong>Visitar ficha pública</strong>
                <small>{getBusinessPublicUrl(b)}</small>
              </span>
              <ChevronRight />
            </a>
          </aside>
          <main className="bpd-story">
            <header className="bpd-card bpd-heading">
              <span className="bpd-category">
                {b.category || b.categories?.[0] || "Negocio local"}
              </span>
              <h1>{b.name}</h1>
              {b.shortDescription && <p>{b.shortDescription}</p>}
              <StarRatingWidget
                businessId={b.id}
                businessName={b.name}
                compact
              />
              <a
                className="bpd-review-link"
                href="#bpd-ratings"
                onClick={(e) => {
                  e.preventDefault();
                  root.current
                    ?.querySelector("#bpd-ratings")
                    ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }}
              >
                ★ Ver calificaciones de la comunidad
              </a>
            </header>
            <section className="bpd-card">
              <h2>
                <FileText /> Descripción
              </h2>
              <p className="bpd-description">
                <BusinessDescription
                  text={b.description}
                  fallback="El negocio todavía no ha registrado una descripción."
                />
              </p>
            </section>
            {activePromotion && onOpenPromotion && (
              <section className="bpd-card">
                <h2>Promoción del negocio</h2>
                <p>{activePromotion.title}</p>
                <button onClick={() => onOpenPromotion(activePromotion)}>
                  Ver promoción
                </button>
              </section>
            )}
            <section className="bpd-card bpd-reviews" id="bpd-ratings">
              <h2>
                <Star /> Opiniones de la comunidad
              </h2>
              <StarRatingWidget businessId={b.id} businessName={b.name} />
              <div className="bpd-comments">
                <MessageCircle size={20} />
                <strong>Comentarios todavía no disponibles</strong>
                <p>
                  Puedes calificar con estrellas. Aún no se pueden publicar
                  comentarios ni fotografías de reseñas.
                </p>
              </div>
            </section>
          </main>
          <div className="bpd-card bpd-identity">
            {registeredLogo && !logoFailed ? (
              <img
                src={registeredLogo}
                alt={`Logotipo de ${b.name}`}
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <>
                <span className="bpd-monogram" aria-hidden="true">
                  {b.name.slice(0, 1)}
                </span>
                <strong>{b.name}</strong>
              </>
            )}
          </div>
          <aside className="bpd-facts">
            <section className="bpd-card">
              <h2>
                <MapPin /> Ubicación
              </h2>
              <div ref={mapBox} className="bpd-map-container">
                {mapPresentation.embed && mapWide && !mapFailed ? (
                  mapConsent ? (
                    <>
                      <iframe
                        className="bpd-map-embed"
                        src={mapPresentation.embed}
                        title={`Mapa de ${b.name}`}
                        loading="lazy"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                        onError={() => setMapFailed(true)}
                      />
                      <small>
                        Si el mapa no se visualiza, utiliza el enlace externo.
                      </small>
                    </>
                  ) : (
                    <div className="bpd-map">
                      <MapPin size={30} />
                      <button type="button" onClick={() => setMapConsent(true)}>
                        Cargar mapa de Google
                      </button>
                      <small>Al cargarlo, conectarás con Google Maps.</small>
                    </div>
                  )
                ) : (
                  <div className="bpd-map">
                    <MapPin size={30} />
                    <span>
                      {mapFailed
                        ? "No se pudo cargar el mapa aquí."
                        : map
                          ? "Vista incrustada no disponible. Abre la ubicación en Google Maps."
                          : "Ubicación de mapa no registrada."}
                    </span>
                  </div>
                )}
              </div>
              <p>
                {b.address ||
                  (b.colonia
                    ? `Colonia ${b.colonia}`
                    : "Dirección no registrada")}
              </p>
              {map && (
                <a
                  className="bpd-map-link"
                  href={map}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir mapa <ExternalLink size={13} />
                </a>
              )}
            </section>
            <section className="bpd-card">
              <h2>
                <Clock /> Horario de atención
              </h2>
              <p>{hours || "Horario no registrado"}</p>
            </section>
            <section className="bpd-card">
              <h2>
                <CreditCard /> Formas de pago
              </h2>
              <p>{payments || "Formas de pago no registradas"}</p>
            </section>
            <section className="bpd-card">
              <h2>
                <Truck /> Entrega y servicio
              </h2>
              <p>{delivery || "Modalidades de entrega no registradas"}</p>
            </section>
          </aside>
        </div>
        <footer className="bpd-footer">
          <button ref={adminButton} onClick={() => setAdmin(true)}>
            <LockKeyhole size={14} /> Gestión del negocio
          </button>
          <span>Directorio de negocios · encarmen.org</span>
        </footer>
      </div>
      {overlay && (
        <div className="bpd-overlay">
          <section
            data-bpd-dialog
            role="dialog"
            aria-modal="true"
            aria-label={gallery ? "Galería del negocio" : "Gestión pendiente"}
            className={`bpd-card ${gallery ? "bpd-gallery" : "bpd-admin"}`}
          >
            <button
              className="bpd-dialog-close"
              aria-label={gallery ? "Cerrar galería" : "Cerrar gestión"}
              onClick={() => {
                setGallery(false);
                setAdmin(false);
              }}
            >
              <X />
            </button>
            {gallery ? (
              <>
                <Photo
                  src={photos[index]}
                  alt={`${b.name}, foto ${index + 1} de ${photos.length}`}
                />
                <div className="bpd-gallery-nav">
                  <button
                    onClick={() => turn(-1)}
                    disabled={photos.length < 2}
                    aria-label="Foto anterior"
                  >
                    <ChevronLeft />
                  </button>
                  <span>
                    {index + 1} / {photos.length}
                  </span>
                  <button
                    onClick={() => turn(1)}
                    disabled={photos.length < 2}
                    aria-label="Foto siguiente"
                  >
                    <ChevronRight />
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2>
                  <LockKeyhole /> Gestión del negocio
                </h2>
                <p>
                  Acceso administrativo pendiente de una implementación segura.
                  Estas acciones no están disponibles desde esta ficha.
                </p>
                {[
                  "Editar datos del negocio",
                  "Marcar como recomendado",
                  "Marcar como TOP",
                  "Eliminar del directorio",
                ].map((t) => (
                  <button key={t} disabled>
                    {t}
                  </button>
                ))}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
