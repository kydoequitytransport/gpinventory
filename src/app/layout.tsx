import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const stripPreviewRefs = `(function () {
  var name = "data-cursor-ref";
  var proto = Element.prototype;
  var setAttribute = proto.setAttribute;
  var setAttributeNS = proto.setAttributeNS;
  proto.setAttribute = function (attr, value) {
    if (attr === name) return;
    return setAttribute.call(this, attr, value);
  };
  proto.setAttributeNS = function (ns, attr, value) {
    if (attr === name) return;
    return setAttributeNS.call(this, ns, attr, value);
  };
  var observer = new MutationObserver(function (records) {
    for (var i = 0; i < records.length; i++) {
      var target = records[i].target;
      if (target && target.removeAttribute && target.hasAttribute(name)) target.removeAttribute(name);
    }
  });
  observer.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: [name] });
  function restore() {
    proto.setAttribute = setAttribute;
    proto.setAttributeNS = setAttributeNS;
    observer.disconnect();
  }
  window.addEventListener("load", function () { setTimeout(restore, 1500); });
})();`;

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-barlow",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display-face",
});

export const metadata: Metadata = {
  title: {
    default: "GP Inventory",
    template: "%s · GP Inventory",
  },
  description: "Catalog and floor stock for a gym equipment shop.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {process.env.NODE_ENV === "development" ? (
          <Script id="strip-preview-refs" strategy="beforeInteractive">
            {stripPreviewRefs}
          </Script>
        ) : null}
        {children}
      </body>
    </html>
  );
}
