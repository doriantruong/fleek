import Image from "next/image"
import { getImageUrl } from "@/lib/helpers/get-image-url"

export const SellerAvatar = ({
  photo = "",
  size = 32,
  alt = "",
}: {
  photo?: string
  size?: number
  alt?: string
}) => {
  const resolvedPhoto = getImageUrl(photo)

  return resolvedPhoto ? (
    <Image
      src={resolvedPhoto}
      alt={alt}
      width={size}
      height={size}
      className="shrink-0"
      style={{ maxWidth: size, maxHeight: size }}
    />
  ) : (
    <Image
      src="/images/placeholder.svg"
      alt={alt}
      className="opacity-30 w-8 h-8 shrink-0"
      width={32}
      height={32}
      style={{ maxWidth: 32, maxHeight: 32 }}
    />
  )
}
