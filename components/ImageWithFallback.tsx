import React, { useEffect, useState } from 'react';
import fallbackImage from '../src/assets/images/free_at_last_icon_1784364637310.jpg';

type ImageWithFallbackProps = React.ComponentPropsWithoutRef<'img'> & {
  fallbackSrc?: string;
};

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  fallbackSrc = fallbackImage,
  onError,
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState(src || fallbackSrc);

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
