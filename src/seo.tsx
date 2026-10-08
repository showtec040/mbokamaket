/* eslint-disable react-refresh/only-export-components */
import { Helmet } from "react-helmet-async";

type Product = Pick<SeoProduct, "title" | "id">;
type SeoProduct = { id: string; title: string };

export const SITE_URL = "https://www.mbokamaket.com";
export const SITE_NAME = "Mbokamarket RDC";
export const DEFAULT_IMAGE = `${SITE_URL}/favicon.png`;
const SITE_DESCRIPTION = "Mbokamarket RDC, marketplace congolaise de Kambexa pour acheter et vendre produits, immobilier, véhicules, services et petites annonces partout en RDC.";

export const slugify = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "")
  .slice(0, 70);

export const productSlug = (product: Pick<Product, "title" | "id">) => `${slugify(product.title) || "annonce"}-${product.id}`;
export const productPath = (product: Pick<Product, "title" | "id">) => `/produit/${productSlug(product)}`;

const absoluteUrl = (value: string) => {
  try {
    return new URL(value, SITE_URL).toString();
  } catch {
    return DEFAULT_IMAGE;
  }
};

export type SeoConfig = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: "website" | "product";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

export function Seo({ title, description, path = "/", image = DEFAULT_IMAGE, type = "website", jsonLd }: SeoConfig) {
  const url = new URL(path, SITE_URL).toString();
  const imageUrl = absoluteUrl(image);
  const pageStructuredData = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];
  const structuredData = [...siteStructuredData, ...pageStructuredData];

  return (
    <Helmet>
      <html lang="fr" />
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="index, follow, max-image-preview:large" />
      <meta name="googlebot" content="index, follow, max-image-preview:large" />
      <link rel="canonical" href={url} />
      <meta property="og:type" content={type === "product" ? "product" : "website"} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="fr_CD" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:alt" content={title} />
      <meta property="og:url" content={url} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      {structuredData.map((data, index) => <script key={index} type="application/ld+json">{JSON.stringify(data)}</script>)}
    </Helmet>
  );
}

export const siteStructuredData = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    alternateName: ["Mbokamaket.com", "Mbokamarket"],
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "fr-CD",
    publisher: { "@id": `${SITE_URL}/#organization` },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    alternateName: ["Mbokamaket.com", "Mbokamarket"],
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/favicon.png`,
    },
    brand: { "@type": "Brand", name: SITE_NAME },
    knowsAbout: [
      "Marketplace en République démocratique du Congo",
      "Petites annonces en RDC",
      "Achat et vente de produits",
      "Boutiques et vendeurs locaux",
      "Immobilier en RDC",
      "Véhicules d’occasion en RDC",
      "Services et emploi en RDC",
    ],
    areaServed: {
      "@type": "Country",
      name: "République démocratique du Congo",
      alternateName: "RDC",
    },
    parentOrganization: {
      "@type": "Organization",
      name: "Kambexa",
    },
  },
];

export const pageSeo = (pathname: string): SeoConfig => {
  const pages: Record<string, SeoConfig> = {
    "/": { title: "Mbokamarket RDC, marketplace congolaise | Kambexa", description: SITE_DESCRIPTION, path: "/" },
    "/immobilier": { title: "Immobilier à vendre et à louer en RDC | Mbokamarket RDC", description: "Consultez les annonces de maisons, terrains et appartements à vendre ou à louer en République démocratique du Congo.", path: pathname },
    "/vehicules": { title: "Voitures et véhicules d’occasion en RDC | Mbokamarket RDC", description: "Parcourez les annonces de voitures, motos et autres véhicules d’occasion à vendre en République démocratique du Congo.", path: pathname },
    "/services": { title: "Services et prestataires en RDC | Mbokamarket RDC", description: "Trouvez des services et prestataires près de chez vous ou publiez votre offre sur Mbokamarket RDC.", path: pathname },
    "/emploi": { title: "Offres d’emploi en RDC | Mbokamarket RDC", description: "Découvrez des offres d’emploi et des opportunités professionnelles en République démocratique du Congo.", path: pathname },
    "/annonces": { title: "Marketplace et petites annonces en RDC | Mbokamarket", description: "Achetez et vendez sur la marketplace Mbokamarket RDC : découvrez des annonces, produits et vendeurs locaux partout en République démocratique du Congo.", path: pathname },
    "/boutiques": { title: "Boutiques et vendeurs en RDC | Mbokamarket RDC", description: "Découvrez les boutiques et vendeurs locaux présents sur la marketplace Mbokamarket RDC en RDC.", path: pathname },
    "/contact": { title: "Contacter Mbokamarket RDC", description: "Une question sur Mbokamarket RDC ? Retrouvez les informations pour contacter notre équipe.", path: pathname },
    "/a-propos": { title: "À propos de Mbokamarket RDC", description: "Mbokamarket RDC facilite l’achat, la vente et la découverte de petites annonces partout en RDC.", path: pathname },
    "/telechargement": { title: "Télécharger l’application Mbokamarket RDC", description: "Téléchargez Mbokamarket RDC sur votre téléphone et découvrez une marketplace pensée pour acheter et vendre près de chez vous.", path: pathname },
  };
  return pages[pathname] || pages["/"];
};
