import { ImageResponse } from "next/og";
import { BRAND, MARK_DATA_URI } from "@/server/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon for iOS. iOS rounds the corners itself, so the tile is square. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      // The gradient behind the mark fills its rounded corners, so iOS's own
      // mask never reveals black edges.
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundImage: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MARK_DATA_URI} width={180} height={180} alt="" />
      </div>
    ),
    size,
  );
}
