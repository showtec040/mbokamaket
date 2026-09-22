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
export const productPath = (product: Pick<Product, "title" | "id">) => `/?produit=${encodeURIComponent(product.id)}`;

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
      <meta property="og:locale" content="fr_FR" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
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
    potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/annonces?q={search_term_string}`, "query-input": "required name=search_term_string" },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.png`,
    areaServed: "CD",
  },
];

export const pageSeo = (pathname: string): SeoConfig => {
  const pages: Record<string, SeoConfig> = {
    "/": { title: "Mbokamaket - Marketplace RDC | Acheter et vendre près de chez vous", description: "Marketplace congolaise pour acheter, vendre et publier des annonces en RDC.", path: "/" },
    "/immobilier": { title: "Immobilier en RDC - Mbokamaket", description: "Trouvez des maisons, terrains, appartements et biens immobiliers à vendre ou à louer en RDC.", path: pathname },
    "/vehicules": { title: "Véhicules d'occasion en RDC - Mbokamaket", description: "Achetez ou vendez une voiture d'occasion, une moto ou un véhicule en RDC.", path: pathname },
    "/services": { title: "Services en RDC - Mbokamaket", description: "Découvrez et proposez des services de confiance près de chez vous en RDC.", path: pathname },
    "/emploi": { title: "Emploi en RDC - Mbokamaket", description: "Trouvez des offres d'emploi et publiez vos opportunités professionnelles en RDC.", path: pathname },
    "/annonces": { title: "Petites annonces RDC - Mbokamaket", description: "Parcourez les petites annonces en RDC pour acheter et vendre facilement.", path: pathname },
    "/boutiques": { title: "Boutiques en RDC - Mbokamaket", description: "Découvrez les boutiques et vendeurs locaux de la marketplace Mbokamaket en RDC.", path: pathname },
    "/contact": { title: "Contact - Mbokamaket", description: "Contactez l'équipe Mbokamaket, marketplace et petites annonces en RDC.", path: pathname },
    "/a-propos": { title: "À propos de Mbokamaket", description: "Mbokamaket facilite l'achat, la vente et les services entre utilisateurs en RDC.", path: pathname },
  };
  return pages[pathname] || pages["/"];
};
