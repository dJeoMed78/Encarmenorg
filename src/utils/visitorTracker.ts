export interface VisitorInfo {
  visitorId: string;
  sessionId: string;
  device: 'desktop' | 'tablet' | 'mobile';
  browser: string;
  os: string;
  referrerSource: string;
  isNewVisitor: boolean;
}

export function getVisitorInfo(): VisitorInfo {
  if (typeof window === 'undefined') {
    return {
      visitorId: 'server',
      sessionId: 'server',
      device: 'desktop',
      browser: 'unknown',
      os: 'unknown',
      referrerSource: 'Directo',
      isNewVisitor: false
    };
  }

  let isNew = false;
  let visitorId = localStorage.getItem('encarmen_visitor_id');
  if (!visitorId) {
    isNew = true;
    visitorId = 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    try {
      localStorage.setItem('encarmen_visitor_id', visitorId);
      localStorage.setItem('encarmen_first_visit', new Date().toISOString());
    } catch {}
  }

  let sessionId = sessionStorage.getItem('encarmen_session_id');
  if (!sessionId) {
    sessionId = 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    try {
      sessionStorage.setItem('encarmen_session_id', sessionId);
    } catch {}
  }

  const ua = navigator.userAgent || '';
  let device: 'desktop' | 'tablet' | 'mobile' = 'desktop';
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    device = 'tablet';
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
    device = 'mobile';
  }

  let os = 'Otro';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS (iPhone/iPad)';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Otro';
  if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Chrome|CriOS/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua)) browser = 'Safari';
  else if (/Firefox|FxiOS/i.test(ua)) browser = 'Firefox';
  else if (/Opera|OPR/i.test(ua)) browser = 'Opera';

  let referrerSource = 'Directo / Acceso Directo';
  try {
    const ref = document.referrer ? document.referrer.toLowerCase() : '';
    if (ref) {
      if (ref.includes('facebook.com') || ref.includes('fb.com')) referrerSource = 'Facebook';
      else if (ref.includes('instagram.com')) referrerSource = 'Instagram';
      else if (ref.includes('wa.me') || ref.includes('whatsapp.com')) referrerSource = 'WhatsApp';
      else if (ref.includes('google.')) referrerSource = 'Búsqueda Google';
      else if (ref.includes('tiktok.com')) referrerSource = 'TikTok';
      else if (ref.includes('twitter.com') || ref.includes('x.com')) referrerSource = 'Twitter / X';
      else if (ref.includes('bing.com') || ref.includes('yahoo.com')) referrerSource = 'Buscador Web';
      else if (!ref.includes(window.location.hostname)) {
        try {
          referrerSource = new URL(ref).hostname.replace('www.', '');
        } catch {
          referrerSource = 'Sitio Web Externo';
        }
      }
    }
  } catch {}

  return {
    visitorId,
    sessionId,
    device,
    browser,
    os,
    referrerSource,
    isNewVisitor: isNew
  };
}
