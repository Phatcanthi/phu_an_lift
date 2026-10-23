import { company } from "@/content/site";

const query = encodeURIComponent(company.mapQuery);
const embedSrc = `https://www.google.com/maps?q=${query}&hl=vi&z=17&output=embed`;
const directionsHref = `https://www.google.com/maps/search/?api=1&query=${query}`;

export function CompanyMap() {
  return (
    <div className="map">
      <iframe
        className="map__frame"
        title={`Bản đồ Google Maps: ${company.address}`}
        src={embedSrc}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <a className="btn btn--ghost" href={directionsHref} target="_blank" rel="noopener noreferrer">
        Mở trong Google Maps <span aria-hidden="true">→</span>
      </a>
    </div>
  );
}
