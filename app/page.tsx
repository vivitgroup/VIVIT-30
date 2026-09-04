import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

const workspaces = [
  {
    key: "group",
    title: "VIVIT GROUP",
    titleLead: "VIVIT",
    titleAccent: "GROUP",
    tagline: <>A BRIGHTER<br />TOMORROW</>,
    backTitle: "One group. One operating view.",
    backCopy: "Executive control, consolidated decisions, and a live cross-company view.",
    href: "/group/enter/group",
    accent: "#1669a9",
    soft: "rgba(43, 126, 190, .22)",
  },
  {
    key: "hospitality",
    title: "VIVIT-HOSPITALITY",
    titleLead: "VIVIT-",
    titleAccent: "HOSPITALITY",
    tagline: <>YOU OWN<br />WE HANDLE</>,
    backTitle: "Hospitality, fully handled.",
    backCopy: "Properties, reservations, owners, operations, finance, and guest experience.",
    href: "/group/enter/hospitality",
    accent: "#b78837",
    soft: "rgba(214, 173, 98, .28)",
  },
  {
    key: "marketing",
    title: "VIVIT-MARKETING",
    titleLead: "VIVIT-",
    titleAccent: "MARKETING",
    tagline: <>IDEAS<br />THAT GROW</>,
    backTitle: "Ideas connected to growth.",
    backCopy: "Clients, campaigns, creative, media, performance, approvals, and finance.",
    href: "/login?workspace=marketing",
    accent: "#cf3742",
    soft: "rgba(216, 69, 76, .20)",
  },
  {
    key: "tech",
    title: "VIVIT-TECHNOLOGY",
    titleLead: "VIVIT-",
    titleAccent: "TECHNOLOGY",
    tagline: <>SOLUTIONS<br />THAT SCALE</>,
    backTitle: "Technology built to scale.",
    backCopy: "Projects, delivery, SaaS, subscriptions, support, billing, and product operations.",
    href: "/group/enter/tech",
    accent: "#2ca7dc",
    soft: "rgba(75, 184, 227, .23)",
  },
] as const;

export default function RootPage() {
  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.topBar}>
          <div className={styles.topLeft}>
            PEOPLE<br />IDEAS<br />IMPACT
          </div>
          <div className={styles.topRight}>
            <span className={styles.topRule} />
            <span>ONE GROUP<br />A BRIGHTER TOMORROW</span>
          </div>
        </header>

        <div className={styles.hero}>
          <div className={styles.logoWrap}>
            <Image
              src="/vivit-logo.png"
              alt="VIVIT Group"
              width={640}
              height={280}
              priority
              className={styles.logo}
            />
          </div>
          <p className={styles.tagline}>
            DIFFERENT EXPERTISE<br />A STRONGER TOMORROW
          </p>
          <div className={styles.heroRule} />
          <div className={styles.portalLabel}>CHOOSE YOUR PORTAL</div>
        </div>

        <div className={styles.grid}>
          {workspaces.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={styles.cardLink}
              aria-label={`Open ${item.title}`}
              style={{
                "--accent": item.accent,
                "--soft": item.soft,
              } as React.CSSProperties}
            >
              <div className={styles.cardInner}>
                <article className={`${styles.face} ${styles.front}`}>
                  <div className={styles.brandBlock}>
                    <div className={styles.mark} aria-hidden="true" />
                    <h2 className={styles.title}>
                      <span>{item.titleLead}</span>
                      <span className={styles.titleAccent}>{item.titleAccent}</span>
                    </h2>
                    <div className={styles.shortRule} />
                    <p className={styles.cardTagline}>{item.tagline}</p>
                  </div>

                  <div className={styles.actionWrap}>
                    <span className={styles.actionButton} aria-hidden="true">→</span>
                    <span className={styles.flipHint}>Hover to flip 180°</span>
                  </div>
                </article>

                <article className={`${styles.face} ${styles.back}`} aria-hidden="true">
                  <div className={styles.backContent}>
                    <div className={styles.backKicker}>{item.title}</div>
                    <h3 className={styles.backTitle}>{item.backTitle}</h3>
                    <p className={styles.backCopy}>{item.backCopy}</p>
                    <span className={styles.enterPill}>ENTER PORTAL <span>→</span></span>
                  </div>
                </article>
              </div>
            </Link>
          ))}
        </div>

        <footer className={styles.footer}>
          <div className={styles.socials} aria-label="VIVIT social channels">
            <span>in</span><span>◎</span><span>▶</span>
          </div>
          <div>© 2026 VIVIT GROUP. ALL RIGHTS RESERVED.</div>
        </footer>
      </section>
    </main>
  );
}
