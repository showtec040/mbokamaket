type LegalPageProps = {
  page: "conditions" | "confidentialite";
  onClose: () => void;
};

export function LegalPage({ page, onClose }: LegalPageProps) {
  const isTerms = page === "conditions";

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-[#f6f8fc]">
      <div className="mx-auto min-h-full max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex items-center justify-between gap-4">
          <a href="#accueil" onClick={onClose} className="flex items-center gap-2 text-[#143ca8]"><span className="grid size-10 place-items-center rounded-xl bg-[#143ca8] text-lg font-black text-white">M</span><strong className="font-display text-lg">Mbokamaket</strong></a>
          <button type="button" onClick={onClose} className="btn btn-ghost rounded-xl">Retour à l’accueil</button>
        </div>
        <article className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#143ca8]">Mbokamaket</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-slate-900">{isTerms ? "Conditions d’utilisation" : "Politique de confidentialité"}</h1>
          <p className="mt-2 text-sm text-slate-500">Dernière mise à jour : 6 septembre 2026</p>
          {isTerms ? <TermsContent /> : <PrivacyContent />}
        </article>
      </div>
    </div>
  );
}

function TermsContent() {
  return <div className="mt-8 space-y-6 leading-7 text-slate-600"><section><h2 className="text-xl font-bold text-slate-900">1. Objet du service</h2><p>Mbokamaket est une plateforme qui permet aux utilisateurs de publier, découvrir et contacter des vendeurs pour des produits et services proposés localement.</p></section><section><h2 className="text-xl font-bold text-slate-900">2. Utilisation de la plateforme</h2><p>L’utilisateur s’engage à fournir des informations exactes, à respecter les lois applicables et à ne pas publier de contenu frauduleux, illégal, trompeur ou portant atteinte aux droits d’autrui.</p></section><section><h2 className="text-xl font-bold text-slate-900">3. Annonces et transactions</h2><p>Les vendeurs sont responsables de leurs annonces, de leurs produits et de leurs échanges avec les acheteurs. Mbokamaket n’est pas partie aux transactions et recommande de vérifier le produit et le vendeur avant tout paiement.</p></section><section><h2 className="text-xl font-bold text-slate-900">4. Compte utilisateur</h2><p>L’utilisateur doit protéger ses identifiants et signaler toute utilisation non autorisée de son compte. Mbokamaket peut suspendre une annonce ou un compte en cas de non-respect des présentes conditions.</p></section><section><h2 className="text-xl font-bold text-slate-900">5. Contact</h2><p>Pour toute question, écrivez à <a className="font-semibold text-[#143ca8]" href="mailto:contact@mbokamaket.com">contact@mbokamaket.com</a>.</p></section></div>;
}

function PrivacyContent() {
  return <div className="mt-8 space-y-6 leading-7 text-slate-600"><section><h2 className="text-xl font-bold text-slate-900">1. Données collectées</h2><p>Nous pouvons collecter les informations nécessaires à la création du compte, aux annonces, aux favoris, aux notifications et aux échanges avec les utilisateurs.</p></section><section><h2 className="text-xl font-bold text-slate-900">2. Utilisation des données</h2><p>Ces données servent à fournir les fonctionnalités de Mbokamaket, sécuriser les comptes, afficher les annonces et améliorer le service. Nous ne vendons pas les données personnelles des utilisateurs.</p></section><section><h2 className="text-xl font-bold text-slate-900">3. Supabase et stockage</h2><p>Les données applicatives sont hébergées via Supabase. Les utilisateurs doivent éviter de partager des informations sensibles dans une annonce ou un message public.</p></section><section><h2 className="text-xl font-bold text-slate-900">4. Conservation et droits</h2><p>Nous conservons les données pendant la durée nécessaire au fonctionnement du service. Vous pouvez demander l’accès, la correction ou la suppression de vos données en écrivant à notre adresse de contact.</p></section><section><h2 className="text-xl font-bold text-slate-900">5. Contact</h2><p>Pour toute demande concernant vos données personnelles, écrivez à <a className="font-semibold text-[#143ca8]" href="mailto:contact@mbokamaket.com">contact@mbokamaket.com</a>.</p></section></div>;
}
