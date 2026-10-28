import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  X,
  PencilLine,
  Building2,
  Phone,
  MapPin,
  Truck,
  CreditCard,
  Clock,
  Check,
  Upload,
  Trash2,
  Save,
  ChevronDown,
  Loader2,
  ImagePlus,
  Globe,
} from 'lucide-react';
import { Business, Category } from '../types';
import { uploadBusinessLogo } from '../services/api';
import {
  ALL_POSTAL_CODES,
  getPostalCodeForColonia,
  getColoniasForPostalCode,
} from '../data/carmen_postal_codes';
import ALL_COLONIAS_CARMEN from '../data/colonias_carmen.json';
import {
  STANDARDIZED_DELIVERY_OPTIONS,
  STANDARDIZED_PAYMENT_OPTIONS,
} from '../constants/businessOptions';

export { STANDARDIZED_DELIVERY_OPTIONS, STANDARDIZED_PAYMENT_OPTIONS };

interface EditBusinessModalProps {
  business: Business | null;
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  categories?: Category[];
  coloniasList?: { name: string; count: number }[];
  onSave: (
    id: number,
    updatedData: Partial<Business>,
  ) => Promise<{ success: boolean; message: string }>;
}
type EditorBusiness = Business & { city?: string };
type Fields = {
  name: string;
  category: string;
  description: string;
  phone: string;
  whatsapp: string;
  address: string;
  colonia: string;
  city: string;
  postalCode: string;
  schedule: string;
  payment: string;
  delivery: string;
  facebook: string;
  instagram: string;
  website: string;
  image: string;
  gallery: string[];
  slug: string;
  isTopBusiness: boolean;
  isRecommended: boolean;
};
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const text = (value: unknown) =>
  typeof value === 'string' ? value : value == null ? '' : String(value);
const list = (value: unknown): string[] => {
  if (Array.isArray(value))
    return value.filter((v): v is string => typeof v === 'string');
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return list(parsed);
    } catch {
      /* Legacy text is not an array. */
    }
  }
  return [];
};
const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
function splitOptions(value: string, options: string[]) {
  const selected: string[] = [],
    extra: string[] = [];
  for (const part of value
    .split(/[,;]/)
    .map((v) => v.trim())
    .filter(Boolean)) {
    const match = options.find((opt) => fold(opt) === fold(part));
    if (match) {
      if (!selected.includes(match)) selected.push(match);
    } else extra.push(part);
  }
  return { selected, extra };
}
function contactNumber(value: string) {
  let raw = value.trim();
  try {
    if (/^https?:/i.test(raw)) {
      const url = new URL(raw);
      if (url.hostname === 'wa.me') raw = url.pathname.replace(/^\//, '');
      else if (
        ['api.whatsapp.com', 'wa.me', 'web.whatsapp.com'].includes(url.hostname)
      )
        raw = url.searchParams.get('phone') || '';
      else return '';
    }
  } catch {
    return '';
  }
  raw = raw.replace(/^tel:/i, '');
  if (!/^[\d\s()+-]+$/.test(raw)) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('521'))
    digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith('52'))
    digits = digits.slice(2);
  return digits.length === 10 ? digits : '';
}
function parseWeek(value: string) {
  const empty = { days: DAYS.map(() => false), open: '', close: '' };
  const match = value
    .trim()
    .match(/^(.+?)\s+(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/);
  if (
    !match ||
    ![match[2], match[3]].every((t) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t))
  )
    return empty;
  const prefix = fold(match[1]);
  let days: boolean[];
  if (/^lunes a viernes$/.test(prefix))
    days = [true, true, true, true, true, false, false];
  else if (/^lunes a sabado$/.test(prefix))
    days = [true, true, true, true, true, true, false];
  else {
    const tokens = prefix.split(',').map((s) => s.trim());
    if (!tokens.every((s) => DAYS.some((d) => fold(d) === s))) return empty;
    days = DAYS.map((d) => tokens.includes(fold(d)));
  }
  return { days, open: match[2], close: match[3] };
}
function initialFields(b: EditorBusiness): Fields {
  return {
    name: text(b.name),
    category: text(b.category) || list(b.categories)[0] || '',
    description: text(b.description),
    phone: text(b.phone),
    whatsapp: text(b.whatsapp),
    address: text(b.address),
    colonia: text(b.colonia),
    city: text(b.city),
    postalCode: text(b.postalCode),
    schedule: text(b.schedule) || text(b.openingHours),
    payment: text(b.payment) || list(b.paymentMethods).join(', '),
    delivery: text(b.delivery) || text(b.deliveryOption),
    facebook: text(b.facebook),
    instagram: text(b.instagram),
    website: text(b.website),
    image: text(b.image) || text(b.imageUrl),
    gallery: list(b.gallery),
    slug: text(b.slug),
    isTopBusiness: Boolean(b.isTopBusiness),
    isRecommended: Boolean(b.isRecommended),
  };
}
function Card({
  title,
  subtitle,
  color,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  color: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="enc-glass-card" aria-label={title}>
      <div className="enc-glass-card-heading">
        <span className={`enc-glass-icon enc-glass-${color}`}>
          <Icon size={17} aria-hidden="true" />
        </span>
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  const fieldId = useId();
  const direct =
    React.isValidElement(children) &&
    typeof children.type === 'string' &&
    ['input', 'select', 'textarea'].includes(children.type);
  const controlId = direct ? (children.props as any).id || fieldId : undefined;
  const control = direct
    ? React.cloneElement(children as React.ReactElement<any>, {
        id: controlId,
        'aria-label': (children.props as any)['aria-label'] || label,
      })
    : children;
  return (
    <label className="enc-glass-field" htmlFor={controlId}>
      <span>{label}</span>
      {control}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export const EditBusinessModal: React.FC<EditBusinessModalProps> = ({
  business,
  isOpen,
  onClose,
  isAdmin = false,
  categories = [],
  coloniasList = [],
  onSave,
}) => {
  const uid = useId();
  const panel = useRef<HTMLDivElement>(null);
  const original = useRef<EditorBusiness | null>(null);
  const dirty = useRef(new Set<keyof Fields>());
  const session = useRef(0);
  const saveBusy = useRef(false),
    uploadBusy = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const activeKey = isOpen && business ? String(business.id) : null;
  const currentKey = useRef(activeKey);
  currentKey.current = activeKey;
  const [fields, setFields] = useState<Fields | null>(null);
  const [formKey, setFormKey] = useState<string | null>(null);
  const [week, setWeek] = useState(() => parseWeek(''));
  const [weekEdited, setWeekEdited] = useState(false);
  const [saving, setSaving] = useState(false),
    [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    session.current++;
    if (!isOpen || !business) {
      original.current = null;
      setFields(null);
      setFormKey(null);
      return;
    }
    original.current = business as EditorBusiness;
    const next = initialFields(business as EditorBusiness);
    setFields(next);
    setFormKey(String(business.id));
    setWeek(parseWeek(next.schedule));
    setWeekEdited(false);
    dirty.current = new Set();
    saveBusy.current = false;
    uploadBusy.current = false;
    setSaving(false);
    setUploading(false);
    setError(null);
    return () => {
      session.current++;
    };
    // Object refreshes must not overwrite an open draft for the same record.
  }, [isOpen, business?.id]);

  useEffect(() => {
    if (!activeKey) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(
      () =>
        panel.current
          ?.querySelector<HTMLButtonElement>('[data-editor-close]')
          ?.focus(),
      0,
    );
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (!saveBusy.current && !uploadBusy.current) onCloseRef.current();
      }
      if (event.key === 'Tab' && panel.current) {
        const controls = [
          ...panel.current.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, a[href]',
          ),
        ].filter((el) => el.getClientRects().length > 0);
        const first = controls[0],
          last = controls[controls.length - 1];
        if (!first) {
          event.preventDefault();
          panel.current.focus();
        } else if (
          event.shiftKey &&
          (document.activeElement === first ||
            !panel.current.contains(document.activeElement))
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            !panel.current.contains(document.activeElement))
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', keyboard, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', keyboard, true);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [activeKey]);

  const categoryNames = useMemo(() => {
    const names = new Set<string>();
    for (const category of Array.isArray(categories) ? categories : []) {
      if (typeof category?.name === 'string') names.add(category.name);
      for (const sub of Array.isArray(category?.subcategories)
        ? category.subcategories
        : [])
        if (typeof sub?.name === 'string') names.add(sub.name);
    }
    return [...names].sort((a, b) => a.localeCompare(b, 'es'));
  }, [categories]);
  const colonyNames = useMemo(() => {
    const byCp = fields?.postalCode
      ? getColoniasForPostalCode(fields.postalCode)
      : [];
    const names = byCp.length
      ? byCp
      : Array.isArray(coloniasList) && coloniasList.length
        ? coloniasList
            .map((c) => (typeof c === 'string' ? c : text(c?.name)))
            .filter(Boolean)
        : ALL_COLONIAS_CARMEN;
    return [
      ...new Set([...(fields?.colonia ? [fields.colonia] : []), ...names]),
    ];
  }, [fields?.postalCode, fields?.colonia, coloniasList]);

  if (!isOpen || !business || !fields || formKey !== activeKey) return null;
  const busy = saving || uploading;
  const delivery = splitOptions(fields.delivery, STANDARDIZED_DELIVERY_OPTIONS);
  const payment = splitOptions(fields.payment, STANDARDIZED_PAYMENT_OPTIONS);
  const update = <K extends keyof Fields>(key: K, value: Fields[K]) => {
    dirty.current.add(key);
    setFields((prev) => (prev ? { ...prev, [key]: value } : prev));
    setError(null);
  };
  const toggleOption = (key: 'delivery' | 'payment', option: string) => {
    const options =
      key === 'delivery'
        ? STANDARDIZED_DELIVERY_OPTIONS
        : STANDARDIZED_PAYMENT_OPTIONS;
    const parsed = splitOptions(fields[key], options);
    const selected = parsed.selected.includes(option)
      ? parsed.selected.filter((v) => v !== option)
      : [...parsed.selected, option];
    update(key, [...selected, ...parsed.extra].join(', '));
  };
  const validSession = (version: number) =>
    session.current === version && currentKey.current === activeKey;
  const readImage = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        typeof reader.result === 'string'
          ? resolve(reader.result)
          : reject(new Error('No fue posible leer la imagen.'));
      reader.onerror = () =>
        reject(new Error('No fue posible leer la imagen.'));
      reader.onabort = () => reject(new Error('Lectura de imagen cancelada.'));
      reader.readAsDataURL(file);
    });
  const upload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    gallery: boolean,
  ) => {
    const input = event.currentTarget,
      files = Array.from(input.files || []);
    if (!files.length || uploadBusy.current || saveBusy.current) return;
    const available = gallery ? 10 - fields.gallery.length : 1;
    if (files.length > available) {
      setError(
        `Puedes agregar ${Math.max(available, 0)} foto(s) más; la galería admite 10.`,
      );
      input.value = '';
      return;
    }
    if (
      files.some(
        (f) =>
          !/^image\/(jpeg|png|webp|gif)$/.test(f.type) ||
          f.size > 5 * 1024 * 1024,
      )
    ) {
      setError('Elige imágenes JPG, PNG, WebP o GIF de hasta 5 MB cada una.');
      input.value = '';
      return;
    }
    const version = session.current;
    uploadBusy.current = true;
    setUploading(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const data = await readImage(file);
        if (!validSession(version)) return;
        const response = await uploadBusinessLogo(data, file.name);
        if (!validSession(version)) return;
        // The shared API helper returns a data URI on failure; it is not a persisted upload.
        if (
          response?.success !== true ||
          !response.url ||
          !/^(?:https?:\/\/|\/(?!\/))/.test(response.url)
        )
          throw new Error(
            'No se confirmó la carga de la imagen en el servidor. Intenta de nuevo.',
          );
        urls.push(response.url);
      }
      if (validSession(version)) {
        if (gallery) update('gallery', [...fields.gallery, ...urls]);
        else update('image', urls[0]);
      }
    } catch (failure) {
      if (validSession(version))
        setError(
          failure instanceof Error
            ? failure.message
            : 'No fue posible cargar las imágenes.',
        );
    } finally {
      input.value = '';
      if (validSession(version)) {
        uploadBusy.current = false;
        setUploading(false);
      }
    }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saveBusy.current || uploadBusy.current) return;
    const base = original.current;
    if (!base) return;
    if (!fields.name.trim()) {
      setError('El nombre del negocio es obligatorio.');
      return;
    }
    const phone = contactNumber(fields.phone),
      whatsapp = contactNumber(fields.whatsapp);
    if (!phone && !whatsapp) {
      setError('Ingresa al menos un teléfono o WhatsApp válido de 10 dígitos.');
      return;
    }
    for (const [key, clean] of [
      ['phone', phone],
      ['whatsapp', whatsapp],
    ] as const) {
      if (dirty.current.has(key) && fields[key].trim() && !clean) {
        setError(
          `${key === 'phone' ? 'El teléfono' : 'WhatsApp'} debe contener 10 dígitos; también se acepta el prefijo +52.`,
        );
        return;
      }
    }
    if (dirty.current.has('description') && fields.description.length > 500) {
      setError('La descripción admite hasta 500 caracteres.');
      return;
    }
    if (
      weekEdited &&
      (!week.days.some(Boolean) ||
        !week.open ||
        !week.close ||
        week.open === week.close)
    ) {
      setError(
        'Selecciona al menos un día y horas de apertura/cierre distintas, o conserva el horario original.',
      );
      return;
    }
    const payload: Partial<EditorBusiness> = {};
    for (const key of dirty.current) {
      if (['slug', 'isTopBusiness', 'isRecommended'].includes(key) && !isAdmin)
        continue;
      Object.assign(payload, { [key]: fields[key] });
    }
    if (dirty.current.has('name')) payload.name = fields.name.trim();
    if (dirty.current.has('phone'))
      payload.phone = fields.phone.trim() ? phone : '';
    if (dirty.current.has('whatsapp'))
      payload.whatsapp = fields.whatsapp.trim() ? whatsapp : '';
    if (dirty.current.has('category'))
      payload.categories = [
        fields.category,
        ...list(base.categories).filter(
          (c) =>
            c !== text(base.category || list(base.categories)[0]) &&
            c !== fields.category,
        ),
      ].filter(Boolean);
    if (dirty.current.has('payment') && base.paymentMethods !== undefined)
      payload.paymentMethods = [
        ...splitOptions(fields.payment, STANDARDIZED_PAYMENT_OPTIONS).selected,
        ...splitOptions(fields.payment, STANDARDIZED_PAYMENT_OPTIONS).extra,
      ];
    if (dirty.current.has('delivery')) {
      if (base.deliveryOption !== undefined)
        payload.deliveryOption = fields.delivery;
      payload.hasDelivery = /domicilio|cliente|env[ií]o|paqueter/i.test(
        fields.delivery,
      );
    }
    if (weekEdited)
      payload.schedule =
        DAYS.filter((_, i) => week.days[i]).join(', ') +
        ` ${week.open} - ${week.close}`;
    if (
      (weekEdited || dirty.current.has('schedule')) &&
      base.openingHours !== undefined
    )
      payload.openingHours = payload.schedule;
    if (dirty.current.has('image') && base.imageUrl !== undefined)
      payload.imageUrl = fields.image;
    if (isAdmin && dirty.current.has('slug')) {
      const slug = fields.slug
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9-_]/g, '');
      if (!slug) {
        setError('El enlace personalizado no puede quedar vacío.');
        return;
      }
      payload.slug = slug;
    }
    const version = session.current;
    saveBusy.current = true;
    setSaving(true);
    setError(null);
    try {
      const response = await onSave(base.id, payload);
      if (!validSession(version)) return;
      if (response?.success === true) onCloseRef.current();
      else
        setError(
          response?.message ||
            'El servidor no confirmó los cambios. Conservamos tu edición para reintentar.',
        );
    } catch (failure) {
      if (validSession(version))
        setError(
          failure instanceof Error
            ? failure.message
            : 'Error de conexión. No se confirmó el guardado.',
        );
    } finally {
      if (validSession(version)) {
        saveBusy.current = false;
        setSaving(false);
      }
    }
  };
  const chips = (key: 'delivery' | 'payment', options: string[]) =>
    options.map((option) => {
      const selected = (
        key === 'delivery' ? delivery : payment
      ).selected.includes(option);
      return (
        <button
          key={option}
          type="button"
          className="enc-glass-chip"
          aria-pressed={selected}
          onClick={() => toggleOption(key, option)}
        >
          <span className="enc-glass-chip-check" aria-hidden="true">
            {selected && <Check size={12} />}
          </span>
          <span>{option}</span>
        </button>
      );
    });

  return (
    <div className="enc-glass-overlay">
      <style>{GLASS_STYLES}</style>
      <div
        className="enc-glass-ambient enc-glass-ambient-blue"
        aria-hidden="true"
      />
      <div
        className="enc-glass-ambient enc-glass-ambient-pink"
        aria-hidden="true"
      />
      <div
        className="enc-glass-dialog"
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-subtitle`}
        tabIndex={-1}
      >
        <header className="enc-glass-header">
          <span className="enc-glass-pencil">
            <PencilLine size={22} aria-hidden="true" />
          </span>
          <div>
            <h2 id={`${uid}-title`}>Editar Negocio</h2>
            <p id={`${uid}-subtitle`}>
              Actualiza la información de tu negocio en el directorio
            </p>
          </div>
          <button
            type="button"
            data-editor-close
            className="enc-glass-close"
            aria-label="Cerrar editor"
            onClick={onClose}
            disabled={busy}
          >
            <X size={19} />
          </button>
        </header>
        <form
          className="enc-glass-form"
          onSubmit={submit}
          noValidate
          aria-busy={busy}
        >
          <div className="enc-glass-scroll">
            <fieldset disabled={busy} className="enc-glass-fields">
              <Card
                title="Información Básica"
                subtitle="La esencia de tu negocio"
                color="amber"
                icon={Building2}
              >
                <div className="enc-glass-two">
                  <Field label="Nombre del negocio *">
                    <input
                      autoComplete="organization"
                      value={fields.name}
                      onChange={(e) => update('name', e.target.value)}
                    />
                  </Field>
                  <Field label="Categoría">
                    <select
                      value={
                        categoryNames.includes(fields.category)
                          ? fields.category
                          : '__custom__'
                      }
                      onChange={(e) =>
                        update(
                          'category',
                          e.target.value === '__custom__' ? '' : e.target.value,
                        )
                      }
                    >
                      <option value="__custom__">
                        Otra categoría / personalizada
                      </option>
                      {categoryNames.map((name) => (
                        <option key={name}>{name}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                {!categoryNames.includes(fields.category) && (
                  <Field label="Categoría personalizada">
                    <input
                      value={fields.category}
                      onChange={(e) => update('category', e.target.value)}
                    />
                  </Field>
                )}
                <Field label="Descripción del negocio">
                  <textarea
                    rows={2}
                    maxLength={500}
                    value={fields.description}
                    aria-describedby={`${uid}-count`}
                    onChange={(e) => update('description', e.target.value)}
                  />
                </Field>
                <p id={`${uid}-count`} className="enc-glass-count">
                  {fields.description.length}/500
                  {fields.description.length > 500
                    ? ' · Texto heredado conservado; reduce su extensión si lo editas.'
                    : ''}
                </p>
              </Card>
              <Card
                title="Contacto"
                subtitle="Al menos un medio de contacto válido"
                color="blue"
                icon={Phone}
              >
                <div className="enc-glass-two">
                  <Field label="Teléfono (10 dígitos)">
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={fields.phone}
                      onChange={(e) => update('phone', e.target.value)}
                    />
                  </Field>
                  <Field label="WhatsApp (10 dígitos)">
                    <input
                      type="tel"
                      inputMode="tel"
                      value={fields.whatsapp}
                      onChange={(e) => update('whatsapp', e.target.value)}
                    />
                  </Field>
                </div>
              </Card>
              <Card
                title="Ubicación"
                subtitle="Dónde pueden encontrarte"
                color="pink"
                icon={MapPin}
              >
                <div className="enc-glass-two">
                  <Field label="Colonia o fraccionamiento">
                    <select
                      value={fields.colonia}
                      onChange={(e) => {
                        update('colonia', e.target.value);
                        const cp = getPostalCodeForColonia(e.target.value);
                        if (cp) update('postalCode', cp);
                      }}
                    >
                      <option value="">Selecciona una colonia</option>
                      {colonyNames.map((name) => (
                        <option key={name}>{name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Ciudad">
                    <input
                      value={fields.city}
                      placeholder="Indica la ciudad"
                      autoComplete="address-level2"
                      onChange={(e) => update('city', e.target.value)}
                    />
                  </Field>
                </div>
                <div className="enc-glass-address">
                  <Field label="Dirección">
                    <input
                      value={fields.address}
                      autoComplete="street-address"
                      onChange={(e) => update('address', e.target.value)}
                    />
                  </Field>
                  <Field label="Código postal">
                    <select
                      value={fields.postalCode}
                      onChange={(e) => update('postalCode', e.target.value)}
                    >
                      <option value="">Sin especificar</option>
                      {[
                        ...new Set([
                          ...(fields.postalCode ? [fields.postalCode] : []),
                          ...ALL_POSTAL_CODES,
                        ]),
                      ].map((cp) => (
                        <option key={cp}>{cp}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </Card>
              <Card
                title="Modalidad de Atención y Entrega"
                subtitle="Puedes seleccionar más de una opción"
                color="violet"
                icon={Truck}
              >
                <div className="enc-glass-chips enc-glass-delivery">
                  {chips('delivery', STANDARDIZED_DELIVERY_OPTIONS)}
                </div>
                {delivery.extra.length > 0 && (
                  <p className="enc-glass-note">
                    Se conserva también: {delivery.extra.join(', ')}.
                  </p>
                )}
              </Card>
              <Card
                title="Métodos de Pago"
                subtitle="Formas de pago que aceptas"
                color="green"
                icon={CreditCard}
              >
                <div className="enc-glass-chips enc-glass-payments">
                  {chips('payment', STANDARDIZED_PAYMENT_OPTIONS.slice(0, 4))}
                </div>
                {(payment.extra.length > 0 ||
                  payment.selected.includes(
                    STANDARDIZED_PAYMENT_OPTIONS[4],
                  )) && (
                  <p className="enc-glass-note">
                    Métodos adicionales conservados en Más opciones.
                  </p>
                )}
              </Card>
              <Card
                title="Horarios de Atención"
                subtitle="Un horario común para los días seleccionados"
                color="violet"
                icon={Clock}
              >
                <div className="enc-glass-days">
                  {DAYS.map((day, i) => (
                    <button
                      key={day}
                      type="button"
                      aria-label={`Atención ${day}`}
                      aria-pressed={week.days[i]}
                      onClick={() => {
                        setWeek((prev) => ({
                          ...prev,
                          days: prev.days.map((v, j) => (j === i ? !v : v)),
                        }));
                        setWeekEdited(true);
                        setError(null);
                      }}
                    >
                      <span className="enc-glass-switch" aria-hidden="true">
                        <span />
                      </span>
                      {day}
                    </button>
                  ))}
                </div>
                <div className="enc-glass-two enc-glass-hours">
                  <Field label="Apertura">
                    <input
                      type="time"
                      value={week.open}
                      onChange={(e) => {
                        setWeek((prev) => ({ ...prev, open: e.target.value }));
                        setWeekEdited(true);
                        setError(null);
                      }}
                    />
                  </Field>
                  <Field label="Cierre">
                    <input
                      type="time"
                      value={week.close}
                      onChange={(e) => {
                        setWeek((prev) => ({ ...prev, close: e.target.value }));
                        setWeekEdited(true);
                        setError(null);
                      }}
                    />
                  </Field>
                </div>
                <p className="enc-glass-note">
                  {weekEdited
                    ? week.close && week.open && week.close < week.open
                      ? 'El cierre corresponde al día siguiente.'
                      : 'Se guardarán los días y las horas seleccionados.'
                    : fields.schedule
                      ? `Horario actual: ${fields.schedule}. Se conserva mientras no edites los controles.`
                      : 'Sin horario registrado. No se asignan horas automáticamente.'}
                </p>
                {weekEdited && (
                  <button
                    className="enc-glass-text-button"
                    type="button"
                    onClick={() => {
                      setWeek(parseWeek(fields.schedule));
                      setWeekEdited(false);
                      setError(null);
                    }}
                  >
                    Conservar horario original
                  </button>
                )}
              </Card>
              <details className="enc-glass-advanced">
                <summary>
                  <span>
                    <Globe size={16} aria-hidden="true" />
                    Más opciones <small>Fotos, enlaces y ajustes</small>
                  </span>
                  <ChevronDown size={17} aria-hidden="true" />
                </summary>
                <div className="enc-glass-advanced-content">
                  <div className="enc-glass-two">
                    <Field label="Facebook">
                      <input
                        value={fields.facebook}
                        onChange={(e) => update('facebook', e.target.value)}
                      />
                    </Field>
                    <Field label="Instagram">
                      <input
                        value={fields.instagram}
                        onChange={(e) => update('instagram', e.target.value)}
                      />
                    </Field>
                  </div>
                  <Field label="Sitio web o catálogo">
                    <input
                      value={fields.website}
                      onChange={(e) => update('website', e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Horario en texto libre"
                    hint="Permite conservar horarios especiales o distintos por día."
                  >
                    <textarea
                      rows={2}
                      value={fields.schedule}
                      onChange={(e) => {
                        update('schedule', e.target.value);
                        setWeek(parseWeek(e.target.value));
                        setWeekEdited(false);
                      }}
                    />
                  </Field>
                  <Field label="Modalidades en texto libre">
                    <input
                      value={fields.delivery}
                      onChange={(e) => update('delivery', e.target.value)}
                    />
                  </Field>
                  <Field label="Métodos de pago en texto libre">
                    <input
                      value={fields.payment}
                      onChange={(e) => update('payment', e.target.value)}
                    />
                  </Field>
                  <div className="enc-glass-chips">
                    {chips('payment', STANDARDIZED_PAYMENT_OPTIONS.slice(4))}
                  </div>
                  <div className="enc-glass-media-heading">
                    <ImagePlus size={17} />
                    <h3>Fotografía y galería</h3>
                    <span>{fields.gallery.length}/10 fotos</span>
                  </div>
                  <div className="enc-glass-logo-row">
                    {fields.image ? (
                      <img
                        className="enc-glass-logo"
                        src={fields.image}
                        alt="Fotografía o logotipo actual"
                      />
                    ) : (
                      <span className="enc-glass-logo enc-glass-empty">
                        <Building2 size={25} />
                      </span>
                    )}
                    <div className="enc-glass-media-actions">
                      <label className="enc-glass-upload">
                        <Upload size={14} />
                        {fields.image ? 'Cambiar foto' : 'Agregar foto'}
                        <input
                          aria-label="Subir fotografía o logotipo"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={(e) => {
                            void upload(e, false);
                          }}
                        />
                      </label>
                      {fields.image && (
                        <button
                          type="button"
                          className="enc-glass-secondary enc-glass-remove"
                          onClick={() => update('image', '')}
                        >
                          <Trash2 size={14} />
                          Quitar foto
                        </button>
                      )}
                    </div>
                  </div>
                  <Field label="URL de fotografía o logotipo">
                    <input
                      value={fields.image}
                      onChange={(e) => update('image', e.target.value)}
                    />
                  </Field>
                  <p className="enc-glass-note">
                    JPG, PNG, WebP o GIF · hasta 5 MB por imagen.
                  </p>
                  <div className="enc-glass-gallery">
                    {fields.gallery.map((url, i) => (
                      <div key={`${i}-${url}`}>
                        <img src={url} alt={`Foto de galería ${i + 1}`} />
                        <button
                          type="button"
                          aria-label={`Quitar foto de galería ${i + 1}`}
                          onClick={() =>
                            update(
                              'gallery',
                              fields.gallery.filter((_, j) => j !== i),
                            )
                          }
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  {fields.gallery.length < 10 && (
                    <label className="enc-glass-upload">
                      <Upload size={14} />
                      Agregar fotos a la galería
                      <input
                        aria-label="Subir fotos de galería"
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={(e) => {
                          void upload(e, true);
                        }}
                      />
                    </label>
                  )}
                  {isAdmin && (
                    <div className="enc-glass-admin">
                      <h3>Administración</h3>
                      <Field
                        label="Enlace personalizado"
                        hint="El servidor comprueba los permisos y la disponibilidad del enlace."
                      >
                        <span className="enc-glass-slug">
                          <span>encarmen.org/</span>
                          <input
                            aria-label="Enlace personalizado"
                            value={fields.slug}
                            onChange={(e) => update('slug', e.target.value)}
                          />
                        </span>
                      </Field>
                      {list(business.previousSlugs).length > 0 && (
                        <p className="enc-glass-note">
                          Enlaces anteriores:{' '}
                          {list(business.previousSlugs).join(', ')}
                        </p>
                      )}
                      <label className="enc-glass-check">
                        <input
                          type="checkbox"
                          checked={fields.isTopBusiness}
                          onChange={(e) =>
                            update('isTopBusiness', e.target.checked)
                          }
                        />
                        Empresa TOP
                      </label>
                      <label className="enc-glass-check">
                        <input
                          type="checkbox"
                          checked={fields.isRecommended}
                          onChange={(e) =>
                            update('isRecommended', e.target.checked)
                          }
                        />
                        Empresa recomendada
                      </label>
                    </div>
                  )}
                </div>
              </details>
            </fieldset>
          </div>
          {error && (
            <div role="alert" className="enc-glass-error">
              {error}
            </div>
          )}
          <footer className="enc-glass-footer">
            <span className="enc-glass-save-status" role="status">
              {uploading
                ? 'Cargando imágenes…'
                : saving
                  ? 'Esperando confirmación…'
                  : 'Los cambios se guardan al confirmar.'}
            </span>
            <div>
              <button
                type="button"
                className="enc-glass-secondary"
                onClick={onClose}
                disabled={busy}
              >
                Cancelar
              </button>
              <button type="submit" className="enc-glass-save" disabled={busy}>
                {busy ? (
                  <Loader2 size={16} className="enc-glass-spinner" />
                ) : (
                  <Save size={16} />
                )}
                {saving ? 'Guardando…' : 'Guardar Cambios'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
};

const GLASS_STYLES = `
.enc-glass-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background: rgba(29, 49, 77, 0.26);
  backdrop-filter: blur(14px) saturate(125%);
  -webkit-backdrop-filter: blur(14px) saturate(125%);
  color: #1c2c44;
  font-family:
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  isolation: isolate;
}
.enc-glass-overlay * {
  box-sizing: border-box;
}
.enc-glass-ambient {
  position: absolute;
  z-index: -1;
  width: min(65vw, 780px);
  height: 65vh;
  border-radius: 50%;
  filter: blur(65px);
  pointer-events: none;
}
.enc-glass-ambient-blue {
  left: 5%;
  top: 1%;
  background: radial-gradient(
    ellipse,
    rgba(65, 151, 244, 0.58),
    rgba(141, 199, 255, 0.16) 65%,
    transparent 75%
  );
}
.enc-glass-ambient-pink {
  right: 3%;
  bottom: 0;
  background: radial-gradient(
    ellipse,
    rgba(246, 157, 193, 0.56),
    rgba(246, 189, 220, 0.12) 65%,
    transparent 75%
  );
}
.enc-glass-dialog {
  width: 100%;
  max-width: 646px;
  max-height: calc(100dvh - 36px);
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 27px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  background: linear-gradient(
    128deg,
    rgba(231, 243, 255, 0.74),
    rgba(255, 255, 255, 0.56) 48%,
    rgba(249, 230, 242, 0.68)
  );
  backdrop-filter: blur(36px) saturate(160%);
  -webkit-backdrop-filter: blur(36px) saturate(160%);
  box-shadow:
    0 26px 85px rgba(27, 48, 78, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
}
.enc-glass-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 21px;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.15);
}
.enc-glass-pencil {
  height: 44px;
  width: 44px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.76),
    rgba(255, 255, 255, 0.25)
  );
  border: 1px solid #ffffffba;
  border-radius: 15px;
  color: #2865ce;
  box-shadow:
    0 4px 14px #406fb517,
    inset 0 1px 0 white;
}
.enc-glass-header h2 {
  font-size: 20px;
  font-weight: 750;
  letter-spacing: -0.55px;
  margin: 0 0 3px;
  color: #14223a;
}
.enc-glass-header p {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: #45556d;
}
.enc-glass-close {
  margin-left: auto;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: #ffffff70;
  border: 1px solid #ffffff90;
  color: #43516a;
}
.enc-glass-form {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.enc-glass-scroll {
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 13px;
  scrollbar-width: thin;
  scrollbar-color: #9fb6d080 transparent;
}
.enc-glass-fields {
  padding: 0;
  margin: 0;
  border: 0;
  min-width: 0;
  display: grid;
  gap: 9px;
}
.enc-glass-card {
  padding: 12px 14px;
  border-radius: 19px;
  border: 1px solid #ffffffc4;
  background: linear-gradient(130deg, #ffffff52, #f5faff70);
  box-shadow:
    inset 0 1px 0 #ffffffa8,
    0 3px 12px #35557706;
  min-width: 0;
}
.enc-glass-card-heading {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 9px;
}
.enc-glass-card-heading h3,
.enc-glass-admin h3,
.enc-glass-media-heading h3 {
  font-size: 13px;
  line-height: 1.3;
  font-weight: 750;
  margin: 0;
}
.enc-glass-card-heading p {
  font-size: 10px;
  line-height: 1.4;
  color: #52617a;
  margin: 2px 0 0;
}
.enc-glass-icon {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: white;
  box-shadow: 0 4px 10px #344d7114;
  flex-shrink: 0;
}
.enc-glass-amber {
  background: linear-gradient(135deg, #ffc752, #e99a13);
}
.enc-glass-blue {
  background: linear-gradient(135deg, #56a0ff, #3071da);
}
.enc-glass-pink {
  background: linear-gradient(135deg, #f58aab, #dc5b86);
}
.enc-glass-violet {
  background: linear-gradient(135deg, #b58cf0, #885ac7);
}
.enc-glass-green {
  background: linear-gradient(135deg, #52c9a0, #239875);
}
.enc-glass-two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  min-width: 0;
}
.enc-glass-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
  margin: 0;
  font-size: 11px;
  color: #33425b;
}
.enc-glass-field > span:first-child {
  font-weight: 650;
}
.enc-glass-card > .enc-glass-field {
  margin-top: 8px;
}
.enc-glass-overlay input:not([type="checkbox"]):not([type="file"]),
.enc-glass-overlay select,
.enc-glass-overlay textarea {
  width: 100%;
  min-width: 0;
  height: 36px;
  font: inherit;
  font-size: 12px;
  font-weight: 450;
  color: #22334c;
  background: #ffffffed;
  border: 1px solid #d7e2f0;
  border-radius: 10px;
  padding: 8px 10px;
  box-shadow: 0 1px 2px #36516c03;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.enc-glass-overlay textarea {
  height: auto;
  min-height: 56px;
  line-height: 1.5;
  resize: vertical;
}
.enc-glass-overlay input::placeholder {
  color: #7a8799;
}
.enc-glass-overlay
  :is(button, input, select, textarea, summary, a):focus-visible {
  outline: 3px solid #2774dd;
  outline-offset: 3px;
}
.enc-glass-field small,
.enc-glass-note {
  font-size: 10px;
  line-height: 1.5;
  color: #52617a;
  margin: 6px 0 0;
  overflow-wrap: anywhere;
}
.enc-glass-count {
  font-size: 10px;
  color: #5f6c80;
  text-align: right;
  margin: 5px 0 0;
}
.enc-glass-address {
  display: grid;
  grid-template-columns: 1fr 128px;
  gap: 10px;
  margin-top: 9px;
}
.enc-glass-chips {
  display: grid;
  gap: 6px;
}
.enc-glass-delivery {
  grid-template-columns: 1fr 1fr;
}
.enc-glass-payments {
  grid-template-columns: repeat(4, 1fr);
}
.enc-glass-chip {
  min-height: 37px;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 10px;
  line-height: 1.35;
  font-weight: 600;
  padding: 7px 9px;
  color: #405069;
  background: #ffffffb3;
  border: 1px solid #d4dfec;
  border-radius: 10px;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
}
.enc-glass-chip[aria-pressed="true"] {
  background: #e3efffdb;
  border-color: #78aafa;
  color: #1c57b4;
  box-shadow: inset 0 1px 0 #ffffffae;
}
.enc-glass-chip-check {
  height: 15px;
  width: 15px;
  border-radius: 5px;
  border: 1px solid #bccbdc;
  background: #ffffffb3;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.enc-glass-chip[aria-pressed="true"] .enc-glass-chip-check {
  background: #3177e3;
  border-color: #3177e3;
  color: white;
}
.enc-glass-days {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 5px;
}
.enc-glass-days button {
  border: 0;
  background: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 650;
  color: #5b6980;
  min-height: 44px;
  padding: 0 2px 2px;
}
.enc-glass-switch {
  width: 31px;
  height: 18px;
  border-radius: 20px;
  background: #ccd7e5;
  display: flex;
  align-items: center;
  padding: 2px;
}
.enc-glass-switch > span {
  height: 14px;
  width: 14px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 3px #293b5730;
  transition: transform 0.18s;
}
.enc-glass-days button[aria-pressed="true"] {
  color: #245fbd;
}
.enc-glass-days button[aria-pressed="true"] .enc-glass-switch {
  background: #367be4;
}
.enc-glass-days button[aria-pressed="true"] .enc-glass-switch > span {
  transform: translateX(13px);
}
.enc-glass-hours {
  margin-top: 9px;
}
.enc-glass-text-button {
  font-size: 11px;
  color: #245fbd;
  text-decoration: underline;
  background: none;
  border: 0;
  padding: 5px 0;
}
.enc-glass-advanced {
  border: 1px solid #ffffffc0;
  border-radius: 16px;
  background: #ffffff37;
  min-width: 0;
}
.enc-glass-advanced > summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 13px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 650;
  list-style: none;
}
.enc-glass-advanced > summary::-webkit-details-marker {
  display: none;
}
.enc-glass-advanced > summary > span {
  display: flex;
  align-items: center;
  gap: 7px;
}
.enc-glass-advanced summary small {
  font-size: 10px;
  font-weight: 400;
  color: #5c6d84;
}
.enc-glass-advanced[open] > summary > svg {
  transform: rotate(180deg);
}
.enc-glass-advanced-content {
  padding: 1px 13px 14px;
  display: grid;
  gap: 12px;
}
.enc-glass-media-heading {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 6px;
}
.enc-glass-media-heading > span {
  margin-left: auto;
  font-size: 10px;
  color: #516681;
}
.enc-glass-logo-row {
  display: flex;
  gap: 12px;
  align-items: center;
}
.enc-glass-logo {
  height: 64px;
  width: 72px;
  object-fit: cover;
  border-radius: 12px;
  border: 1px solid white;
  flex-shrink: 0;
}
.enc-glass-empty {
  display: grid;
  place-items: center;
  background: #ffffff80;
  color: #788ba4;
}
.enc-glass-media-actions {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
}
.enc-glass-upload,
.enc-glass-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 36px;
  position: relative;
  border: 1px solid #ffffffda;
  background: linear-gradient(135deg, #ffffff9e, #ffffff52);
  box-shadow:
    inset 0 1px 0 white,
    0 2px 8px #42669b08;
  border-radius: 11px;
  color: #344b6b;
  font-size: 11px;
  font-weight: 600;
  padding: 8px 12px;
  cursor: pointer;
  overflow: hidden;
}
.enc-glass-upload input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}
.enc-glass-upload:focus-within {
  outline: 3px solid #2774dd;
  outline-offset: 3px;
}
.enc-glass-remove {
  color: #ac3657;
}
.enc-glass-gallery {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 7px;
}
.enc-glass-gallery > div {
  position: relative;
  aspect-ratio: 1;
  min-width: 0;
}
.enc-glass-gallery img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid white;
}
.enc-glass-gallery button {
  position: absolute;
  right: 3px;
  top: 3px;
  width: 26px;
  height: 26px;
  border: 1px solid white;
  border-radius: 50%;
  background: #273951b8;
  color: white;
  display: grid;
  place-items: center;
}
.enc-glass-admin {
  border-top: 1px solid #ffffffbd;
  padding-top: 12px;
  display: grid;
  gap: 10px;
}
.enc-glass-slug {
  display: flex;
  align-items: center;
  gap: 5px;
}
.enc-glass-slug > span {
  font-size: 11px;
  color: #60728b;
}
.enc-glass-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.enc-glass-check input {
  accent-color: #347ae1;
  width: 17px;
  height: 17px;
}
.enc-glass-error {
  flex-shrink: 0;
  padding: 10px 18px;
  font-size: 12px;
  line-height: 1.45;
  background: #fff1f4;
  color: #9e2446;
  border-top: 1px solid #f3b5c7;
  max-height: 100px;
  overflow: auto;
}
.enc-glass-footer {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 13px 17px;
  border-top: 1px solid #ffffffe0;
  background: #f2f7ff80;
  backdrop-filter: blur(26px);
  -webkit-backdrop-filter: blur(26px);
  box-shadow: 0 -5px 20px #42669b06;
}
.enc-glass-save-status {
  font-size: 10px;
  color: #566781;
  max-width: 150px;
  line-height: 1.4;
}
.enc-glass-footer > div {
  display: flex;
  gap: 8px;
}
.enc-glass-save {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 37px;
  border: 1px solid #629cf2;
  border-radius: 11px;
  background: linear-gradient(#438bf1, #2368d6);
  color: white;
  font-size: 12px;
  font-weight: 650;
  padding: 9px 14px;
  box-shadow:
    0 4px 12px #2864c127,
    inset 0 1px 0 #ffffff4d;
}
.enc-glass-overlay button {
  cursor: pointer;
}
.enc-glass-overlay button:disabled,
.enc-glass-overlay fieldset:disabled {
  cursor: wait;
  opacity: 0.65;
}
.enc-glass-overlay button:disabled {
  pointer-events: none;
}
.enc-glass-spinner {
  animation: enc-glass-spin 1s linear infinite;
}
@keyframes enc-glass-spin {
  to {
    transform: rotate(360deg);
  }
}
@supports not (
  (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))
) {
  .enc-glass-dialog {
    background: linear-gradient(125deg, #e8f1ff, #f8f1f8);
  }
  .enc-glass-overlay {
    background: #314965ba;
  }
}
@media (max-width: 600px) {
  .enc-glass-overlay {
    padding: 8px;
  }
  .enc-glass-dialog {
    max-height: calc(100dvh - 16px);
    border-radius: 22px;
  }
  .enc-glass-header {
    padding: 14px;
    gap: 9px;
  }
  .enc-glass-header h2 {
    font-size: 19px;
  }
  .enc-glass-header p {
    font-size: 10px;
  }
  .enc-glass-pencil {
    width: 38px;
    height: 38px;
    border-radius: 13px;
  }
  .enc-glass-close {
    height: 34px;
    width: 34px;
  }
  .enc-glass-scroll {
    padding: 10px;
  }
  .enc-glass-card {
    padding: 12px;
  }
  .enc-glass-overlay input:not([type="checkbox"]):not([type="file"]),
  .enc-glass-overlay textarea,
  .enc-glass-overlay select {
    font-size: 16px;
    min-height: 42px;
  }
  .enc-glass-payments {
    grid-template-columns: 1fr 1fr;
  }
  .enc-glass-chip {
    min-height: 44px;
    font-size: 11px;
  }
  .enc-glass-footer {
    padding: 11px 13px;
    padding-bottom: max(11px, env(safe-area-inset-bottom));
  }
  .enc-glass-save-status {
    display: none;
  }
  .enc-glass-footer > div {
    width: 100%;
    justify-content: flex-end;
  }
  .enc-glass-save,
  .enc-glass-footer .enc-glass-secondary {
    min-height: 43px;
  }
  .enc-glass-gallery {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
@media (max-width: 390px) {
  .enc-glass-two {
    grid-template-columns: 1fr;
  }
  .enc-glass-address {
    grid-template-columns: 1fr 105px;
  }
  .enc-glass-header p {
    max-width: 205px;
  }
  .enc-glass-advanced summary small {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .enc-glass-overlay * {
    animation: none !important;
    transition: none !important;
  }
}
`;
