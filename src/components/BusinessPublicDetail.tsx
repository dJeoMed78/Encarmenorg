import { contactDigits } from '../utils/businessContacts';
import { resolveBusinessMedia } from '../utils/businessMediaPresentation';
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
import { BusinessComments } from "./BusinessComments";
import { getBusinessPublicUrl } from "../utils/businessUrl";
import { BusinessDescription } from "./BusinessDescription";
import "./BusinessPublicDetail.css";
import { verifyAdminSession, loginAdminUser } from "../utils/adminAuth";

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
  onAdminClick?: () => void;
  onEditBusiness?: (b: Business) => void;
  onDeleteBusiness?: (b: Business) => void;
  onToggleTop?: (b: Business) => Promise<boolean> | boolean | void;
  onToggleRecommended?: (b: Business) => Promise<boolean> | boolean | void;
}
function phone(value?: string) {
  const digits = contactDigits(value);
  return digits ? `52${digits}` : undefined;
}
// Google Maps URLs use registered coordinates or address text; no paid geocoding or identity verification.
export function businessMapPresentation(b: {
  mapsUrl?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  name?: unknown;
  address?: unknown;
  colonia?: unknown;
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
  // Coordinate-based embeds do not require an API key or a Places lookup.
  // They locate the registered point, not a business by its name.
  const coordinateEmbed =
    lat !== undefined && lon !== undefined
      ? `https://maps.google.com/maps?q=${encodeURIComponent(`${lat},${lon}`)}&z=16&output=embed`
      : undefined;
  // Text lookup is a search suggestion, not a verified business pin.
  // Do not send registered phone numbers to third-party map services.
  const clean = (v: unknown) =>
    typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, 180) : "";
  const address = clean(b.address);
  const name = clean(b.name);
  const colonia = clean(b.colonia);
  const searchText = address.length >= 6
    ? [name, address, colonia, "Ciudad del Carmen", "Campeche", "México"]
        .filter(Boolean).join(", ")
    : undefined;
  const searchLink = searchText
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchText)}`
    : undefined;
  const searchEmbed = searchText
    ? `https://maps.google.com/maps?q=${encodeURIComponent(searchText)}&output=embed`
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
  return { link: coordinateLink || link || searchLink, embed: coordinateEmbed || embed || searchEmbed };
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
  onAdminClick,
  onEditBusiness,
  onDeleteBusiness,
  onToggleTop,
  onToggleRecommended,
}: Props) {
  const media = resolveBusinessMedia(b, window.location.origin);
  // Only product/service images belong to the thumbnail gallery.
  const photos = media.gallery;
  const galleryKey = photos.join("|");
  const [index, setIndex] = useState(0),
    [heroBrandMode, setHeroBrandMode] = useState(true),
    [gallery, setGallery] = useState(false),
    [admin, setAdmin] = useState(false),
    [notice, setNotice] = useState("");
  const [adminAuthorized, setAdminAuthorized] = useState(false);
  const [adminChecking, setAdminChecking] = useState(false);
  const [adminLogin, setAdminLogin] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [draftRecommended, setDraftRecommended] = useState(Boolean(b.isRecommended));
  const [draftTop, setDraftTop] = useState(Boolean(b.isTopBusiness));
  const [applyingFlags, setApplyingFlags] = useState(false);
  const [flagNotice, setFlagNotice] = useState("");
  const flagsDirty = draftRecommended !== Boolean(b.isRecommended) || draftTop !== Boolean(b.isTopBusiness);
  const resetFlagDraft = () => {
    setDraftRecommended(Boolean(b.isRecommended));
    setDraftTop(Boolean(b.isTopBusiness));
    setFlagNotice("");
  };
  const root = useRef<HTMLDivElement>(null),
    galleryButton = useRef<HTMLButtonElement>(null),
    adminButton = useRef<HTMLButtonElement>(null);
  const [logoFailed, setLogoFailed] = useState(false),
    [coverFailed, setCoverFailed] = useState(false),
    [mapFailed, setMapFailed] = useState(false),
    [mapWide, setMapWide] = useState(false);
  const mapBox = useRef<HTMLDivElement>(null);
  const mapPresentation = businessMapPresentation(b),
    registeredLogo = media.logo,
    coverPhoto = media.cover,
    // The identity card is always the logo; the hero prioritizes the cover and only falls back to the logo.
    displayBrandImage = registeredLogo && !logoFailed ? registeredLogo : undefined,
    heroBrandImage = (coverPhoto && !coverFailed ? coverPhoto : undefined) || displayBrandImage;
  useEffect(() => {
    setLogoFailed(false);
    setCoverFailed(false);
    setHeroBrandMode(true);
    setIndex(0);
  }, [b.id, registeredLogo, coverPhoto, galleryKey]);
  useEffect(() => {
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
        ["frame-src", "child-src"].includes(event.effectiveDirective) &&
        event.blockedURI.startsWith("https://www.google.com")
      )
        setMapFailed(true);
    };
    document.addEventListener("securitypolicyviolation", blocked);
    return () =>
      document.removeEventListener("securitypolicyviolation", blocked);
  }, []);
  const openManagement = async () => {
    if (adminChecking) return;
    setAdminChecking(true);
    try {
      const allowed = await verifyAdminSession();
      setAdminAuthorized(allowed);
      if (allowed) { resetFlagDraft(); setAdminLogin(false); setAdmin(true); }
      else { resetFlagDraft(); setAdmin(true); setAdminLogin(true); setAdminError(""); }
    } finally {
      setAdminChecking(false);
    }
  };
  const submitInlineLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (adminChecking) return;
    setAdminChecking(true);
    setAdminError("");
    try {
      const result = await loginAdminUser(adminUsername.trim(), adminPassword);
      setAdminPassword("");
      if (!result.success || !(await verifyAdminSession())) {
        setAdminError(result.error || "No se pudo verificar la sesión administrativa.");
        return;
      }
      setAdminAuthorized(true);
      resetFlagDraft();
      setAdminLogin(false);
    } finally {
      setAdminChecking(false);
    }
  };
  const applyFlagChanges = async () => {
    if (!flagsDirty || applyingFlags) return;
    setApplyingFlags(true);
    setFlagNotice("");
    try {
      const allowed = await verifyAdminSession();
      setAdminAuthorized(allowed);
      if (!allowed) {
        setAdminLogin(true);
        setAdminError("La sesión expiró. Inicia sesión nuevamente.");
        return;
      }
      // Do not report success before the parent confirms the server write.
      if (draftRecommended !== Boolean(b.isRecommended)) {
        if (!onToggleRecommended || await onToggleRecommended(b) !== true) throw new Error("recommended update unconfirmed");
      }
      if (draftTop !== Boolean(b.isTopBusiness)) {
        if (!onToggleTop || await onToggleTop(b) !== true) throw new Error("top update unconfirmed");
      }
      setFlagNotice("Cambios guardados");
      window.setTimeout(() => { setAdmin(false); resetFlagDraft(); }, 2000);
    } catch {
      setFlagNotice("No fue posible aplicar los cambios. Inténtalo de nuevo.");
    } finally {
      setApplyingFlags(false);
    }
  };
  const runManagement = async (action?: (biz: Business) => void) => {
    if (!action) return;
    const allowed = await verifyAdminSession();
    setAdminAuthorized(allowed);
    if (!allowed) {
      setAdmin(true);
      setAdminLogin(true);
      setAdminError("La sesión expiró. Inicia sesión nuevamente.");
      return;
    }
    if (action === onDeleteBusiness && !window.confirm(`¿Eliminar definitivamente la empresa "${b.name}"? Esta acción no se puede deshacer.`)) return;
    setAdmin(false);
    action(b);
  };
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
  const turn = (n: number) => {
    if (!photos.length) return;
    if (heroBrandMode && heroBrandImage) {
      setIndex(n < 0 ? photos.length - 1 : 0);
    } else {
      setIndex((i) => (i + n + photos.length) % photos.length);
    }
    setHeroBrandMode(false);
  };
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
              {heroBrandMode ? (
                heroBrandImage ? (
                  <img
                    className={heroBrandImage === coverPhoto ? "bpd-hero-cover" : "bpd-hero-logo"}
                    src={heroBrandImage}
                    alt={heroBrandImage === coverPhoto ? "Fotografía de fachada de " + b.name : "Logotipo de " + b.name}
                    onError={() => {
                      if (heroBrandImage === coverPhoto && coverPhoto !== registeredLogo) setCoverFailed(true);
                      else setLogoFailed(true);
                    }}
                  />
                ) : (
                  <Photo alt={"Imagen principal de " + b.name} />
                )
              ) : (
                <Photo src={photos[index]} alt={`${b.name}, foto ${index + 1}`} />
              )}
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
                  onClick={() => {
                    setHeroBrandMode(false);
                    setGallery(true);
                  }}
                >
                  <Images size={15} /> Ver todas las fotos ({photos.length})
                </button>
              )}
            </div>
            {photos.length > 0 && (
              <div className="bpd-thumbnails">
                {photos.slice(0, 5).map((src, i) => (
                  <button
                    key={src}
                    aria-label={`Ver foto ${i + 1}${i === 4 && photos.length > 5 ? ` y ${photos.length - 5} más` : ""}`}
                    aria-pressed={!heroBrandMode && index === i}
                    onClick={() => {
                      setHeroBrandMode(false);
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
            <section className="bpd-card bpd-story-description">
              <h2>
                <FileText /> Descripción
              </h2>
              <p className="bpd-description">
                <BusinessDescription text={b.description} fallback="El negocio todavía no ha registrado una descripción." />
              </p>
            </section>
            {activePromotion && onOpenPromotion && (
              <section className="bpd-card bpd-story-promotion">
                <h2>Promoción del negocio</h2>
                <p>{activePromotion.title}</p>
                <button onClick={() => onOpenPromotion(activePromotion)}>
                  Ver promoción
                </button>
              </section>
            )}
          </main>
          <div className="bpd-card bpd-identity">
            {displayBrandImage ? (
              <img
                src={displayBrandImage}
                alt={"Logotipo de " + b.name}
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
          <section className="bpd-card bpd-reviews" id="bpd-ratings">
              <h2>
                <Star /> Opiniones de la comunidad
              </h2>
              <StarRatingWidget businessId={b.id} businessName={b.name} />
              <BusinessComments businessId={b.id} />
            </section>
        </div>
        <footer className="bpd-footer">
          <button ref={adminButton} type="button" className="bpd-pi-trigger" onClick={() => { void openManagement(); }} disabled={adminChecking} aria-label="Gestión del negocio" title="Gestión del negocio">
            π
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
            aria-label={gallery ? "Galería del negocio" : adminLogin ? "Acceso administrativo" : "Gestión del negocio"}
            className={`bpd-card ${gallery ? "bpd-gallery" : "bpd-admin"}`}
          >
            <button
              className="bpd-dialog-close"
              aria-label={gallery ? "Cerrar galería" : "Cerrar gestión"}
              onClick={() => {
                setGallery(false);
                setAdmin(false);
                setAdminLogin(false);
                setAdminPassword("");
                setAdminError("");
                resetFlagDraft();
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
            ) : adminLogin ? (
              <form className="bpd-admin-login" onSubmit={(event) => { void submitInlineLogin(event); }}>
                <h2><LockKeyhole size={20} /> Acceso administrativo</h2>
                <p>Ingresa tus credenciales para gestionar este negocio.</p>
                <label htmlFor="bpd-admin-user">Usuario</label>
                <input id="bpd-admin-user" autoComplete="username" value={adminUsername} onChange={(event) => setAdminUsername(event.target.value)} required disabled={adminChecking} />
                <label htmlFor="bpd-admin-password">Contraseña</label>
                <input id="bpd-admin-password" type="password" autoComplete="current-password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} required disabled={adminChecking} />
                {adminError && <p className="bpd-admin-error" role="alert">{adminError}</p>}
                <button className="bpd-admin-primary" type="submit" disabled={adminChecking}>{adminChecking ? "Verificando…" : "Entrar"}</button>
              </form>
            ) : (
              <div className="bpd-admin-actions">
                <h2>
                  <LockKeyhole size={20} /> Gestión del negocio
                </h2>
                <p>Sesión administrativa verificada. Solo se habilitan acciones disponibles para esta empresa.</p>
                <button className="bpd-admin-primary" type="button" disabled={!adminAuthorized || !onEditBusiness} onClick={() => { void runManagement(onEditBusiness); }}>Modificar registro</button>
                <label>
                  <input type="checkbox" checked={draftRecommended} disabled={!adminAuthorized || !onToggleRecommended || applyingFlags} onChange={(event) => { setDraftRecommended(event.target.checked); setFlagNotice(""); }} />
                  Recomendado
                </label>
                <label>
                  <input type="checkbox" checked={draftTop} disabled={!adminAuthorized || !onToggleTop || applyingFlags} onChange={(event) => { setDraftTop(event.target.checked); setFlagNotice(""); }} />
                  TOP
                </label>
                {flagsDirty && <button className="bpd-admin-primary" type="button" disabled={applyingFlags || !adminAuthorized} onClick={() => { void applyFlagChanges(); }}>{applyingFlags ? "Aplicando…" : "Aplicar cambios"}</button>}
                {flagNotice && flagNotice !== "Cambios guardados" && <p className="bpd-admin-feedback" role="alert">{flagNotice}</p>}
                {flagNotice === "Cambios guardados" && (
                  <div className="bpd-glass-save-overlay" role="status" aria-live="polite" aria-atomic="true">
                    <div className="bpd-glass-save-toast">
                      <span className="bpd-glass-save-icon" aria-hidden="true">✓</span>
                      <strong>Cambios guardados</strong>
                      <span>Tu configuración se actualizó correctamente.</span>
                    </div>
                  </div>
                )}
                <button className="bpd-admin-danger" type="button" disabled={!adminAuthorized || !onDeleteBusiness} onClick={() => { void runManagement(onDeleteBusiness); }}>Eliminar registro</button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

