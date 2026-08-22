import React, { useEffect, useState } from 'react';
import fallbackImage from '../src/assets/images/free_at_last_icon_1784364637310.jpg';

const DEFAULT_FALLBACK = fallbackImage || "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22400%22%20height%3D%22300%22%20viewBox%3D%220%200%20400%20300%22%20fill%3D%22%232b337e%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%23f1f5f9%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%20font-size%3D%2220%22%20fill%3D%22%232b337e%22%20font-weight%3D%22bold%22%3Efree%40last%3C%2Ftext%3E%3C%2Fsvg%3E";

type ImageWithFallbackProps = React.ComponentPropsWithoutRef<'img'> & {
  fallbackSrc?: string;
};

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  fallbackSrc = DEFAULT_FALLBACK,
  onError,
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState<string>(src || fallbackSrc);

  useEffect(() => {
    setImageSrc(src || fallbackSrc);
  }, [src, fallbackSrc]);

  return (
    <img
      {...props}
      src={imageSrc}
      onError={(event) => {
        onError?.(event);
        if (imageSrc !== fallbackSrc) setImageSrc(fallbackSrc);
      }}
    />
  );
};
