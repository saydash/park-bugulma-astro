process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
// Получение данных
import localPosts from './posts.json'; // Импортируем файл один раз здесь

export async function getPosts() {
  const targetUrl = 'https://parkbugulma.ru';
  
  try {
    // Пробуем живой запрос
    const response = await fetch(targetUrl, { 
        signal: AbortSignal.timeout(2000) // Ждем только 2 секунды
    });
    if (response.ok) return await response.json();
    throw new Error('Server unreachable');
  } catch (e) {
    // Если упало (наш случай), молча отдаем локальный JSON
    console.warn("⚠️ Используем локальный JSON (сеть недоступна)");
    return localPosts;
  }
}

// 1. Для КАРТОЧЕК (вырезает шорткоды И все HTML-теги)
export function getCleanText(text) {
  if (!text) return "";

  let clean = text;

  // Удаляем шорткоды [vc_...]
  clean = clean.replace(/\[\/?[^\]]+\]/g, "");

  // Удаляем ВСЕ HTML теги (чистый текст)
  clean = clean.replace(/<[^>]*>/g, "");

  // Декодируем сущности
  const entities = {
    '&nbsp;': ' ',
    '&#171;': '«',
    '&#187;': '»',
    '&#8212;': ' - ',
    '&rsquo;': '’',
    '&lsquo;': '‘',
    '&#8230;': '...',
    '&amp;': '&',
    '&#8243;': '"'
  };
  
  for (let key in entities) {
    clean = clean.replace(new RegExp(key, 'g'), entities[key]);
  }

  // Убираем лишние пробелы и переносы
  return clean.replace(/\s+/g, ' ').trim();
}

// 2. Для ПОЛНЫХ СТРАНИЦ (вырезает шорткоды, но ОСТАВЛЯЕТ HTML-разметку)
export function getCleanContent(html) {
  if (!html) return "";

  let clean = html;

  // 1. ПРЕВРАЩАЕМ ШОРТКОД ГАЛЕРЕИ В НАШ БЛОК
  // Ищем [gallery ids="1,2,3"]
  clean = clean.replace(/\[gallery ids="([^"]+)"\]/g, (match, ids) => {
    return `<div class="wp-custom-gallery" data-ids="${ids}"></div>`;
  });

  // 2. УДАЛЯЕМ ОСТАТКИ VISUAL COMPOSER (старая логика)
  clean = clean.replace(/\[\/?[^\]]+\]/g, (match) => {
    // Не удаляем наш только что созданный блок галереи
    if (match.includes('wp-custom-gallery')) return match;
    return "";
  });

  return clean.trim();
}

// Универсальная функция для поиска картинки в объекте поста WordPress
export function getFeaturedImage(post) {
  try {
    // Проверка на существование вложенных медиа
    const media = post._embedded?.['wp:featuredmedia']?.[0];
    if (!media) return null;

    // Пробуем разные варианты путей к URL
    return media.source_url || 
           media.media_details?.sizes?.full?.source_url || 
           media.media_details?.sizes?.large?.source_url || 
           null;
  } catch (e) {
    return null;
  }
}