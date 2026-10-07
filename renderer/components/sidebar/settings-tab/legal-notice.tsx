import React, { useState } from "react";
import { APP_VERSION } from "@common/app-version";

const card: React.CSSProperties = {
  border: "1px solid var(--symp-line, rgba(14,14,15,0.08))",
  borderRadius: 12,
  padding: "14px 16px",
  background: "var(--symp-panel, #fff)",
};

const h: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--symp-ink-3, #6F6F75)",
  marginBottom: 8,
};

const p: React.CSSProperties = {
  fontSize: 12.5,
  lineHeight: 1.65,
  color: "var(--symp-ink-2, #3A3A3D)",
};

const li: React.CSSProperties = { ...p, marginBottom: 4 };

/**
 * Legal / about page.
 *
 * Deliberately states the upstream project and the AI model plainly — the
 * AGPL requires it, and being straight about the base is what makes the
 * list of our own work credible rather than looking like a reskin.
 */
export default function LegalNotice() {
  const [open, setOpen] = useState<string | null>("about");

  const Section = ({
    id,
    title,
    children,
  }: {
    id: string;
    title: string;
    children: React.ReactNode;
  }) => {
    const isOpen = open === id;
    return (
      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <button
          onClick={() => setOpen(isOpen ? null : id)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "13px 16px",
            background: "transparent",
            border: 0,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--symp-ink, #0E0E0F)",
            }}
          >
            {title}
          </span>
          <span
            aria-hidden
            style={{
              display: "inline-flex",
              color: "var(--symp-ink-3, #6F6F75)",
              transform: isOpen ? "rotate(90deg)" : "none",
              transition: "transform 0.22s cubic-bezier(0.32,0.72,0,1)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </span>
        </button>
        <div
          style={{
            display: "grid",
            gridTemplateRows: isOpen ? "1fr" : "0fr",
            transition: "grid-template-rows 0.28s cubic-bezier(0.32,0.72,0,1)",
          }}
        >
          <div style={{ overflow: "hidden" }}>
            <div style={{ padding: "0 16px 15px" }}>{children}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <div style={h}>À propos &amp; mentions légales</div>
        <div style={{ fontSize: 19, fontWeight: 800, color: "var(--symp-ink, #0E0E0F)", letterSpacing: "-0.01em" }}>
          Symp&apos;s Upscale
        </div>
        <div style={{ fontSize: 12, color: "var(--symp-ink-3, #6F6F75)", marginTop: 2 }}>
          Version {APP_VERSION} — agrandissement d&apos;images par IA pour
          l&apos;impression grand format
        </div>
      </div>

      <Section id="about" title="Ce que développe Symp's">
        <p style={p}>
          Symp&apos;s Upscale est un logiciel conçu pour un besoin précis&nbsp;:
          préparer des fichiers destinés à l&apos;impression murale grand
          format. Les développements suivants sont réalisés par Symp&apos;s et
          n&apos;existent dans aucun autre outil d&apos;agrandissement&nbsp;:
        </p>
        <ul style={{ marginTop: 8, paddingLeft: 18, listStyle: "disc" }}>
          <li style={li}>
            <strong>Dimensionnement en centimètres</strong> — on saisit la
            largeur du mur et la résolution de sortie, le nombre de pixels
            nécessaire est calculé automatiquement.
          </li>
          <li style={li}>
            <strong>Agrandissement en passes chaînées</strong> — le modèle
            travaille plusieurs fois de suite pour atteindre exactement la
            taille demandée, au lieu d&apos;étirer l&apos;image.
          </li>
          <li style={li}>
            <strong>Résolution inscrite dans le fichier</strong> — le document
            s&apos;ouvre directement à sa taille physique réelle dans
            Photoshop et sur les RIP.
          </li>
          <li style={li}>
            <strong>Découpe en bandes</strong> — l&apos;image finale est
            automatiquement scindée en lés de pose numérotés, avec le
            recouvrement souhaité.
          </li>
          <li style={li}>
            <strong>Guide intégré</strong> — chaque réglage expliqué dans le
            vocabulaire de l&apos;atelier, accessible à tout moment.
          </li>
          <li style={li}>
            <strong>Garde-fous métier</strong> — alertes sur les traitements
            trop lourds, les agrandissements excessifs et les limites de
            format.
          </li>
          <li style={li}>
            <strong>Correction d&apos;orientation</strong> — les photos prises
            au smartphone ne ressortent plus pivotées.
          </li>
          <li style={li}>
            <strong>Interface entièrement repensée</strong> en français, pensée
            pour un atelier d&apos;impression.
          </li>
        </ul>
      </Section>

      <Section id="ai" title="Modèle d'intelligence artificielle">
        <p style={p}>
          L&apos;agrandissement s&apos;appuie sur des modèles de
          super-résolution open source, exécutés par le moteur{" "}
          <strong>ncnn</strong> de Tencent avec accélération Vulkan. Le modèle
          fourni&nbsp;:
        </p>
        <ul style={{ marginTop: 8, paddingLeft: 18, listStyle: "disc" }}>
          <li style={li}>
            <strong>Précision</strong> — <em>4xLSDIRCompactC3</em>, par{" "}
            <strong>Philip Hofmann</strong> (Phhofm), architecture SRVGGNet
            «&nbsp;Compact&nbsp;». Distribué sous licence{" "}
            <strong>Creative Commons Attribution 4.0 International (CC BY
            4.0)</strong>{" "}
            —{" "}
            <span style={{ wordBreak: "break-all" }}>
              creativecommons.org/licenses/by/4.0/
            </span>
            . Modèle d&apos;origine&nbsp;:{" "}
            <span style={{ wordBreak: "break-all" }}>
              github.com/Phhofm/models
            </span>
            . Modification apportée&nbsp;: conversion au format ncnn, réalisée
            par le projet Upscayl&nbsp;; Symp&apos;s le redistribue sans aucune
            modification supplémentaire. Fourni par son auteur en l&apos;état,
            sans garantie. Philip Hofmann n&apos;approuve ni ne cautionne
            Symp&apos;s Upscale, et aucune affiliation n&apos;est
            sous-entendue.
          </li>
        </ul>
        <p style={{ ...p, marginTop: 8 }}>
          Un seul modèle est fourni, et sa licence est documentée chez son
          auteur. Les deux modèles hérités du projet Upscayl ont été retirés en
          version 2.0 après mesure sur un banc d&apos;essai de 32 images. Leur
          provenance, longtemps incertaine, a depuis été établie par empreinte
          numérique&nbsp;: c&apos;étaient les modèles Real-ESRGAN officiels
          (licence BSD 3-Clause, © 2021 Xintao Wang), simplement renommés. Le
          détail figure dans le fichier NOTICE.
        </p>
        <p style={{ ...p, marginTop: 8 }}>
          Ces modèles sont pré-entraînés et utilisés tels quels&nbsp;; ils ne
          sont ni entraînés ni modifiés par Symp&apos;s, et sont distribués
          octet pour octet tels que publiés par le projet Upscayl (empreintes
          SHA-256 dans le fichier NOTICE). Tout le traitement s&apos;effectue{" "}
          <strong>localement</strong>, sur votre machine&nbsp;: aucune image
          n&apos;est transmise à un serveur.
        </p>
        <p style={{ ...p, marginTop: 8 }}>
          Si vous chargez vos propres modèles via l&apos;option «&nbsp;modèles
          personnalisés&nbsp;», ceux-ci ne sont pas fournis avec ce logiciel et
          restent soumis aux conditions fixées par leur auteur. Plusieurs
          modèles d&apos;agrandissement très répandus sont publiés sous licence{" "}
          <strong>CC BY-NC</strong>, qui <strong>interdit l&apos;usage
          commercial</strong>&nbsp;: préparer un fichier destiné à une
          impression facturée en relève. Vérifiez la licence avant de les
          employer dans un cadre professionnel.
        </p>
      </Section>

      <Section id="base" title="Base logicielle et licence">
        <p style={p}>
          Symp&apos;s Upscale est une version modifiée d&apos;
          <strong>Upscayl</strong>, projet libre distribué sous licence{" "}
          <strong>GNU AGPL-3.0</strong>. Conformément à cette licence, le
          présent logiciel est lui aussi distribué sous AGPL-3.0 et son code
          source est disponible publiquement.
        </p>
        <p style={{ ...p, marginTop: 8 }}>
          Le moteur d&apos;inférence (<strong>upscayl-ncnn</strong>) est lui
          aussi distribué sous AGPL-3.0 et embarqué sans modification. Le code
          source correspondant à cette version, ainsi que les scripts
          nécessaires à sa compilation, sont accessibles publiquement.
        </p>
        <p style={{ ...p, marginTop: 8 }}>
          Ce logiciel est fourni <strong>sans aucune garantie</strong>, pas même
          la garantie implicite de qualité marchande ou d&apos;adéquation à un
          usage particulier.
        </p>
        <p style={{ ...p, marginTop: 8 }}>
          Aucun lien officiel, partenariat ou approbation du projet Upscayl, ni
          d&apos;aucun des auteurs cités, n&apos;est sous-entendu. Le support
          Symp&apos;s ne s&apos;applique qu&apos;aux versions officielles
          Symp&apos;s.
        </p>
      </Section>

      <Section id="third" title="Composants tiers">
        <ul style={{ paddingLeft: 18, listStyle: "disc" }}>
          <li style={li}>
            <strong>4xLSDIRCompactC3</strong> — licence CC BY 4.0 — © Philip
            Hofmann
          </li>
          <li style={li}>
            <strong>ncnn</strong> — licence BSD 3-Clause — © 2017 THL A29
            Limited, Tencent
          </li>
          <li style={li}>
            <strong>Upscayl</strong> — licence GNU AGPL-3.0 — © Upscayl
            Contributors
          </li>
          <li style={li}>
            <strong>upscayl-ncnn</strong> (moteur d&apos;inférence) — licence
            GNU AGPL-3.0 — © Upscayl Contributors
          </li>
          <li style={li}>
            <strong>Tauri</strong>, <strong>React</strong>,{" "}
            <strong>Next.js</strong> — licences MIT / Apache-2.0
          </li>
        </ul>
        <p style={{ ...p, marginTop: 8, opacity: 0.85 }}>
          Le détail complet des licences figure dans les fichiers LICENSE et
          NOTICE fournis avec le logiciel.
        </p>
      </Section>
    </div>
  );
}
