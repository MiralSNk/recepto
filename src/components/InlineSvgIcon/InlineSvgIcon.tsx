'use client';

import { useEffect, useState } from 'react';

interface InlineSvgIconProps {
  src: string;
  alt?: string;
  className?: string;
}

/**
 * Показывает загруженную (не встроенную в сборку) SVG-иконку. В отличие от
 * <img src="...">, вставляет содержимое SVG прямо в HTML страницы — это
 * единственный способ, которым fill="currentColor" внутри файла реально
 * подхватывает цвет сайта: SVG, отрисованный как <img>/фон, рендерится
 * браузером в изолированном контексте и не видит CSS страницы вообще,
 * независимо от того, что написано внутри файла.
 *
 * Содержимое зачищается при ЗАГРУЗКЕ (см. sanitizeSvg в
 * /api/admin/upload) — здесь только вставка, повторной зачистки при показе
 * не делаем (не бесплатно на каждый рендер, а источник один — свой аплоад).
 *
 * Для не-SVG (PNG/JPEG иконки) и до момента загрузки содержимого — обычный
 * <img>, никакой разницы в поведении для растровых файлов нет.
 */
export default function InlineSvgIcon({ src, alt = '', className }: InlineSvgIconProps) {
  const isSvg = src.split('?')[0].toLowerCase().endsWith('.svg');
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);

  useEffect(() => {
    if (!isSvg) {
      setSvgMarkup(null);
      return;
    }
    let cancelled = false;
    fetch(src)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error('fetch failed'))))
      .then((text) => {
        if (!cancelled) setSvgMarkup(text);
      })
      .catch(() => {
        if (!cancelled) setSvgMarkup(null);
      });
    return () => {
      cancelled = true;
    };
  }, [src, isSvg]);

  if (isSvg && svgMarkup) {
    return (
      <span
        className={className}
        role="img"
        aria-label={alt}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} />;
}
