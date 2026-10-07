/* eslint-disable react-refresh/only-export-components */
import { Helmet } from "react-helmet-async";

type Product = Pick<SeoProduct, "title" | "id">;
type SeoProduct = { id: string; title: string };

export const SITE_URL = "https://www.mbokamaket.com";
export const SITE_NAME = "Mbokamaket";
export const DEFAULT_IMAGE = `${SITE_URL}/favicon.png`;

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
  const structuredData = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

  return (
    <Helmet>
      <html lang="fr" />
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content="marketplace RDC, petites annonces RDC, acheter en RDC, vendre en RDC, immobilier RDC, voiture occasion RDC, emploi RDC, services RDC" />
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
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "fr-CD",
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.png`,
    areaServed: {
      "@type": "Country",
      name: "République démocratique du Congo",
      alternateName: "RDC",
    },
  },
];

export const pageSeo = (pathname: string): SeoConfig => {
  const pages: Record<string, SeoConfig> = {
    "/": { title: "Mbokamaket – Acheter et vendre en RDC", description: "Achetez des produits et trouvez des petites annonces près de chez vous. Mbokamaket met en relation acheteurs et vendeurs partout en République démocratique du Congo.", path: "/" },
    "/immobilier": { title: "Immobilier à vendre et à louer en RDC | Mbokamaket", description: "Consultez les annonces de maisons, terrains et appartements à vendre ou à louer en République démocratique du Congo.", path: pathname },
    "/vehicules": { title: "Voitures et véhicules d’occasion en RDC | Mbokamaket", description: "Parcourez les annonces de voitures, motos et autres véhicules d’occasion à vendre en République démocratique du Congo.", path: pathname },
    "/services": { title: "Services et prestataires en RDC | Mbokamaket", description: "Trouvez des services et prestataires près de chez vous ou publiez votre offre sur Mbokamaket.", path: pathname },
    "/emploi": { title: "Offres d’emploi en RDC | Mbokamaket", description: "Découvrez des offres d’emploi et des opportunités professionnelles en République démocratique du Congo.", path: pathname },
    "/annonces": { title: "Petites annonces en RDC | Mbokamaket", description: "Découvrez les petites annonces en République démocratique du Congo et contactez directement les vendeurs.", path: pathname },
    "/boutiques": { title: "Boutiques et vendeurs en RDC | Mbokamaket", description: "Découvrez les boutiques et vendeurs locaux présents sur la marketplace Mbokamaket en RDC.", path: pathname },
    "/contact": { title: "Contacter Mbokamaket", description: "Une question sur Mbokamaket ? Retrouvez les informations pour contacter notre équipe.", path: pathname },
    "/a-propos": { title: "À propos de Mbokamaket", description: "Mbokamaket facilite l’achat, la vente et la découverte de petites annonces partout en RDC.", path: pathname },
    "/telechargement": { title: "Télécharger l’application Mbokamaket", description: "Téléchargez Mbokamaket sur votre téléphone et découvrez une marketplace pensée pour acheter et vendre près de chez vous.", path: pathname },
  };
  return pages[pathname] || pages["/"];
};
