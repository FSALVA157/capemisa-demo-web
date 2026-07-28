import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  url: string | null | undefined;
  alt?: string;
  className?: string;
};

export function ImagenPublicacion({ url, alt = "Imagen de la publicación", className }: Props) {
  const [errored, setErrored] = useState(false);

  if (!url || errored) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground w-full aspect-video",
          className,
        )}
      >
        <ImageOff className="h-10 w-10 opacity-50" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      onError={() => setErrored(true)}
      className={cn("w-full aspect-video object-cover bg-muted", className)}
    />
  );
}
