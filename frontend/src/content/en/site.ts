// English version of ../vi/site.ts. Same structure and the same source material (the ELITE catalogue and
// https://www.phuanlift.com); do not add claims those sources do not state. Images, ids and colours mirror the
// Vietnamese file.

import { companyShared } from "../company";

const IMG = "/images/catalogue";

export const company = {
  ...companyShared,
  name: "Phu An Elevator",
  legalName: "Phu An Elevator Joint Stock Company",
  slogan: "Phu An is always ready to serve our customers",
  address: "No. 6, Street No. 1, Binh Hung Hoa Ward, Ho Chi Minh City",
};

/** `section` is the id on the home page that marks the link active while it is on screen. */
export const navItems = [
  { label: "About", href: "/#about", section: "about" },
  { label: "Technology", href: "/#technology", section: "technology" },
  { label: "Products", href: "/products", section: "products" },
  { label: "Cabin", href: "/#cabins", section: "cabins" },
  { label: "Customize", href: "/customize", section: "customize" },
  { label: "Projects", href: "/projects", section: "projects" },
  { label: "Services", href: "/#services", section: "services" },
  { label: "Contact", href: "/#contact", section: "contact" },
];

export const hero = {
  badge: "Imported premium home elevators",
  title: ["Crafting", "excellence"],
  accent: "Honouring the art",
  lead: "In a modern age, only style endures. The ELITE elevator is a precious work of art within the interior — redefining fashionable style and leading a refined way of living.",
  image: `${IMG}/hero-living-room.jpg`,
};

export const stats = [
  { value: "12", label: "Product ranges", note: "From passenger elevators to escalators and moving walks" },
  { value: "20 m", label: "Maximum travel", note: "Platform-type villa elevator" },
  { value: "11", label: "Cabin designs", note: "V01 – V11, standard and optional" },
];

export const about = {
  image: `${IMG}/villa-exterior.jpg`,
  paragraphs: [
    "With a complete set of advanced manufacturing and machining equipment and first-class testing instruments, ELITE, a professional elevator company, applies modern elevator control technology throughout to keep its production technology at the leading standard of the industry.",
    "From design to manufacturing, from installation to maintenance, we do our utmost to meet each customer's individual requirements. A nationwide service network and well-trained engineers are dedicated to delivering perfect service quality.",
  ],
  range: [
    "Passenger elevators",
    "Panoramic (glass) elevators",
    "Hospital bed elevators",
    "Freight elevators",
    "Hydraulic elevators",
    "Car elevators",
    "Small machine room elevators",
    "Machine-room-less elevators",
    "Home elevators (homelifts)",
    "Dumbwaiters (food lifts)",
    "Escalators",
    "Moving walks",
  ],
  lifecycle: ["Design", "Manufacturing", "Installation", "Upgrade & renovation", "Maintenance"],
};

export const technology = {
  image: `${IMG}/gearless-cabin.jpg`,
  items: [
    {
      icon: "controller",
      title: "Leading technology",
      text: "A new-generation “All-in-one” smart controller with a compact, refined design that can be installed anywhere without affecting the architecture of the home.",
    },
    {
      icon: "motor",
      title: "Outstanding, quiet performance",
      text: "A new-generation gearless permanent-magnet synchronous motor delivers maximum drive efficiency and ultra-quiet, noise-free operation.",
    },
    {
      icon: "door",
      title: "Smart VVVF door technology",
      text: "Advanced VVVF closed-loop control opens and closes the landing and cabin doors in sync, precisely and with complete safety.",
    },
    {
      icon: "leaf",
      title: "Green, environmentally friendly solution",
      text: "A 100% clean-running motor that needs no oil or grease lubrication, removing the risk of oil pollution and saving energy outstandingly.",
    },
  ],
};

export const productLines = [
  {
    id: "traction",
    slug: "thang-may-biet-thu-keo-cap",
    tag: "Traction type",
    title: "Traction villa elevator",
    image: `${IMG}/traction-villa.jpg`,
    bullets: [
      "High level of safety",
      "A large contact area between the steel rope and the traction sheave makes for smoother operation",
      "Low power consumption, environmentally friendly",
      "A small-diameter traction sheave saves hoistway space",
      "A polyurethane layer that needs no lubrication, with low noise and a long service life",
      "No traditional machine room, saving construction cost",
      "UPS backup power that can rescue passengers during a power failure",
    ],
    chips: ["Centre opening", "Side opening", "Manual door"],
    note: "The product can be custom designed to the customer's needs and conditions of use.",
  },
  {
    id: "platform",
    slug: "thang-may-biet-thu-nang-san",
    tag: "Platform type",
    title: "Platform villa elevator",
    image: `${IMG}/platform-villa.jpg`,
    bullets: [
      "Tempered-glass cabin walls reduce the risk of contact between passengers and the hoistway",
      "Fits villas, renovated homes or buildings with limited hoistway space — in the middle of a staircase, beside it, against a wall or inside an existing hoistway",
      "Rescue system: external communication phone (standard)",
    ],
    specs: [
      { label: "Height", value: "2400 mm" },
      { label: "Rated speed", value: "0.3 m/s" },
      { label: "Lifting travel", value: "2300 – 20000 mm" },
      { label: "Control power supply", value: "DC48V / AC220V / 380V" },
      { label: "Drive system", value: "Steel belt" },
      { label: "Pit", value: "With pit: depth under 100 mm · Pitless: ramp about 100 mm high" },
    ],
  },
  {
    id: "round",
    slug: "thang-may-tron-biet-thu",
    tag: "Round art elevator",
    title: "Round & semicircular villa elevators",
    image: `${IMG}/round-elevator.jpg`,
    paragraphs: [
      "Round villa elevator: ELITE ELEVATOR takes refined beauty in every detail as its design philosophy. The round cabin is designed specifically for villas and integrates a comprehensive safety protection system, delivering a secure, smooth and reliable ride.",
      "Semicircular villa elevator: the cabin is emphasised by its semicircular structure, adding a sense of spaciousness and enhancing the visual experience. It can carry more passengers and is custom made to the homeowner's needs.",
    ],
  },
];

export const wellFrames = {
  image: `${IMG}/champagne-villa.jpg`,
  steel: "Cost-saving; the finish and the cladding panel design can be chosen to match the style of the installation site; the surface is spray-treated against rust and corrosion.",
  aluminum:
    "A freestanding glass hoistway design that does not add to construction cost and is highly transparent, blending harmoniously with the interior. Corrosion resistant and long lasting; made from industrial-grade aluminium alloy and multi-layer safety glass.",
  colors: [
    { name: "White", css: "#f4f4f2" },
    { name: "Matte black", css: "#1b1b1d" },
    { name: "Champagne gold", css: "#d9c7a3" },
    { name: "Premium grey", css: "#9c9ea3" },
    { name: "Rose gold", css: "#c98f7c" },
    { name: "Metallic gold", css: "#c9a227" },
  ],
};

export const cabins = [
  {
    code: "V01",
    name: "Modern minimalist",
    level: "Standard",
    image: `${IMG}/cabin-v01.jpg`,
    detail: "Mirror stainless steel ceiling, recessed LED lights · Brushed and mirror stainless steel walls",
  },
  {
    code: "V02",
    name: "Fashionable rhythm",
    level: "Optional",
    image: `${IMG}/cabin-v02.jpg`,
    detail: "Sandblasted / mirror rose gold stainless steel walls · Translucent acrylic ceiling panel",
  },
  {
    code: "V04",
    name: "Modern minimalist",
    level: "Optional",
    image: `${IMG}/cabin-v04.jpg`,
    detail: "Brushed bronze and mirror stainless steel walls · Art-painted handrail",
  },
  {
    code: "V05",
    name: "Elegant lines",
    level: "Optional",
    image: `${IMG}/cabin-v05.jpg`,
    detail: "Brushed stainless steel ceiling, LED strip · Brushed bronze stainless steel walls, concealed LED strip",
  },
  {
    code: "V06",
    name: "Classic style",
    level: "Optional",
    image: `${IMG}/cabin-v06.jpg`,
    detail: "Mirror bronze stainless steel walls with etched patterns · Translucent acrylic ceiling panel",
  },
  {
    code: "V08",
    name: "Classic style",
    level: "Optional",
    image: `${IMG}/cabin-v08.jpg`,
    detail: "Mirror bronze stainless steel with etched patterns · Round mirror titanium-gold stainless steel handrail",
  },
];

export const cabinNote: string =
  "Cabin floor: stone floor as standard, PVC or marble optional. Besides the designs above, the catalogue also includes V03 (marble-pattern stone rear wall), V07, V09 (luxurious Champagne), V10 (Open space) and V11 (Elegant demeanour).";

export const services = {
  image: `${IMG}/advisor.jpg`,
  items: [
    {
      title: "Advice and a hands-on experience before you buy",
      text: "Dedicated advice and support; you experience the product first-hand before making a decision.",
    },
    {
      title: "Book an on-site survey",
      text: "Call the hotline to book a survey. Our technical team arrives on time and analyses your requirements in detail.",
    },
    {
      title: "Professional design, configured to your needs",
      text: "Our design team develops a dedicated solution that fits the structure of the building as well as its architectural and interior style.",
    },
    {
      title: "On-site installation",
      text: "Through our network of authorised partners, the elevator is delivered to the required location, installed, adjusted and tested until it runs stably.",
    },
    {
      title: "Long-term after-sales service",
      text: "A professional maintenance programme throughout the life of the elevator; timely periodic inspections keep it running safely and reliably.",
    },
    {
      title: "Nationwide service network",
      text: "Branches and service centres in many provinces and cities, ready to support you quickly, with genuine spare parts.",
    },
  ],
};
