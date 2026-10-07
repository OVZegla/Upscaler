"use client";
import React, { useEffect, useState } from "react";
import { publicAssetUrl } from "@/lib/asset-url";

/**
 * In-app guide.
 *
 * Most of the people using this app are printers and installers, not computer
 * users: the settings have to be explained in their words, with the numbers
 * they actually work with, and without assuming they know what a pixel is.
 * Hence full sentences and worked examples rather than tooltips.
 */

const fontStack = "var(--symp-font, Geist, -apple-system, sans-serif)";

type Entry = { term: string; text: string };
type Section = { id: string; title: string; intro?: string; entries: Entry[] };

const SECTIONS: Section[] = [
  {
    id: "start",
    title: "Pour commencer",
    intro:
      "Trois étapes suffisent. Tout le traitement se fait sur votre ordinateur : aucune image n'est envoyée sur internet.",
    entries: [
      {
        term: "1. Charger l'image",
        text: "Glissez votre fichier dans le cadre en pointillés, ou cliquez dessus pour le choisir sur le disque. Les formats JPG, PNG et WEBP sont acceptés.",
      },
      {
        term: "2. Dire quelle taille vous voulez",
        text: "Soit un facteur d'agrandissement (2×, 4×…), soit directement la largeur du mur en centimètres. Pour un travail d'impression, la deuxième option est presque toujours la bonne.",
      },
      {
        term: "3. Lancer",
        text: "Le bouton en bas affiche « Upscale en cours, patientez… » pendant tout le traitement. Un mur de 3 m peut demander plusieurs minutes : c'est normal, l'ordinateur calcule chaque détail.",
      },
    ],
  },
  {
    id: "size",
    title: "La taille de sortie",
    intro:
      "C'est le réglage le plus important. Il décide de la taille du fichier final et du temps de calcul.",
    entries: [
      {
        term: "Mode « Facteur »",
        text: "Multiplie simplement l'image. Une photo de 1 000 pixels de large en 4× en fait 4 000. À utiliser quand vous ne savez pas encore à quelle taille elle sera imprimée.",
      },
      {
        term: "Mode « Taille d'impression »",
        text: "Vous saisissez la largeur réelle du mur en centimètres et le logiciel calcule tout seul le nombre de pixels nécessaire. C'est le mode à utiliser pour une impression.",
      },
      {
        term: "La résolution (DPI)",
        text: "300 DPI est le standard de l'impression. Cela veut dire 300 points par pouce, soit environ 118 points par centimètre. Le fichier s'ouvre ensuite directement à la bonne taille dans Photoshop et sur le RIP, sans avoir à retoucher quoi que ce soit.",
      },
      {
        term: "Quand passer à 150 DPI",
        text: "Si le logiciel affiche que le traitement est « très gourmand », c'est que le fichier dépasserait le gigaoctet. 150 DPI divise son poids par quatre. Pour une fresque qu'on regarde à plus d'un mètre, la différence ne se voit pas — et rien ne vous empêche de réaugmenter la résolution dans Photoshop ensuite.",
      },
      {
        term: "Le facteur affiché",
        text: "Le logiciel indique de combien votre image doit être agrandie. Au-delà de 8×, l'IA n'a plus assez de matière : elle invente des détails au lieu d'en restituer. Un message rouge vous prévient. Dans ce cas, mieux vaut repartir d'une source plus grande.",
      },
      {
        term: "La sortie reste en RVB",
        text: "Le fichier est enregistré en RVB. La conversion en CMJN se fait dans Photoshop, avec le profil de votre machine — c'est là qu'elle doit se faire.",
      },
    ],
  },
  {
    id: "strips",
    title: "La découpe en bandes",
    intro:
      "Un mur se pose rarement d'une seule pièce. Le logiciel découpe le fichier final en bandes verticales prêtes à imprimer, pour ne plus avoir à le faire à la main dans Photoshop.",
    entries: [
      {
        term: "Nombre de bandes",
        text: "Vous choisissez en combien de morceaux l'image est coupée. Le logiciel les répartit en parts égales sur toute la largeur.",
      },
      {
        term: "Recouvrement",
        text: "Chaque bande déborde de quelques centimètres sur la suivante, pour avoir de la matière à recouper au moment de la pose. 2 cm est une valeur courante. Mettez 0 si vous posez bord à bord.",
      },
      {
        term: "Où sont les fichiers",
        text: "Dans un dossier « …_bandes » créé à côté de l'image complète. Les bandes sont numérotées dans l'ordre de pose, de gauche à droite : bande-1-sur-3, bande-2-sur-3, bande-3-sur-3.",
      },
      {
        term: "L'image complète est gardée",
        text: "La découpe ne remplace rien : le fichier entier est toujours enregistré, les bandes viennent en plus.",
      },
    ],
  },
  {
    id: "quality",
    title: "La qualité",
    entries: [
      {
        term: "Le modèle d'IA",
        text: "Un seul modèle est fourni, parce qu'il n'y avait pas de raison d'en proposer d'autres : sur un banc d'essai de 32 images de référence, c'est lui qui reste le plus proche de l'original, et c'est aussi le plus rapide. Les deux modèles proposés auparavant ont été retirés après mesure.",
      },
      {
        term: "Pourquoi « plus accentué » n'est pas « meilleur »",
        text: "Un modèle qui durcit les contours donne une impression de netteté à l'écran, mais il remplace la vraie texture par du contraste. Sur un mur regardé de près, c'est ce qui donne l'aspect plastique. « Précision » accentue moins et conserve davantage de détail réel.",
      },
      {
        term: "Double Upscale",
        text: "Fait repasser l'image une seconde fois dans l'IA. À réserver aux sources vraiment petites ou abîmées : sur une bonne photo, cela durcit l'image sans rien apporter.",
      },
      {
        term: "Les « passes »",
        text: "Pour atteindre une grande largeur, le logiciel enchaîne plusieurs agrandissements successifs. L'indication « Passe 2 / 3 » montre où en est le travail. C'est un seul et même traitement, découpé en étapes.",
      },
      {
        term: "Photo prise au téléphone",
        text: "L'orientation est corrigée automatiquement. Une photo prise à la verticale ne ressortira pas couchée.",
      },
    ],
  },
  {
    id: "output",
    title: "L'enregistrement",
    entries: [
      {
        term: "Le format",
        text: "PNG ne perd aucune qualité : c'est le bon choix pour l'impression. JPG donne des fichiers plus légers mais ne peut pas dépasser 65 535 pixels de côté — au-delà, le logiciel vous le signale.",
      },
      {
        term: "Le dossier de sortie",
        text: "Par défaut, l'image agrandie est enregistrée à côté de l'originale. Vous pouvez choisir un autre dossier dans les Paramètres et demander qu'il soit mémorisé.",
      },
      {
        term: "Le nom du fichier",
        text: "Il reprend le nom d'origine et ajoute la taille et le modèle utilisés, pour retrouver facilement quel réglage a produit quel fichier.",
      },
    ],
  },
  {
    id: "faq",
    title: "Questions fréquentes",
    entries: [
      {
        term: "Le logiciel a l'air figé",
        text: "Tant que le bouton affiche « Upscale en cours, patientez… » et que le trait lumineux défile, le calcul avance. Sur une très grande image, plusieurs minutes sans rien d'autre à l'écran sont normales.",
      },
      {
        term: "Je veux arrêter",
        text: "Le lien « Annuler », sous le bouton, interrompt le traitement immédiatement. Aucun fichier incomplet n'est laissé derrière.",
      },
      {
        term: "Le résultat est flou ou pâteux",
        text: "C'est presque toujours que la source était trop petite pour la taille demandée. Vérifiez le facteur affiché : s'il dépasse 8×, aucune IA ne pourra inventer les détails manquants.",
      },
      {
        term: "Mes couleurs ont changé",
        text: "Elles ne devraient pas. Si c'est le cas à l'ouverture dans Photoshop, c'est un réglage de profil colorimétrique : le fichier sort en RVB sans profil imposé.",
      },
      {
        term: "Où est le numéro de version",
        text: "Dans Paramètres, tout en bas, avec les mentions légales et la liste des composants utilisés.",
      },
    ],
  },
];

export default function HelpOverlay({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState(SECTIONS[0].id);
  const [logo, setLogo] = useState("");

  // The asset URL depends on the runtime (Tauri vs Electron), which isn't
  // known during the static export — resolve it once mounted.
  useEffect(() => setLogo(publicAssetUrl("logo.png")), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const section = SECTIONS.find((s) => s.id === active) ?? SECTIONS[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Guide d'utilisation"
      onClick={onClose}
      className="symp-overlay-in"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(14,14,15,0.42)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
        fontFamily: fontStack,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="symp-dialog-in"
        style={{
          width: "min(980px, 100%)",
          height: "min(700px, 100%)",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-card)",
          borderRadius: 18,
          border: "1px solid var(--border)",
          boxShadow: "0 24px 70px rgba(14,14,15,0.28)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            {logo && (
              <img
                src={logo}
                alt=""
                draggable={false}
                style={{ height: 24, width: "auto", objectFit: "contain" }}
              />
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--ink)" }}>
                Guide d&apos;utilisation
              </div>
              <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                Chaque réglage expliqué, dans l&apos;ordre où vous le rencontrez
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer le guide"
            className="symp-press"
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              border: "1px solid var(--border-2)",
              background: "transparent",
              color: "var(--ink-2)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          {/* Index */}
          <nav
            className="no-scrollbar"
            style={{
              width: 216,
              flexShrink: 0,
              borderRight: "1px solid var(--border)",
              padding: 12,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            {SECTIONS.map((s, i) => {
              const on = s.id === active;
              return (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className="symp-press"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    textAlign: "left",
                    padding: "9px 11px",
                    borderRadius: 9,
                    border: "none",
                    background: on ? "var(--accent-tint)" : "transparent",
                    color: on ? "var(--accent)" : "var(--ink-2)",
                    fontSize: 13,
                    fontWeight: on ? 700 : 500,
                    cursor: "pointer",
                    fontFamily: fontStack,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      flexShrink: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      background: on ? "var(--accent)" : "var(--border-2)",
                      color: on ? "#fff" : "var(--ink-3)",
                    }}
                  >
                    {i + 1}
                  </span>
                  {s.title}
                </button>
              );
            })}
          </nav>

          {/* Content */}
          <div
            key={section.id}
            className="symp-rise"
            style={{ flex: 1, overflowY: "auto", padding: "22px 26px 28px", minWidth: 0 }}
          >
            <h2
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: "var(--ink)",
                letterSpacing: "-0.01em",
                margin: 0,
              }}
            >
              {section.title}
            </h2>
            {section.intro && (
              <p
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.6,
                  color: "var(--ink-2)",
                  margin: "10px 0 0",
                }}
              >
                {section.intro}
              </p>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 18 }}>
              {section.entries.map((e, i) => (
                <div
                  key={e.term}
                  className="symp-rise"
                  style={{
                    ["--symp-delay" as any]: `${i * 45}ms`,
                    padding: "13px 0",
                    borderTop: i === 0 ? "none" : "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: "var(--ink)",
                      marginBottom: 5,
                    }}
                  >
                    {e.term}
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.65, color: "var(--ink-2)" }}>
                    {e.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "11px 20px",
            borderTop: "1px solid var(--border)",
            fontSize: 11.5,
            color: "var(--ink-3)",
            flexShrink: 0,
          }}
        >
          Astuce : ce guide est accessible à tout moment par le bouton
          &nbsp;?&nbsp; en haut du panneau de gauche. Touche Échap pour fermer.
        </div>
      </div>
    </div>
  );
}
